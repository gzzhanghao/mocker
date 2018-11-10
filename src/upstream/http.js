import http from 'http'
import https from 'https'
import { parse } from 'url'

export function createHTTPConnection(req, upstreamURL) {
  const upstream = parse(upstreamURL)
  const secure = upstream.protocol === 'https:'

  const proxyReq = (secure ? https : http).request({
    servername: upstream.hostname,
    hostname: upstream.hostname,
    port: upstream.port || (secure ? 443 : 80),
    method: 'CONNECT',
    path: `${req.hostname}:${req.port}`,
    headers: {
      'host': upstream.host,
      'use-agent': req.headers['user-agent'],
    },
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
