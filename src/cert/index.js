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
    SNICallback(servername, callback) {
      if (keys[servername]) {
        return callback(null, keys[servername])
      }
      getCert(
        join(config.keys, servername),
        () => generateHostKeys(ca, [servername])
      ).then(
        cert => callback(null, keys[servername] = createSecureContext(cert)),
        callback
      )
    },
  }
}
