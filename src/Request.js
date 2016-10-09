import url from 'url'
import http from 'http'
import https from 'https'
import isIPv6 from 'is-ipv6-node'
import waitFor from 'event-to-promise'
import { TLSSocket } from 'tls'

const numRegex = /^\d+$/

export default class Request {

  constructor(req, agent) {
    this.raw = this.body = req
    this.protocol = req.socket instanceof TLSSocket ? 'https:' : 'http:'
    this.host = req.headers.host
    this.agent = agent
  }

  set method(method) {
    this.raw.method = method
  }

  get method() {
    return this.raw.method
  }

  get secure() {
    return this.protocol === 'https:'
  }

  set secure(secure) {
    if (secure) {
      this.protocol = 'https:'
    } else {
      this.protocol = 'http:'
    }
  }

  get servername() {
    return parseHost(this.headers.host)[0]
  }

  set servername(servername) {
    const port = parseHost(this.headers.host)[1]
    if (isIPv6(servername)) {
      servername = `[${servername}]`
    }
    if (port) {
      this.headers.host = `${servername}:${port}`
    } else {
      this.headers.host = servername
    }
  }

  set hostname(hostname) {
    const port = this.port
    if (isIPv6(hostname)) {
      hostname = `[${hostname}]`
    }
    if (port) {
      this.host = `${hostname}:${port}`
    } else {
      this.host = hostname
    }
  }

  get hostname() {
    return parseHost(this.host)[0]
  }

  set port(port) {
    let hostname = this.hostname
    if (isIPv6(hostname)) {
      hostname = `[${hostname}]`
    }
    if (port) {
      this.host = `${hostname}:${port}`
    } else {
      this.host = hostname
    }
  }

  get port() {
    return parseHost(this.host)[1]
  }

  get url() {
    return url.parse(this.raw.url, true, true)
  }

  set path(path) {
    this.raw.url = path
  }

  get path() {
    return this.url.path
  }

  set pathname(pathname) {
    this.raw.url = url.format(Object.assign(this.url, { pathname }))
  }

  get pathname() {
    return this.url.pathname
  }

  set search(search) {
    this.raw.url = url.format(Object.assign(this.url, { search }))
  }

  get search() {
    return this.url.search
  }

  set query(query) {
    this.raw.url = url.format(Object.assign(this.url, { search: undefined, query }))
  }

  get query() {
    return this.url.query
  }

  set hash(hash) {
    this.raw.url = url.format(Object.assign(this.url, { hash }))
  }

  get hash() {
    return this.url.hash
  }

  set href(href) {
    const com = url.parse(href)
    if (com.protocol) {
      this.protocol = com.protocol
    }
    if (com.host) {
      this.host = com.host
    }
    if (com.path) {
      this.path = com.path
    }
    if (com.hash) {
      this.hash = com.hash
    }
  }

  get href() {
    return url.format(this)
  }

  set headers(headers) {
    this.raw.headers = headers
  }

  get headers() {
    return this.raw.headers
  }

  set auth(auth) {
    this.raw.auth = auth
  }

  get auth() {
    return this.raw.auth
  }

  setQuery(query) {
    this.query = Object.assign(this.query, query)
    return this
  }

  unsetQuery(key) {
    const query = this.query
    delete query[key]
    this.query = query
    return this
  }

  setHeaders(headers) {
    Object.assign(this.headers, headers)
  }

  unsetHeader(name) {
    delete this.raw.headers[name]
  }

  send() {
    const req = (this.secure ? https : http).request({
      hostname: this.hostname,
      port: this.port,
      servername: this.servername,
      method: this.method,
      path: this.path,
      headers: this.headers,
      auth: this.auth,
      agent: this.agent,
      rejectUnauthorized: this.rejectUnauthorized,
    })

    this.body.pipe(req)

    return waitFor(req, 'response')
  }
}

function parseHost(host) {
  const lastColonIndex = host.lastIndexOf(':')
  const maybePort = host.slice(lastColonIndex + 1)

  let hostname = host
  let port = null
  if (numRegex.test(maybePort)) {
    hostname = host.slice(0, lastColonIndex)
    port = maybePort
  }
  if (hostname[0] === '[') {
    hostname = hostname.slice(1, -1)
  }
  return [hostname, port]
}
