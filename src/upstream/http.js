import http from 'http'
import https from 'https'
import { parse } from 'url'

export default (req, proxy) => {
  const proxyURL = parse(proxy)
  const secure = proxyURL.protocol === 'https:'

  const proxyReq = (secure ? https : http).request({
    servername : proxyURL.hostname,
    hostname   : proxyURL.hostname,
    port       : proxyURL.port || (secure ? 443 : 80),
    method     : 'CONNECT',
    path       : `${req.hostname}:${req.port}`,
    headers: {
      'Host'             : proxyURL.host,
      'Use-Agent'        : req.headers['user-agent'],
      'Proxy-Connection' : 'keep-alive',
    }
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
