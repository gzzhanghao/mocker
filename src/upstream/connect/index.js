import * as httpUpstream from './http'
import * as socksUpstream from './socks'
import * as tcpUpstream from './tcp'

export default {
  direct: tcpUpstream,
  http: httpUpstream,
  https: httpUpstream,
  proxy: httpUpstream,
  socks: socksUpstream,
  socks4: socksUpstream,
  socks4a: socksUpstream,
  socks5: socksUpstream,
}
