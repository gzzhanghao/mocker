import netConnect from './net'
import httpConnect from './http'

export default async function connect(port, hostname, proxy, opts) {
  const [proxyType, proxyHost] = (await proxy(opts.href, hostname)).split(' ')

  switch (proxyType.toUpperCase()) {

    case 'DIRECT':
      return netConnect(port, hostname)

    case 'HTTPS':
    case 'PROXY':
      const proxyProtocol = proxyType.toUpperCase() === 'HTTPS' ? 'https' : 'http'
      return httpConnect(port, host, `${proxyProtocol}://${proxyHost}`, opts)

    default:
      throw new Error(`Unsupported proxy type ${proxyType}`)
  }
}
