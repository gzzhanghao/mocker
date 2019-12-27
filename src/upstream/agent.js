import tls from 'tls'
import { Agent as HttpAgent } from 'http'
import { Agent as HttpsAgent } from 'https'

import { stringifyHost } from '../utils'

export class ConnectAgent extends HttpAgent {

  constructor(upstream) {
    super({ keepAlive: true })
    this.upstream = upstream
  }

  createConnection(options, callback) {
    const { hostname, port } = options
    const href = getHref(options)
    const ua = options.headers['user-agent']
    this.upstream.connect(port, hostname, href, ua).then(socket => {
      callback(null, socket)
    }, callback)
  }
}

export class SecureConnectAgent extends HttpsAgent {

  constructor(upstream) {
    super({ keepAlive: true })
    this.upstream = upstream
  }

  createConnection(options, callback) {
    const { hostname, port } = options
    const href = getHref(options, true)
    const ua = options.headers['user-agent']
    this.upstream.connect(port, hostname, href, ua).then(socket => {
      callback(null, tls.connect({
        socket,
        servername: options.servername || options.host,
        ...options,
      }))
    }, callback)
  }
}

function getHref(options, secure) {
  let href = secure ? 'https' : 'http'
  if ((options.headers['upgrade'] || '').toUpperCase() === 'WEBSOCKET') {
    href = secure ? 'wss' : 'ws'
  }
  href += '://'
  if (options.hostname) {
    href += stringifyHost(options.hostname, options.port, secure ? 443 : 80)
  } else {
    href += options.host
  }
  if (secure) {
    return `${href}/`
  }
  return `${href}${options.path || '/'}`
}
