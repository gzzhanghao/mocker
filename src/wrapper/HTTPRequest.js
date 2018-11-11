import net from 'net'
import http from 'http'
import https from 'https'
import waitFor from 'event-to-promise'

import Request from './Request'
import HTTPBody from './HTTPBody'
import HTTPResponse from './HTTPResponse'

export default class HTTPRequest extends Request {

  transformResponse = []

  constructor(upstream, req) {
    super(upstream, req)
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
