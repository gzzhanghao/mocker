import HTTPBody from './HTTPBody'

export default class HTTPResponse {

  /**
   * @type {import('http').IncomingMessage}
   */
  raw

  /**
   * @param {import('http').IncomingMessage} raw
   */
  constructor(raw) {
    this.raw = raw
    Object.assign(this, HTTPBody)
  }

  get statusCode() {
    return this.raw.statusCode
  }

  get headers() {
    return this.raw.headers
  }
}
