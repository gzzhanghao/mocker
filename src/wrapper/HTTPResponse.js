import HTTPBody from './HTTPBody'

export default class HTTPResponse {

  constructor(res) {
    this.raw = res
    Object.assign(this, HTTPBody)
  }

  get statusCode() {
    return this.raw.statusCode
  }

  get headers() {
    return this.raw.headers
  }
}
