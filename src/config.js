import minimist from 'minimist'
import { resolve } from 'path'

const args = minimist(process.argv.slice(2))

export default {
  port: args.p || args.port || 8123,
  entry: resolve(args._[0] || 'lib'),
  keys: resolve(args.k || args.keys || 'keys'),
  upstream: args.u || args.upstream || 'direct',
}
