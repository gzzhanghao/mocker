import url from 'url'
import fetch from 'node-fetch'
import { promisify } from 'util'
import createPacResolver from 'pac-resolver'

import pacSandbox from './sandbox'
import UPSTREAM_MAP from './connect'

export default function getUpstreamResolver(upstreamURL) {
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

