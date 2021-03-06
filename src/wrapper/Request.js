import qs from 'querystring'
import url from 'url'

import { parseHost, stringifyHost } from '../utils'

export default class Request {

  upstream = null

  raw = null

  rejectUnauthorized = false

  agent = null

  method = null

  secure = null

  hostname = null

  port = null

  pathname = null

  search = null

  headers = null

  constructor(upstream, req) {
    this.upstream = upstream
    this.raw = req

    this.method = req.method.toUpperCase()
    this.headers = { ...req.headers }
    this.secure = req.socket.encrypted
    this.host = req.headers['host'] || ''
    this.path = req.url
  }

  get href() {
    return '//' + this.host + this.path
  }

  get host() {
    return stringifyHost(this.hostname, this.port, this.secure ? 443 : 80)
  }

  set host(value) {
    const defaultPort = this.secure ? 443 : 80
    const [hostname, port] = parseHost(value, defaultPort)
    this.hostname = hostname
    if (port === defaultPort) {
      this.port = null
    } else {
      this.port = port
    }
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
