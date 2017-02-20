#!/usr/bin/env node

import waitFor from 'event-to-promise'
import { connect } from 'net'
import { Readable } from 'stream'
import { TLSSocket } from 'tls'
import { parse, format } from 'url'
import { cyan, green, red } from 'chalk'
import { createServer as createHttpServer } from 'http'
import { createServer as createHttpsServer } from 'https'

import log from './logger'
import config from './config'
import Request from './Request'

import getCert from './cert'
import getRules from './rules'
import getUpstream from './upstream'

Promise.all([getCert(), getUpstream()]).then(([cert, upstream]) => {

  const netSvr = createHttpServer()
  const tlsSvr = createHttpsServer(cert)

  netSvr.on('connect', onConnect)

  netSvr.on('upgrade', onUpgrade)
  tlsSvr.on('upgrade', onUpgrade)

  netSvr.on('request', onRequest)
  tlsSvr.on('request', onRequest)

  tlsSvr.listen()

  netSvr.listen(config.port, () => {
    log(green(`Server listening at ${config.port}`))
  })

  tlsSvr.on('tlsClientError', error => {
    log(red('TLS client error'), '\n', error.stack)
  })

  process.on('uncaughtException', error => {
    log(red('Uncaught exception'), '\n', error.stack)
  })

  process.on('unhandledRejection', error => {
    log(red('Unhandled rejection'), '\n', error.stack)
  })

  let rules = getRules(newRules => rules = newRules)

  /**
   * On receive request on HTTP(s) server
   */
  async function onRequest(rawReq, rawRes) {
    const reqURL = getURL(rawReq)
    log(cyan(rawReq.method), reqURL)

    try {

      const req = new Request(rawReq, upstream.getAgent(rawReq))
      let res = null

      for (const { pattern, match, handle } of rules) {
        if (!(req.params = match(req))) {
          continue
        }
        res = handle
        while (typeof res === 'function') {
          res = await res(req)
        }
        if (res) {
          break
        }
      }

      log(green(`${req.method}:res`), reqURL)
      rawRes.writeHead(res.statusCode || 200, res.headers)

      if (res.body instanceof Readable) {
        res.body.pipe(rawRes)
        await waitFor(res.body, 'end')
      } else if (res instanceof Readable) {
        res.pipe(rawRes)
        await waitFor(res, 'end')
      } else {
        rawRes.end(res.body)
      }

      log(green(`${req.method}:${res.statusCode}`), reqURL)

    } catch (error) {

      log(red(rawReq.method), reqURL, '\n', error.stack)

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
    const reqURL = getURL(req)
    log(cyan('CONNECT'), reqURL)

    try {

      socket.write('HTTP/1.1 200 OK\r\n')
      if (req.headers['proxy-connection'] === 'keep-alive') {
        socket.write('Proxy-Connection: keep-alive\r\n')
        socket.write('Connection: keep-alive\r\n')
      }
      socket.write('\r\n')

      if (!head || !head.length) {
        head = await waitFor(socket, 'data')
      }

      let proxySvr = netSvr
      if (head[0] === 0x16 || head[0] === 0x80 || head[0] === 0x00) {
        proxySvr = tlsSvr
      }

      const proxySocket = connect(proxySvr.address().port)

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

      log(red('CONNECT'), reqURL, '\n', error.stack)
      socket.destroy()
    }
  }

  /**
   * On receive UPGRADE request on HTTP(s) server
   */
  async function onUpgrade(req, socket, head) {
    const reqURL = getURL(req)
    log(cyan('UPGRADE'), reqURL)

    try {

      const [hostname, parsedPort] = req.headers.host.split(':')
      const port = parsedPort || (req.socket instanceof TLSSocket ? 443 : 80)

      let remoteSocket = await upstream.connect(port, hostname, { href: reqURL, ua: req.headers['user-agent'] })
      if (req.socket instanceof TLSSocket) {
        remoteSocket = new TLSSocket(remoteSocket)
      }

      socket.once('error', () => remoteSocket.destroy())
      remoteSocket.once('error', () => socket.destroy())

      remoteSocket.pipe(socket)

      remoteSocket.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`)
      for (let i = 0, ii = req.rawHeaders.length; i < ii; i += 2) {
        remoteSocket.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`)
      }
      remoteSocket.write('\r\n')
      remoteSocket.write(head)

      socket.pipe(remoteSocket)

      log(green('UPGRADE'), reqURL)

    } catch (error) {

      log(red('UPGRADE'), reqURL, '\n', error.stack)
      socket.destroy()
    }
  }

  function getURL(req) {
    const parsedURL = parse(req.url)
    return format({
      protocol: req.socket instanceof TLSSocket ? 'https:' : 'http:',
      host: req.headers.host,
      pathname: parsedURL.pathname,
      search: parsedURL.search
    })
  }
})
