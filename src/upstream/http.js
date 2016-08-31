import url from 'url'
import http from 'http'
import https from 'https'

export default function connect(port, hostname, proxy, opts) {
  const parsedURL = url.parse(proxy)
  const secure = parsedURL.protocol === 'https:'

  const proxyReq = (secure ? https : http).request({
    servername : parsedURL.hostname,
    hostname   : parsedURL.hostname,
    port       : parsedURL.port || (secure ? 443 : 80),
    method     : 'CONNECT',
    path       : `${hostname}:${port}`,
    headers: {
      'Host'             : parsedURL.host,
      'Use-Agent'        : opts.ua,
      'Proxy-Connection' : 'keep-alive',
    }
  })

  proxyReq.end()

  return new Promise((resolve, reject) => {

    proxyReq.once('error', reject)

    proxyReq.once('connect', (res, socket, head) => {
      resolve(socket)
    })

    proxyReq.once('response', res => {
      reject(new Error(`Invalid proxy response ${res.statusCode} ${res.statusText}`))
    })

  }).catch(error => {

    proxyReq.abort()
    throw error

  })

}
