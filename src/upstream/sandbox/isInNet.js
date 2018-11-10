import dns from 'dns'
import { Netmask } from 'netmask'

export default function isInNet(host, pattern, mask, callback) {
  dns.resolve4(host, (error, address) => {
    if (error) {
      return callback(error)
    }
    const ip = address[0] || '127.0.0.1'
    callback(null, new Netmask(pattern, mask).contains(ip))
  })
}

isInNet.async = true
