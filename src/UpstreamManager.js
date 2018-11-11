import tls from 'tls'
import fetch from 'node-fetch'
import { promisify } from 'es6-promisify'
import createPacResolver from 'pac-resolver'
import { Agent as HttpAgent } from 'http'
import { Agent as HttpsAgent } from 'https'

import pacSandbox from './upstream/sandbox'
import { createPACConnection } from './upstream/pac'
import { createTCPConnection } from './upstream/tcp'
import { createHTTPConnection } from './upstream/http'
import { createSocksConnection } from './upstream/socks'

export default class UpstreamManager {

  connect = null

  httpAgent = null

  httpsAgent = null

  constructor(options) {
    this.connect = getConnectMethod(options.upstream)
    this.httpAgent = new ConnectAgent(this)
    this.httpsAgent = new SecureConnectAgent(this)
  }
}

function getConnectMethod(upstream) {
  const [upstreamType, upstreamURL] = upstream.split(' ')

  switch (upstreamType.toLowerCase()) {
    case 'direct': {
      return createTCPConnection
    }
    case 'http': {
      return req => createHTTPConnection(req, upstreamURL)
    }
    case 'socks': {
      return req => createSocksConnection(req, upstreamURL)
    }
    case 'pac': {
      const pacRequest = fetch(upstreamURL)
        .then(res => res.text())
        .then(res => promisify(createPacResolver(res, { sandbox: pacSandbox })))
      return req => createPACConnection(req, pacRequest)
    }
    default: {
      throw new Error(`Unsupported upstream type ${upstreamType}`)
    }
  }
}

class ConnectAgent extends HttpAgent {

  constructor(upstreamManager) {
    super({ keepAlive: true })
    this.upstreamManager = upstreamManager
  }

  createConnection(options, callback) {
    this.upstreamManager.connect(options).then(socket => {
      callback(null, socket)
    }, callback)
  }
}

class SecureConnectAgent extends HttpsAgent {

  constructor(upstreamManager) {
    super({ keepAlive: true })
    this.upstreamManager = upstreamManager
  }

  createConnection(options, callback) {
    this.upstreamManager.connect(options).then(socket => {
      callback(null, tls.connect({
        socket,
        host: null,
        port: null,
        path: null,
        servername: options.servername || options.host,
      }))
    }, callback)
  }
}
