import http from 'http'
import https from 'https'
import net from 'net'
import waitFor from 'event-to-promise'

import HTTPBody from './HTTPBody'
import HTTPResponse from './HTTPResponse'
import Request from './Request'

/**
 * @typedef {import('@/upstream').default} Upstream
 * @typedef {import('./HTTPBody').StreamOptions} StreamOptions
 */

export default class HTTPRequest extends Request {

  /**
   * @type {(options?: StreamOptions) => import('stream').Readable}
   */
  stream

  /**
   * @type {(options?: StreamOptions) => Promise<Buffer>}
   */
  buffer

  /**
   * @type {(options?: StreamOptions) => Promise<string>}
   */
  text

  /**
   * @type {(options?: StreamOptions) => Promise<any>}
   */
  json

  /**
   * @private
   *
   * @type {Upstream}
   */
  upstream = null

  /**
   * @private
   *
   * @type {http.Agent | https.Agent}
   */
  agent = null

  /**
   * @private
   *
   * @type {Function[]}
   */
  transformResponse = []

  /**
   *
   * @param {Upstream} upstream
   * @param {http.IncomingMessage} raw
   */
  constructor(upstream, raw) {
    super(raw)
    this.upstream = upstream
    Object.assign(this, HTTPBody)
  }

  get href() {
    return this.protocol + super.href
  }

  get protocol() {
    return this.secure ? 'https:' : 'http:'
  }

  set protocol(value) {
    this.secure = value === 'https:'
  }

  /**
   * @param {{ consume?: boolean }} options
   */
  async send(options = {}) {
    const client = this.secure ? https : http

    let agent
    if (this.agent !== false) {
      agent = this.agent || (this.secure ? this.upstream.httpsAgent : this.upstream.httpAgent)
    }

    let servername
    if (net.isIP(this.hostname)) {
      servername = this.hostname
    }

    const req = client.request({
      agent,
      servername,
      hostname: this.hostname,
      port: this.port,
      method: this.method,
      path: this.path,
      headers: this.headers,
      rejectUnauthorized: this.rejectUnauthorized,
    })

    this.stream(options).pipe(req)

    return new HTTPResponse(await waitFor(req, 'response'))
  }
}
