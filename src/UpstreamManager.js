import UPSTREAM_MAP from './upstream/connect'
import getUpstreamResolver from './upstream/resolver'
import { ConnectAgent, SecureConnectAgent } from './upstream/agent'

export default class UpstreamManager {

  resolveProxies = null

  httpAgent = null

  httpsAgent = null

  constructor(options) {
    this.resolveProxies = getUpstreamResolver(options.upstream)
    this.httpAgent = new ConnectAgent(this)
    this.httpsAgent = new SecureConnectAgent(this)
  }

  async connect(port, hostname, href, ua) {
    for (const upstream of await this.resolveProxies(href, hostname)) {
      try {
        return await UPSTREAM_MAP[upstream.type].connect(port, hostname, upstream, ua)
      } catch (error) {
        // noop
      }
    }
    throw new Error('Failed to establish connection')
  }
}
