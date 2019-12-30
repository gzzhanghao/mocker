import { Agent as HttpAgent } from 'http'
import { Agent as HttpsAgent } from 'https'
import tls from 'tls'

import { stringifyHost } from '@/utils'

/**
 * @typedef {import('http').RequestOptions} RequestOptions
 * @typedef {import('@/upstream').default} Upstream
 */

export class ConnectAgent extends HttpAgent {

  /**
   * @type {Upstream}
   */
  upstream

  /**
   * @param {Upstream} upstream
   */
  constructor(upstream) {
    super({ keepAlive: true })
    this.upstream = upstream
  }

  /**
   * @param {RequestOptions} options
   * @param {Function} callback
   */
  createConnection(options, callback) {
    connectUpstream(this.upstream, options).then(socket => {
      callback(null, socket)
    }, callback)
  }
}

export class SecureConnectAgent extends HttpsAgent {

  /**
   * @type {Upstream}
   */
  upstream

  /**
   * @param {Upstream} upstream
   */
  constructor(upstream) {
    super({ keepAlive: true })
    this.upstream = upstream
  }

  /**
   * @param {RequestOptions} options
   * @param {Function} callback
   */
  createConnection(options, callback) {
    connectUpstream(this.upstream, options, true).then(socket => {
      callback(null, tls.connect({
        socket,
        servername: options.servername || options.host,
        ...options,
      }))
    }, callback)
  }
}

/**
 *
 * @param {import('@/upstream').default} upstream
 * @param {RequestOptions} options
 * @param {boolean} secure
 */
function connectUpstream(upstream, options, secure = false) {
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
    href = `${href}/`
  } else {
    href = `${href}${options.path || '/'}`
  }
  return upstream.connect({
    port: options.port,
    hostname: options.hostname,
    href,
    headers: {
      'user-agent': options.headers['user-agent'],
    },
  })
}
