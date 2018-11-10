import dns from 'dns'
import { parse } from 'url'
import { promisify } from 'bluebird'
import { SocksClient } from 'socks'

const resolve4 = promisify(dns.resolve4)
const connect = promisify(SocksClient.createConnection)

export async function createSocksConnection(req, upstreamURL) {
  const upstream = parse(upstreamURL)

  let proxyType = 5
  if (upstream.protocol === 'socks4:' || upstream.protocol === 'socks4a:') {
    proxyType = 4
  }

  let targetHost = req.hostname
  if (upstream.protocol === 'socks4:') {
    [targetHost] = await resolve4(req.hostname)
  }

  const { socket } = await connect({
    command: 'connect',
    proxy: {
      type: proxyType,
      port: upstream.port ? +upstream.port : 1080,
      ipaddress: upstream.hostname,
    },
    destination: {
      port: req.port,
      host: targetHost,
    },
  })

  return socket
}
