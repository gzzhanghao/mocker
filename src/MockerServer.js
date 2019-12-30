import http from 'http'
import https from 'https'
import net from 'net'
import { Readable } from 'stream'
import tls, { TLSSocket } from 'tls'
import url from 'url'
import chalk from 'chalk'
import waitFor from 'event-to-promise'

import { generateHostKey } from './keygen'
import { log } from './utils'
import HTTPRequest from './wrapper/HTTPRequest'
import UpgradeRequest from './wrapper/UpgradeRequest'

export default class MockerServer {

  /**
   * @typedef {import('@/router').default} Router
   * @typedef {import('@/upstream').default} Upstream
   * @typedef {{ key: string, cert: string }} RootCA
   */

  /**
   * @private
   *
   * @type {RootCA}
   */
  rootCA

  /**
   * @private
   *
   * @type {Router}
   */
  router

  /**
   * @private
   *
   * @type {Upstream}
   */
  upstream

  /**
   * @private
   *
   * @type {{ [key: string]: Promise<tls.SecureContext> | null }}
   */
  hostKeys

  /**
   * @private
   *
   * @type {http.Server}
   */
  netSvr

  /**
   * @private
   *
   * @type {https.Server}
   */
  tlsSvr

  /**
   * @param {{ upstream: Upstream, router: Router, rootCA: RootCA }} options
   */
  constructor(options) {
    this.upstream = options.upstream
    this.router = options.router

    this.hostKeys = Object.create(null)
    this.rootCA = options.rootCA

    this.netSvr = http.createServer()
    this.tlsSvr = https.createServer({
      cert: this.rootCA.cert,
      key: this.rootCA.key,
      SNICallback: this.SNICallback.bind(this),
    })

    this.netSvr.on('connect', this.onConnect.bind(this))

    this.netSvr.on('upgrade', this.onUpgrade.bind(this))
    this.tlsSvr.on('upgrade', this.onUpgrade.bind(this))

    this.netSvr.on('request', this.onRequest.bind(this))
    this.tlsSvr.on('request', this.onRequest.bind(this))

    this.netSvr.on('listening', () => {
      log(chalk.green(`Server listening at ${this.netSvr.address().port}`))
    })

    this.netSvr.on('clientError', error => {
      log(chalk.red('Client error'), '\n', error)
    })

    this.tlsSvr.on('tlsClientError', error => {
      log(chalk.red('TLS client error'), '\n', error)
    })
  }

  /**
   * @param {number} port
   */
  listen(port) {
    this.tlsSvr.listen()
    this.netSvr.listen(port)
  }

  /**
   * @private
   *
   * @param {string} servername
   * @param {Function} callback
   */
  SNICallback(servername, callback) {
    if (!this.hostKeys[servername]) {
      this.hostKeys[servername] = generateHostKey(this.rootCA, [servername])
        .then(res => {
          return tls.createSecureContext(res)
        })
        .catch(error => {
          this.hostKeys[servername] = null
          throw error
        })
    }
    this.hostKeys[servername].then(res => {
      callback(null, res)
    }, callback)
  }

  /**
   * @private
   *
   * @param {http.IncomingMessage} req
   * @param {net.Socket} socket
   * @param {Buffer} head
   */
  async onConnect(req, socket, head) {
    const reqURL = req.url
    log(chalk.cyan('CONNECT'), reqURL)

    try {
      socket.write(`HTTP/1.1 200 OK\r\n\r\n`)

      if (!head || !head.length) {
        head = await waitFor(socket, 'data')
      }

      let proxySvr = this.netSvr
      if (head[0] === 0x16 || head[0] === 0x80 || head[0] === 0x00) {
        proxySvr = this.tlsSvr
      }

      const proxySocket = net.connect(proxySvr.address().port)

      socket.once('error', () => proxySocket.destroy())
      proxySocket.once('error', () => socket.destroy())

      socket.pause()

      await waitFor(proxySocket, 'connect')

      socket.resume()

      proxySocket.pipe(socket)
      proxySocket.write(head)
      socket.pipe(proxySocket)

      log(chalk.green('CONNECT'), reqURL)

    } catch (error) {

      log(chalk.red('CONNECT'), reqURL, '\n', error)
      socket.destroy()
    }
  }

