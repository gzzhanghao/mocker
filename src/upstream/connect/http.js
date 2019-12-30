import http from 'http'
import https from 'https'
import _ from 'lodash'

import { parseHost, stringifyHost } from '@/utils'

/**
 * @param {{ hostname: string, port: number, headers: any }} options
 * @param {{ type: 'http' | 'https' | 'proxy', host: string }} upstream
 */
export function connect(options, upstream) {
  const secure = upstream.type === 'https'
  const [upstreamHostname, upstreamPort] = parseHost(upstream.host, secure ? 443 : 80)

  const host = stringifyHost(options.hostname, options.port)

  const proxyReq = (secure ? https : http).request({
    servername: upstreamHostname,
    hostname: upstreamHostname,
    port: upstreamPort,
    method: 'CONNECT',
    path: host,
    headers: { host, ..._.pickBy(options.headers, _.identity) },
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
