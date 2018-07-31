import url from 'url'

import netConnect from './net'
import httpConnect from './http'
import socksConnect from './socks'

export default async (req, getProxy) => {
  const proxies = await getProxy(req.href, req.hostname)

  for (const proxy of proxies.split(';')) {
    const [proxyType, proxyHost] = proxy.trim().split(' ')
    const type = proxyType.toLowerCase()

    try {
      switch (type) {
        case 'direct': {
          return await netConnect(req)
        }
        case 'https':
        case 'proxy': {
          const proxyProtocol = type === 'https' ? 'https' : 'http'
          return await httpConnect(req, url.format({ protocol: proxyProtocol, host: proxyHost }))
        }
        case 'socks':
        case 'socks5': {
          return await socksConnect(req, url.format({ protocol: type, host: proxyHost }))
        }
      }
    } catch (error) {
      // noop
    }
  }

  throw new Error('Failed to establish connection')
}
