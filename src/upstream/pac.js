import url from 'url'

import createTCPConnection from './tcp'
import createHTTPConnection from './http'
import createSocksConnect from './socks'

export async function createPACConnection(req, pacRequest) {
  const getProxy = await pacRequest
  const proxies = await getProxy(req.href, req.hostname)

  for (const proxy of proxies.split(';')) {
    const [proxyType, proxyHost] = proxy.trim().split(/\s+/)
    const type = proxyType.toLowerCase()

    try {
      switch (type) {
        case 'direct': {
          return await createTCPConnection(req)
        }
        case 'https':
        case 'proxy': {
          const proxyProtocol = type === 'https' ? 'https' : 'http'
          return await createHTTPConnection(req, url.format({ protocol: proxyProtocol, host: proxyHost }))
        }
        case 'socks':
        case 'socks5': {
          return await createSocksConnect(req, url.format({ protocol: type, host: proxyHost }))
        }
      }
    } catch (error) {
      // noop
    }
  }

  throw new Error('Failed to establish connection')
}
