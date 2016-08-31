import fetch from 'node-fetch'
import bluebird from 'bluebird'
import createPacResolver from 'pac-resolver'

import netConnect from './net'
import pacConnect from './pac'
import httpConnect from './http'

export default async function(upstream = 'DIRECT') {
  const [upstreamType, upstreamConfig] = upstream.split(' ')

  switch (upstreamType.toUpperCase()) {

    case 'DIRECT':
      return netConnect

    case 'HTTP':
      return (port, hostname, opts) => httpConnect(port, hostname, upstreamConfig, opts)

    case 'PAC':
      const pacContent = await fetch(upstreamConfig).then(res => res.text())
      const pacResolver = bluebird.promisify(createPacResolver(pacContent))
      return (port, hostname, opts) => pacConnect(port, hostname, pacResolver, opts)

    default:
      throw new Error(`Unknown upstream type ${upstreamType}`)
  }
}