  /**
   * @private
   *
   * @param {http.IncomingMessage} rawReq
   * @param {http.ServerResponse} rawRes
   */
  async onRequest(rawReq, rawRes) {
    const reqURL = getURL(rawReq)
    log(chalk.cyan(rawReq.method), reqURL)

    try {
      const req = new HTTPRequest(this.upstream, rawReq)
      let res = await this.router.handleRequest(req)

      if (!res) {
        log(chalk.yellow(`${req.method}:pass`), reqURL)
        res = await req.send({ consume: true })
      }

      for (const transform of req.transformResponse) {
        res = (await transform(res)) || res
      }

      const statusCode = res.statusCode || res.status || 200

      log(chalk.green(`${req.method}:res`), reqURL)
      rawRes.writeHead(statusCode, res.headers)

      let stream = null
      if (typeof res.stream === 'function') {
        stream = res.stream()
      } else if (res.body instanceof Readable) {
        stream = res.body
      } else if (res instanceof Readable) {
        stream = res
      }

      if (!stream) {
        rawRes.end(res.body)
      } else if (!stream.readable) {
        rawRes.end()
      } else {
        stream.pipe(rawRes)
        await waitFor(stream, 'end')
      }

      log(chalk.green(`${req.method}:${statusCode}`), reqURL)
    } catch (error) {
      log(chalk.red(rawReq.method), reqURL, '\n', error)

      if (rawRes.writable) {
        rawRes.writeHead(500)
        rawRes.end()
      }
    }
  }

  /**
   * @private
   *
   * @param {http.IncomingMessage} rawReq
   * @param {net.Socket} socket
   * @param {Buffer} head
   */
  async onUpgrade(rawReq, socket, head) {
    const reqURL = getURL(rawReq)
    log(chalk.cyan('UPGRADE'), reqURL)

    try {
      const req = new UpgradeRequest(rawReq, socket, head)

      await this.router.handleRequest(req)

      if (req.accepted) {
        log(chalk.blue('UPGRADE'), reqURL)
        return
      }

      let remoteSocket = await this.upstream.connect({
        port: req.port,
        hostname: req.hostname,
        href: req.href,
        headers: {
          'user-agent': req.headers['user-agent'],
        },
      })

      if (req.secure) {
        remoteSocket = new TLSSocket(remoteSocket)
      }

      socket.once('error', () => remoteSocket.destroy())
      remoteSocket.once('error', () => socket.destroy())

      remoteSocket.pipe(socket)

      remoteSocket.write(`${rawReq.method} ${rawReq.url} HTTP/${rawReq.httpVersion}\r\n`)
      for (let i = 0, ii = rawReq.rawHeaders.length; i < ii; i += 2) {
        remoteSocket.write(`${rawReq.rawHeaders[i]}: ${rawReq.rawHeaders[i + 1]}\r\n`)
      }
      remoteSocket.write('\r\n')
      remoteSocket.write(head)

      socket.pipe(remoteSocket)

      log(chalk.green('UPGRADE'), reqURL)
    } catch (error) {
      log(chalk.red('UPGRADE'), reqURL, '\n', error)
      socket.destroy()
    }
  }
}

/**
 * @param {http.IncomingMessage} req
 */
function getURL(req) {
  const parsedURL = url.parse(req.url)
  return url.format({
    protocol: req.socket.encrypted ? 'https:' : 'http:',
    host: parsedURL.host || req.headers.host,
    pathname: parsedURL.pathname,
    search: parsedURL.search,
  })
}
