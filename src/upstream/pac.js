import netConnect from './net'
import httpConnect from './http'
import socksConnect from './socks'

export default async (port, hostname, getProxy, opts) => {
  for (const proxy of (await getProxy(opts.href, hostname)).split(';')) {
    const [proxyType, proxyHost] = proxy.trim().split(' ')

    switch (proxyType.toLowerCase()) {

      case 'direct':
        return netConnect(port, hostname)

      case 'https':
      case 'proxy': {
        const proxyProtocol = proxyType.toLowerCase() === 'http' ? 'https' : 'http'
        return httpConnect(port, hostname, `${proxyProtocol}://${proxyHost}`, opts)
      }

      case 'socks':
      case 'socks5': {
        const proxyProtocol = proxyType.toLowerCase()
        return socksConnect(port, hostname, `${proxyProtocol}://${proxyHost}`)
      }
    }
  }
}
