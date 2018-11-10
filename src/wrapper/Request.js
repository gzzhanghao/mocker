import qs from 'querystring'
import net from 'net'
import url from 'url'

const IPV6_REGEX = /^(.*?)(:(\d*))?$/

export default class Request {

  rejectUnauthorized = false

  agent = null

  method = null

  secure = null

  hostname = null

  port = null

  pathname = null

  search = null

  headers = null

  constructor(req, upstream) {
    this.upstream = upstream
    this.raw = req

    this.method = req.method.toUpperCase()
    this.headers = req.headers
    this.secure = req.socket.encrypted
    this.host = req.headers['host'] || ''
    this.path = req.url
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
    const match = value.match(IPV6_REGEX)
    this.hostname = match[1]
    if (match[1][0] === '[') {
      this.hostname = match[1].slice(1, -1)
    }
    this.port = match[3] ? +match[3] : (this.secure ? 443 : 80)
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
