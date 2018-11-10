import net from 'net'
import http from 'http'
import https from 'https'
import waitFor from 'event-to-promise'

import Request from './Request'
import HTTPBody from './HTTPBody'
import HTTPResponse from './HTTPResponse'

export default class HTTPRequest extends Request {

  constructor(req, upstream) {
    super(req, upstream)
    Object.assign(this, HTTPBody)
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
