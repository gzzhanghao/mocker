import fs from 'fs'
import net from 'net'
import url from 'url'
import path from 'path'
import http from 'http'
import https from 'https'
import mkdirp from 'mkdirp'
import { Readable } from 'stream'
import tls, { TLSSocket } from 'tls'
import waitFor from 'event-to-promise'
import { cyan, green, red, yellow } from 'chalk'

import { log } from './utils'
import { generateRootCAKey, generateHostKey } from './keygen'

import RequestHandler from './RequestHandler'
import UpstreamManager from './UpstreamManager'

import HTTPRequest from './wrapper/HTTPRequest'
import UpgradeRequest from './wrapper/UpgradeRequest'

export default class MockerServer {

  options = null

  rootCAKey = null

  hostKeys = null

  netSvr = null

  tlsSvr = null

  requestHandler = null

  upstreamManager = null

  constructor(options) {
    this.options = options

    this.upstreamManager = new UpstreamManager(options)
    this.requestHandler = new RequestHandler(options)

    this.hostKeys = Object.create(null)
    this.rootCAKey = getRootCAKey(options)

    this.netSvr = http.createServer()
    this.tlsSvr = https.createServer({
      cert: this.rootCAKey.cert,
      key: this.rootCAKey.key,
      SNICallback: this.SNICallback.bind(this),
    })

    this.netSvr.on('connect', this.onConnect.bind(this))

    this.netSvr.on('upgrade', this.onUpgrade.bind(this))
    this.tlsSvr.on('upgrade', this.onUpgrade.bind(this))

    this.netSvr.on('request', this.onRequest.bind(this))
    this.tlsSvr.on('request', this.onRequest.bind(this))

    this.netSvr.on('listening', () => {
      log(green(`Server listening at ${this.netSvr.address().port}`))
    })

    this.netSvr.on('clientError', error => {
      log(red('Client error'), '\n', error)
    })

    this.tlsSvr.on('tlsClientError', error => {
      log(red('TLS client error'), '\n', error)
    })
  }

  SNICallback(servername, callback) {
    try {
      if (!this.hostKeys[servername]) {
        this.hostKeys[servername] = tls.createSecureContext(generateHostKey(this.rootCAKey, [servername]))
      }
      return callback(null, this.hostKeys[servername])
    } catch (error) {
      return callback(error)
    }
  }

  listen(port) {
    this.requestHandler.listen()
    this.tlsSvr.listen()
    this.netSvr.listen(port)
  }

  async onConnect(req, socket, head) {
    const reqURL = getURL(req)
    log(cyan('CONNECT'), reqURL)

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

      log(green('CONNECT'), reqURL)

    } catch (error) {

      log(red('CONNECT'), reqURL, '\n', error)
      socket.destroy()
    }
  }

  async onRequest(rawReq, rawRes) {
    const reqURL = getURL(rawReq)
    log(cyan(rawReq.method), reqURL)

    try {
      const req = new HTTPRequest(this.upstreamManager, rawReq)
      let res = await this.requestHandler.handleRequest(req)

      if (!res) {
        log(yellow(`${req.method}:pass`), reqURL)
        res = await req.send({ consume: true })
      }

      for (const transform of req.transformResponse) {
        res = (await transform(res)) || res
      }

      const statusCode = res.statusCode || res.status || 200

      log(green(`${req.method}:res`), reqURL)
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

      log(green(`${req.method}:${statusCode}`), reqURL)
    } catch (error) {
      log(red(rawReq.method), reqURL, '\n', error)

      if (rawRes.writable) {
        rawRes.writeHead(500)
        rawRes.end()
      }
    }
  }

  async onUpgrade(rawReq, socket, head) {
    const reqURL = getURL(rawReq)
    log(cyan('UPGRADE'), reqURL)

    try {
      const req = new UpgradeRequest(this.upstreamManager, rawReq, socket, head)

      await this.requestHandler.handleRequest(req)

      if (!req.accepted) {
        let remoteSocket = await this.upstreamManager.connect(req.port, req.hostname, req.href)
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
      }

      log(green('UPGRADE'), reqURL)
    } catch (error) {
      log(red('UPGRADE'), reqURL, '\n', error)
      socket.destroy()
    }
  }
}

function getRootCAKey(options) {
  const paths = {
    cert: options.cert,
    key: options.key,
  }
  try {
    return {
      cert: fs.readFileSync(paths.cert, 'utf-8'),
      key: fs.readFileSync(paths.key, 'utf-8'),
    }
  } catch (error) {
    // noop
  }
  const ca = generateRootCAKey()
  tryCall(() => mkdirp.sync(path.dirname(paths.cert)))
  tryCall(() => mkdirp.sync(path.dirname(paths.key)))
  tryCall(() => fs.writeFileSync(paths.cert, ca.cert, { mode: 0o600 }))
  tryCall(() => fs.writeFileSync(paths.key, ca.key, { mode: 0o600 }))
  return ca
}

function tryCall(cb) {
  try {
    cb()
  } catch (error) {
    // noop
  }
}

function getURL(req) {
  const parsedURL = url.parse(req.url)
  return url.format({
    protocol: req.socket.encrypted ? 'https:' : 'http:',
    host: req.headers.host,
    pathname: parsedURL.pathname,
    search: parsedURL.search,
  })
}
