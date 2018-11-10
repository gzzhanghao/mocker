import dns from 'dns'

export default function dnsResolve(host, callback) {
  dns.resolve4(host, (error, address) => {
    if (error) {
      return callback(error)
    }
    callback(null, address[0] || '127.0.0.1')
  })
}

dnsResolve.async = true
