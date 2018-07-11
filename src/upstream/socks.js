import dns from 'dns'
import { parse } from 'url'
import { promisify } from 'bluebird'
import { SocksClient } from 'socks'

const lookup = promisify(dns.lookup)
const connect = promisify(SocksClient.createConnection)

export default async (req, proxy) => {
  const proxyURL = parse(proxy)

  let proxyType = 5
  if (proxyURL.protocol === 'socks4:' || proxyURL.protocol === 'socks4a:') {
    proxyType = 4
  }

  let targetHost = req.hostname
  if (proxyURL.protocol === 'socks4:') {
    targetHost = await lookup(req.hostname, { family: 4 })
  }

  return connect({
    proxy: {
      type: proxyType,
      port: proxyURL.port,
      command: 'connect',
      ipaddress: proxyURL.hostname,
    },
    target: {
      port: req.port,
      host: targetHost,
    },
  })
}
