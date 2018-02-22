import dns from 'dns'
import socks from 'socks'
import { parse } from 'url'
import { promisify } from 'bluebird'

const lookup = promisify(dns.lookup)
const connect = promisify(socks.createConnection)

export default async (port, hostname, proxyURL) => {
  const { protocol: proxyProtocol, hostname: proxyHostname, port: proxyPort } = parse(proxyURL)

  let proxyType = 5
  if (proxyProtocol === 'socks4:' || proxyProtocol === 'socks4a:') {
    proxyType = 4
  }

  let targetHost = hostname
  if (proxyProtocol === 'socks4:') {
    targetHost = await lookup(hostname, { family: 4 })
  }

  return connect({
    proxy: {
      type: proxyType,
      port: proxyPort,
      command: 'connect',
      ipaddress: proxyHostname,
    },
    target: {
      port,
      host: targetHost,
    },
  })
}
