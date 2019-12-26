import http from 'http'
import https from 'https'

import { parseHost } from '../utils'

export function connect(port, hostname, upstream, ua) {
  const secure = upstream.type === 'https'
  const [upstreamHostname, upstreamPort] = parseHost(upstream.host, secure ? 443 : 80)

  const headers = { host: `${hostname}:${port}` }
  if (ua) {
    headers['user-agent'] = ua
  }

  const proxyReq = (secure ? https : http).request({
    servername: upstreamHostname,
    hostname: upstreamHostname,
    port: upstreamPort,
    method: 'CONNECT',
    path: `${hostname}:${port}`,
    headers,
  })

  proxyReq.end()

  return new Promise((resolve, reject) => {

    proxyReq.once('error', reject)

    proxyReq.once('connect', (res, socket) => {
      if (res.statusCode === 200) {
        return resolve(socket)
      }
      reject(new Error(`Invalid proxy response ${res.statusCode}`))
    })

    proxyReq.once('response', res => {
      reject(new Error(`Invalid proxy response ${res.statusCode}`))
    })

  }).catch(error => {

    proxyReq.abort()
    throw error
  })
}
