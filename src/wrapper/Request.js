import qs from 'querystring'
import net from 'net'
import url from 'url'
import { parseHost } from '../utils'

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
    const defaultPort = this.secure ? 443 : 80
    let hostname = this.hostname
    if (net.isIPv6(hostname)) {
      hostname = `[${hostname}]`
    }
    if (this.port === defaultPort) {
      return hostname
    }
    return `${hostname}:${this.port}`
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
