import tls from 'tls'
import url from 'url'
import fetch from 'node-fetch'
import { promisify } from 'es6-promisify'
import createPacResolver from 'pac-resolver'
import { Agent as HttpAgent } from 'http'
import { Agent as HttpsAgent } from 'https'

import pacSandbox from './upstream/sandbox'
import * as tcpUpstream from './upstream/tcp'
import * as httpUpstream from './upstream/http'
import * as socksUpstream from './upstream/socks'

import { stringifyHost } from './utils'

const UPSTREAM_MAP = {
  direct: tcpUpstream,
  http: httpUpstream,
  https: httpUpstream,
  proxy: httpUpstream,
  socks: socksUpstream,
  socks4: socksUpstream,
  socks4a: socksUpstream,
  socks5: socksUpstream,
}

export default class UpstreamManager {

  resolveProxies = null

  httpAgent = null

  httpsAgent = null

  constructor(options) {
    this.resolveProxies = getUpstreamResolver(options.upstream)
    this.httpAgent = new ConnectAgent(this)
    this.httpsAgent = new SecureConnectAgent(this)
  }

  async connect(port, hostname, href) {
    for (const upstream of await this.resolveProxies(href, hostname)) {
      try {
        return await UPSTREAM_MAP[upstream.type].connect(port, hostname, upstream)
      } catch (error) {
        // noop
      }
    }
    throw new Error('Failed to establish connection')
  }
}

function getUpstreamResolver(upstreamURL) {
  if (upstreamURL.toLowerCase() === 'direct') {
    return () => [{ type: 'direct' }]
  }

  const upstream = url.parse(upstreamURL)
  const protocol = upstream.protocol.toLowerCase().replace(/:$/, '')

  if (UPSTREAM_MAP[protocol]) {
    return () => [{ type: protocol, host: upstream.host }]
  }

  if (!protocol.startsWith('pac+')) {
    throw new Error('Unknown upstream type')
  }

  const pacRequest = fetch(upstreamURL.slice(4))
    .then(res => res.text())
    .then(res => promisify(createPacResolver(res, { sandbox: pacSandbox })))

  return async (href, hostname) => {
    const getProxies = await pacRequest
    const proxies = await getProxies(href, hostname)

    return proxies.split(';').map(proxy => {
      const [type, host] = proxy.trim().split(/\s+/)
      return { type: type.toLowerCase(), host }
    })
  }
}

class ConnectAgent extends HttpAgent {

  constructor(upstream) {
    super({ keepAlive: true })
    this.upstream = upstream
  }

  createConnection(options, callback) {
    const { hostname, port } = options
    const href = getHref(options)
    this.upstream.connect(port, hostname, href).then(socket => {
      callback(null, socket)
    }, callback)
  }
}

class SecureConnectAgent extends HttpsAgent {

  constructor(upstream) {
    super({ keepAlive: true })
    this.upstream = upstream
  }

  createConnection(options, callback) {
    const { hostname, port } = options
    const href = getHref(options, true)
    this.upstream.connect(port, hostname, href).then(socket => {
      callback(null, tls.connect({
        socket,
        servername: options.servername || options.host,
      }))
    }, callback)
  }
}

function getHref(options, secure) {
  let href = secure ? 'https' : 'http'
  if ((options.headers['upgrade'] || '').toUpperCase() === 'WEBSOCKET') {
    href = secure ? 'wss' : 'ws'
  }
  href += '://'
  if (options.hostname) {
    href += stringifyHost(options.hostname, options.port, secure ? 443 : 80)
  } else {
    href += options.host
  }
  if (secure) {
    return `${href}/`
  }
  return `${href}${options.path || '/'}`
}
