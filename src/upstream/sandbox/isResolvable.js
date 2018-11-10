import dns from 'dns'

export default function isResolvable(host, callback) {
  dns.resolve4(host, error => {
    callback(null, !error)
  })
}

isResolvable.async = true;
