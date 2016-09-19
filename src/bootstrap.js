import tls from 'tls'
import url from 'url'
import net from 'net'
import path from 'path'
import http from 'http'
import https from 'https'
import stream from 'stream'
import waitFor from 'event-to-promise'

import logger from './logger'
import Request from './Request'

import getCert from './cert'
import getMockup from './mockup'
import getUpstream from './upstream'

/**
 * Initialize proxy server
 */
export default async function(config) {

  process.on('uncaughtException', error => {
    logger.fatal(logger.red('uncaught exception'), '\n', error.stack)
  })

  process.on('unhandledRejection', error => {
    logger.fatal(logger.red('unhandled rejection'), '\n', error.stack)
  })

  const netSvr = http.createServer()
  const tlsSvr = https.createServer(await getCert(path.resolve(config.keyPath)))

  const upstream = await getUpstream(config.upstream)

  let rules = null
  getMockup(path.resolve(config.mockupPath), newRules => {
    rules = newRules
  })

  netSvr.on('connect', onConnect)

  netSvr.on('upgrade', onUpgrade)
  tlsSvr.on('upgrade', onUpgrade)

  netSvr.on('request', onRequest)
  tlsSvr.on('request', onRequest)

  netSvr.listen(config.port, () => {
    logger.info('HTTP server listening at', config.port)
  })

  tlsSvr.listen(() => {
    logger.info('HTTPS server listening at', tlsSvr.address().port)
  })

  tlsSvr.on('tlsClientError', error => {
    logger.error('TLS client error', '\n', error.stack)
  })

  /**
   * On receive request on HTTP(s) server
   */
  async function onRequest(rawReq, rawRes) {
    const startTime = Date.now()
    const reqURL = getURL(rawReq)

    try {

      logger.info(logger.cyan(rawReq.method), reqURL)

      const req = new Request(rawReq, upstream.getAgent(rawReq))
      const res = { statusCode: 200, headers: {}, body: '' }

      for (const { pattern, match, handle } of rules) {
        req.params = match(req)
        if (req.params) {
          logger.debug(logger.yellow(`${req.method}:${pattern}`), reqURL)
          if (await Promise.resolve(handle(req, res)) === false) {
            break
          }
        }
      }

      logger.info(logger.green(`${req.method}:responding`), reqURL, logger.green(`[${Date.now() - startTime}ms]`))
      rawRes.writeHead(res.statusCode, res.headers)

      if (res.body instanceof stream.Readable) {
        res.body.pipe(rawRes)
        await waitFor(res.body, 'end')
      } else {
        rawRes.end(res.body)
      }

      logger.info(logger.green(`${req.method}:${res.statusCode}`), reqURL, logger.green(`[${Date.now() - startTime}ms]`))

    } catch (error) {

      logger.error(logger.red(rawReq.method), reqURL, logger.red(`[${Date.now() - startTime}ms]`), '\n', error.stack)

      if (rawRes.writable) {
        rawRes.writeHead(500)
        rawRes.end()
      }
    }
  }

  /**
   * On receive CONNECT request on HTTP server
   */
  async function onConnect(req, socket, head) {
    const startTime = Date.now()
    const reqURL = getURL(req)

    try {

      logger.info(logger.cyan(req.method), reqURL)

      socket.write('HTTP/1.1 200 OK\r\n')
      if (req.headers['proxy-connection'] === 'keep-alive') {
        socket.write('Proxy-Connection: keep-alive\r\n')
        socket.write('Connection: keep-alive\r\n')
      }
      socket.write('\r\n')

      socket.once('error', error => {
        logger.error(logger.red(`${req.method}:socket`), reqURL, '\n', error.stack)
      })

      if (!head || !head.length) {
        head = await waitFor(socket, 'data')
      }

      let proxySvr = netSvr
      if (head[0] === 0x16 || head[0] === 0x80 || head[0] === 0x00) {
        proxySvr = tlsSvr
      }

      const proxySocket = net.connect(proxySvr.address().port)

      socket.once('error', error => {
        proxySocket.destroy()
      })

      proxySocket.once('error', error => {
        logger.error(logger.red(`${req.method}:remote`), reqURL, '\n', error.stack)
        socket.destroy()
      })

      socket.pause()

      await waitFor(proxySocket, 'connect')

      socket.resume()

      proxySocket.pipe(socket)
      proxySocket.write(head)
      socket.pipe(proxySocket)

      logger.info(logger.green(req.method), reqURL, logger.green(`[${Date.now() - startTime}ms]`))

    } catch (error) {

      logger.error(logger.red(req.method), reqURL, logger.red(`[${Date.now() - startTime}ms]`), '\n', error.stack)
      socket.destroy()
    }
  }

  /**
   * On receive UPGRADE request on HTTP(s) server
   */
  async function onUpgrade(req, socket, head) {
    const startTime = Date.now()
    const reqURL = getURL(req)

    try {

      logger.info(logger.cyan(req.method), reqURL)

      let hostname = null
      let port = null

      if (req.url[0] === '/') {

        const [parsedHostname, parsedPort] = req.headers.host.split(' ')
        hostname = parsedHostname
        port = parsedPort || 443

      } else {

        const parsedURL = url.parse(req.url)
        hostname = parsedURL.hostname
        port = parsedURL.port || 80

      }

      socket.once('error',  error => {
        logger.error(logger.red(`${req.method}:socket`), reqURL, '\n', error.stack)
      })

      let remoteSocket = await upstream.connect(port, hostname, { ua: req.headers['user-agent'] })
      if (req.socket instanceof tls.TLSSocket) {
        remoteSocket = new tls.TLSSocket(remoteSocket)
      }

      socket.once('error', error => {
        remoteSocket.destroy()
      })

      remoteSocket.once('error', error => {
        logger.error(logger.red(`${req.method}:remote`), reqURL, '\n', error.stack)
        socket.destroy()
      })

      remoteSocket.pipe(socket)

      remoteSocket.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`)
      for (let i = 0, ii = req.rawHeaders.length; i < ii; i += 2) {
        remoteSocket.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`)
      }
      remoteSocket.write('\r\n')
      remoteSocket.write(head)

      socket.pipe(remoteSocket)

      logger.info(logger.green(req.method), reqURL, logger.green(`[${Date.now() - startTime}ms]`))

    } catch (error) {

      logger.error(logger.red(req.method), reqURL, logger.red(`[${Date.now() - startTime}ms]`), '\n', error.stack)
      socket.destroy()
    }
  }
}

function getURL(req) {
  const parsedURL = url.parse(req.url)
  return url.format({
    protocol: req.socket instanceof tls.TLSSocket ? 'https:' : 'http:',
    host: req.headers.host,
    pathname: parsedURL.pathname,
    search: parsedURL.search
  })
}
