import ip from 'ip'
import fetch from 'node-fetch'
import { TLSSocket } from 'tls'
import { promisify } from 'bluebird'
import createPacResolver from 'pac-resolver'

import PacProxy from 'pac-proxy-agent'
import HttpProxy from 'http-proxy-agent'
import SocksProxy from 'socks-proxy-agent'
import HttpsProxy from 'https-proxy-agent'

import netConnect from './net'
import pacConnect from './pac'
import httpConnect from './http'
import socksConnect from './socks'

import config from '../config'

export default async () => {
  const [upstreamType, upstreamURL] = config.upstream.split(' ')

  switch (upstreamType.toLowerCase()) {

    case 'direct':
      return { connect: netConnect, getAgent() {} }

    case 'http': {
      const httpsAgent = new HttpsProxy(upstreamURL)
      const httpAgent = new HttpProxy(upstreamURL)

      return {
        connect(req) {
          return httpConnect(req, upstreamURL)
        },
        getAgent(req) {
          if (req.socket instanceof TLSSocket) {
            return httpsAgent
          }
          return httpAgent
        },
      }
    }

    case 'pac': {
      const pacContent = await fetch(upstreamURL).then(res => res.text())
      const options = { sandbox: { myIpAddress: () => ip.address() } }

      const pacResolver = promisify(createPacResolver(pacContent, options))
      const agent = new PacProxy('data:text/plain;,' + encodeURIComponent(pacContent), options)

      return {
        connect(req) {
          return pacConnect(req, pacResolver)
        },
        getAgent() {
          return agent
        },
      }
    }

    case 'socks': {
      const agent = new SocksProxy(upstreamURL)

      return {
        connect(req) {
          return socksConnect(req, upstreamURL)
        },
        getAgent() {
          return agent
        },
      }
    }

    default: {
      throw new Error(`Unsupported upstream type ${upstreamType}`)
    }
  }
}
