import ip from 'ip'
import tls from 'tls'
import fetch from 'node-fetch'
import { promisify } from 'bluebird'
import createPacResolver from 'pac-resolver'
import { Agent as HttpAgent } from 'http'
import { Agent as HttpsAgent } from 'https'

import netConnect from './net'
import pacConnect from './pac'
import httpConnect from './http'
import socksConnect from './socks'

import config from '../config'

export default async () => {
  const connect = await getConnect()

  return {
    connect,
    http: new ConnectAgent({ connect }),
    https: new SecureConnectAgent({ connect }),
  }
}

async function getConnect() {
  const [upstreamType, upstreamURL] = config.upstream.split(' ')

  switch (upstreamType.toLowerCase()) {

    case 'direct':
      return netConnect

    case 'http': {
      return options => httpConnect(options, upstreamURL)
    }

    case 'pac': {
      const pacContent = await fetch(upstreamURL).then(res => res.text())
      const options = { sandbox: { myIpAddress: () => ip.address() } }

      const pacResolver = promisify(createPacResolver(pacContent, options))

      return options => pacConnect(options, pacResolver)
    }

    case 'socks': {
      return options => socksConnect(options, upstreamURL)
    }

    default: {
      throw new Error(`Unsupported upstream type ${upstreamType}`)
    }
  }
}

class ConnectAgent extends HttpAgent {

  constructor(options) {
    super(options)
    this.options = options
  }

  createConnection(options, callback) {
    this.options.connect(options).then(socket => {
      callback(null, socket)
    }, callback)
  }
}

class SecureConnectAgent extends HttpsAgent {

  constructor(options) {
    super(options)
    this.options = options
  }

  createConnection(options, callback) {
    this.options.connect(options).then(socket => {
      callback(null, tls.connect({
        socket,
        host: null,
        port: null,
        path: null,
        servername: options.servername || options.host,
      }))
    }, callback)
  }
}
