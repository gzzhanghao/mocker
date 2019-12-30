import url from 'url'
import util from 'util'
import fetch from 'node-fetch'
import createPacResolver from 'pac-resolver'

import { ConnectAgent, SecureConnectAgent } from './agent'
import UPSTREAM_MAP from './connect'
import pacSandbox from './sandbox'


export default class Upstream {

  /**
   * @private
   *
   * @typedef {{ type: 'direct' }} DirectUpstream
   * @typedef {{ type: 'pac', content: string }} PacUpstream
   * @typedef {{ type: string, host: string }} ConnectUpstream
   *
   * @typedef {DirectUpstream | PacUpstream | ConnectUpstream} UpstreamType
   *
   * @type {UpstreamType}
   */
  upstream

  /**
   * @type {ConnectAgent}
   */
  httpAgent

  /**
   * @type {SecureConnectAgent}
   */
  httpsAgent

  /**
   * @private
   *
   * @type {Function}
   */
  pacResolve

  /**
   * @private
   *
   * @param {UpstreamType} upstream
   */
  constructor(upstream) {
    this.upstream = upstream

    this.httpAgent = new ConnectAgent(this)
    this.httpsAgent = new SecureConnectAgent(this)

    if (upstream.type === 'pac') {
      this.pacResolve = util.promisify(createPacResolver(upstream.content, { sandbox: pacSandbox }))
    }
  }

  /**
   * @param {{ href: string, hostname: string, port: number, headers: any }} options
   *
   * @returns {Promise<import('net').Socket>}
   */
  async connect(options) {
    for (const upstream of await this.resolveUpstream(options.href, options.hostname)) {
      try {
        return await UPSTREAM_MAP[upstream.type].connect(options, upstream)
      } catch (error) {
        // noop
      }
    }
    throw new Error('Failed to establish connection')
  }

  /**
   * @private
   *
   * @param {string} href
   * @param {string} hostname
   *
   * @returns {Promise<Array<DirectUpstream | ConnectUpstream>>}
   */
  async resolveUpstream(href, hostname) {
    if (this.upstream.type !== 'pac') {
      return [this.upstream]
    }
    const proxies = await this.pacResolve(href, hostname)
    return proxies.split(';').map(proxy => {
      const [type, host] = proxy.trim().split(/\s+/)
      return { type: type.toLowerCase(), host }
    })
  }

  /**
   * @param {string} upstreamURL
   */
  static async create(upstreamURL) {
    if (upstreamURL.toLowerCase() === 'direct') {
      return new Upstream({ type: 'direct' })
    }
    const upstream = url.parse(upstreamURL)
    const protocol = upstream.protocol.toLowerCase().replace(/:$/, '')
    if (UPSTREAM_MAP[protocol]) {
      return new Upstream({ type: protocol, host: upstream.host })
    }
    if (!protocol.startsWith('pac+')) {
      throw new Error('Unknown upstream type')
    }
    return new Upstream({
      type: 'pac',
      content: await fetch(upstreamURL.slice(4)).then(res => res.text()),
    })
  }
}
