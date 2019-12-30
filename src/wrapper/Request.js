import qs from 'querystring'
import url from 'url'

import { parseHost, stringifyHost } from '@/utils'

export default class Request {

  /**
   * @type {boolean}
   */
  rejectUnauthorized = false

  /**
   * @type {import('http').IncomingMessage}
   */
  raw

  /**
   * @type {string}
   */
  method

  /**
   * @type {boolean}
   */
  secure

  /**
   * @type {import('http').IncomingHttpHeaders}
   */
  headers

  /**
   * @type {string}
   */
  hostname

  /**
   * @type {number}
   */
  port

  /**
   * @type {string}
   */
  pathname

  /**
   * @type {string}
   */
  search

  /**
   * @param {import('http').IncomingMessage} raw
   */
  constructor(raw) {
    this.raw = raw

    this.method = raw.method.toUpperCase()
    this.secure = raw.socket.encrypted
    this.headers = { ...raw.headers }
    this.host = raw.headers['host'] || ''
    this.path = raw.url
  }

  get href() {
    return '//' + this.host + this.path
  }

  get host() {
    return stringifyHost(this.hostname, this.port, this.secure ? 443 : 80)
  }

  set host(value) {
    [this.hostname, this.port] = parseHost(value, this.secure ? 443 : 80)
  }

  get path() {
    return this.pathname + this.search
  }

  set path(value) {
    const path = url.parse(value)
    this.pathname = path.pathname || '/'
    this.search = path.search || ''
  }

  get query() {
    let search = this.search
    if (this.search[0] === '?') {
      search = search.slice(1)
    }
    return qs.parse(search)
  }

  set query(value) {
    this.search = qs.stringify(value)
  }
}
