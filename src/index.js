import MockerServer from './MockerServer'

/**
 * @typedef {import('@/router').default} Router
 * @typedef {import('@/upstream').default} Upstream
 * @typedef {{ key: string, cert: string }} RootCA
 *
 * @param {{ upstream: Upstream, router: Router, rootCA: RootCA }} options
 */
export function createServer(options) {
  return new MockerServer(options)
}
