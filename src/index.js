#!/usr/bin/env node

import tls from 'tls'
import url from 'url'
import net from 'net'
import path from 'path'
import http from 'http'
import https from 'https'
import fetch from 'node-fetch'

import { waitFor } from './utils'
import getCert from './cert/getCert'
import getUpstream from './upstream'
import getMockup from './mock/getMockup'
import { generateCA, generateHostKeys } from './cert/keygen'

process.on('uncaughtException', error => {
  console.log(error.stack || error.message || error)
})

process.on('unhandledRejection', error => {
  console.log(error.stack || error.message || error)
})

; (async () => {

  /**
   * Initialize proxy server
   */

  const config = require(path.join(process.cwd(), './mocker.config.js'))

  const mockup = getMockup(config.mockupPath)

  const ca = await getCert(config.keyPath, generateCA)
  const connectUpstream = await getUpstream(config.upstream)

  const tlsKeys = Object.create(null)

  const netSvr = http.createServer()
  const tlsSvr = https.createServer(Object.assign({ SNICallback }, ca))

  netSvr.on('connect', onConnect)
  netSvr.on('upgrade', onUpgrade)
  tlsSvr.on('upgrade', onUpgrade)

  netSvr.on('request', mockup)
  tlsSvr.on('request', mockup)

  netSvr.listen(config.port)
  tlsSvr.listen()

  /**
   * SNICallback for tlsSvr
   */
  function SNICallback(servername, callback) {
    if (tlsKeys[servername]) {
      return callback(null, tlsKeys[servername])
    }
    getCert(
      path.join(config.keyPath, servername),
      () => generateHostKeys(ca, [servername])
    ).then(
      cert => callback(null, tlsKeys[servername] = tls.createSecureContext(cert)),
      callback
    )
  }

  /**
   * On receive CONNECT request on HTTP server
   */
  async function onConnect(req, socket, head) {

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

    const proxySocket = net.connect(proxySvr.address().port)

    socket.once('error', error => {
      proxySocket.destroy()
    })

    proxySocket.once('error', error => {
      socket.destroy()
    })

    socket.pause()
    await waitFor(proxySocket, 'connect')
    socket.resume()

    proxySocket.pipe(socket)
    proxySocket.write(head)
    socket.pipe(proxySocket)
  }

  /**
   * On receive UPGRADE request on HTTP(s) server
   */
  async function onUpgrade(req, socket, head) {
    const parsedURL = url.parse(req.url)

    const opts = {
      protocol: req.socket instanceof tls.TLSSocket ? 'https:' : 'http:',
      hostname: parsedURL.hostname,
      port: parsedURL.port || 80,
      path: parsedURL.path,
      userAgent: req.headers['user-agent'],
    }

    if (req.url[0] === '/') {
      const [hostname, port] = req.headers.host.split(' ')
      opts.hostname = hostname
      opts.port = port || 443
      opts.path = req.url
    }

    let remoteSocket = await connectUpstream(opts)
    if (opts.protocol === 'https:') {
      remoteSocket = new tls.TLSSocket(remoteSocket)
    }

    socket.once('error', error => {
      socket.destroy()
    })

    remoteSocket.once('error', error => {
      remoteSocket.destroy()
    })

    remoteSocket.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`)
    for (let i = 0, ii = req.rawHeaders.length; i < ii; i += 2) {
      remoteSocket.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`)
    }
    remoteSocket.write('\r\n')

    remoteSocket.pipe(socket)
    remoteSocket.write(head)
    socket.pipe(remoteSocket)
  }

})()
