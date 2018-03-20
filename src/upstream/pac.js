import url from 'url'

import netConnect from './net'
import httpConnect from './http'
import socksConnect from './socks'

export default async (req, getProxy) => {
  for (const proxy of (await getProxy(req.href, req.hostname)).split(';')) {
    const [proxyType, proxyHost] = proxy.trim().split(' ')
    const type = proxyType.toLowerCase()

    switch (type) {

      case 'direct': {
        return netConnect(req)
      }

      case 'https':
      case 'proxy': {
        const proxyProtocol = type === 'https' ? 'https' : 'http'
        return httpConnect(req, url.format({ protocol: proxyProtocol, host: proxyHost }))
      }

      case 'socks':
      case 'socks5': {
        return socksConnect(req, url.format({ protocol: type, host: proxyHost }))
      }
    }
  }
}
