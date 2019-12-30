import dns from 'dns'
import { promisify } from 'util'
import { SocksClient } from 'socks'

import { parseHost } from '@/utils'

const resolve4 = promisify(dns.resolve4)
const createConnection = promisify(SocksClient.createConnection)

/**
 * @param {{ hostname: string, port: number }} options
 * @param {{ type: 'http' | 'https' | 'proxy', host: string }} upstream
 */
export async function connect(options, upstream) {
  const [upstreamHostname, upstreamPort] = parseHost(upstream.host, 1080)

  let proxyType = 5
  if (upstream.type === 'socks4' || upstream.type === 'socks4a') {
    proxyType = 4
  }

  let targetHost = options.hostname
  if (upstream.type === 'socks4') {
    [targetHost] = await resolve4(options.hostname)
  }

  const { socket } = await createConnection({
    command: 'connect',
    proxy: {
      type: proxyType,
      port: upstreamPort,
      ipaddress: upstreamHostname,
    },
    destination: {
      port: options.port,
      host: targetHost,
    },
  })

  return socket
}
