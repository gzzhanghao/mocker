import { join } from 'path'
import { createSecureContext } from 'tls'

import getCert from './getCert'
import { generateCA, generateHostKeys } from './keygen'

import config from '../config'

export default async () => {
  const keys = Object.create(null)
  const ca = await getCert(config.keys, generateCA)

  return {
    cert: ca.cert,
    key: ca.key,
    async SNICallback(servername, callback) {
      if (keys[servername]) {
        return callback(null, keys[servername])
      }
      const cert = forceGenerate => getCert(join(config.keys, servername), () => generateHostKeys(ca, [servername]), forceGenerate)
      try {
        return callback(null, createSecureContext(await cert()))
      } catch (error) {
        // try again with newly generated keys
      }
      try {
        return callback(null, createSecureContext(await cert(true)))
      } catch (error) {
        callback(null, error)
      }
    },
  }
}
