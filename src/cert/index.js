import tls from 'tls'
import path from 'path'
import getCert from './getCert'
import { generateCA, generateHostKeys } from './keygen'

export default async keyPath => {
  const keys = Object.create(null)
  const ca = await getCert(keyPath, generateCA)

  return {
    cert: ca.cert,
    key: ca.key,
    SNICallback(servername, callback) {
      if (keys[servername]) {
        return callback(null, keys[servername])
      }
      getCert(
        path.join(keyPath, servername),
        () => generateHostKeys(ca, [servername])
      ).then(
        cert => callback(null, keys[servername] = tls.createSecureContext(cert)),
        callback
      )
    },
  }
}
