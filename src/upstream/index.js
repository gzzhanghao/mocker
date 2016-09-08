import fetch from 'node-fetch'
import { TLSSocket } from 'tls'
import { promisify } from 'bluebird'
import createPacResolver from 'pac-resolver'

import netConnect from './net'
import pacConnect from './pac'
import httpConnect from './http'
import socksConnect from './socks'

import PacProxy from 'pac-proxy-agent'
import HttpProxy from 'http-proxy-agent'
import SocksProxy from 'socks-proxy-agent'
import HttpsProxy from 'https-proxy-agent'

export default async (upstream = 'direct') => {
  const [upstreamType, upstreamConfig] = upstream.split(' ')

  switch (upstreamType.toLowerCase()) {

    case 'direct':
      return { connect: netConnect, getAgent() {} }

    case 'http': {
      const httpProxy = new HttpProxy(upstreamConfig)
      const httpsProxy = new HttpsProxy(upstreamConfig)

      return {
        connect: (port, hostname, opts) => httpConnect(port, hostname, upstreamConfig, opts),
        getAgent: req => (req.socket instanceof TLSSocket) ? httpsProxy : httpProxy,
      }
    }

    case 'pac': {
      const pacContent = await fetch(upstreamConfig).then(res => res.text())
      const pacResolver = promisify(createPacResolver(pacContent))
      const agent = new PacProxy('data:text/plain;,' + encodeURIComponent(pacContent))

      return {
        connect: (port, hostname, opts) => pacConnect(port, hostname, pacResolver, opts),
        getAgent: () => agent,
      }
    }

    case 'socks': {
      const agent = new SocksProxy(upstreamConfig)

      return {
        connect: (port, hostname) => socksConnect(port, hostname, upstreamConfig),
        getAgent: () => agent,
      }
    }

    default:
      throw new Error(`Unsupported upstream type ${upstreamType}`)
  }
}
