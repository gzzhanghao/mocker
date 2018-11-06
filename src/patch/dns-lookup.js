/**
 * DNS resolve polyfill
 *
 * See http://superuser.com/a/508057
 */

import dns from 'dns'

const originLookup = dns.lookup

dns.lookup = function(hostname, options, callback) {
  const ipv6 = options.family === 6
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  originLookup(hostname, options, (error, ip, family) => {
    if (!error) {
      return callback(null, ip, family)
    }
    let resolve = dns.resolve4
    if (ipv6) {
      resolve = dns.resolve6
    }
    resolve(hostname, (err, records) => {
      if (err || !records[0]) {
        return callback(error)
      }
      if (options.all) {
        return callback(null, records, ipv6 ? 6 : 4)
      }
      callback(null, records[0], ipv6 ? 6 : 4)
    })
  })
}
