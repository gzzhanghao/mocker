import chalk from 'chalk'
import chokidar from 'chokidar'

import { log } from '@/utils'

import buildRoutes from './routes'

export default class Router {

  /**
   * @private
   *
   * @type {string}
   */
  entry

  /**
   * @private
   *
   * @type {import('./routes').Route[]}
   */
  routes = []

  /**
   * @param {string} entry
   */
  constructor(entry) {
    this.entry = entry
    this.loadRoutes()

    chokidar.watch(entry, { ignored: /node_modules/ })
      .on('change', this.loadRoutes.bind(this))
  }

  /**
   * @param {import('@/wrapper/Request')} req
   */
  async handleRequest(req) {
    const routeParams = {
      protocol: req.protocol,
      hostname: req.hostname,
      port: req.port,
      pathname: req.pathname,
      query: req.query,
    }
    for (const { patterns, handlers } of this.routes) {
      for (const { match } of patterns) {
        req.params = match(routeParams)
        if (req.params) break
      }
      if (!req.params) {
        continue
      }
      for (const handler of handlers) {
        let res = handler
        while (typeof res === 'function') {
          res = await res(req)
        }
        if (typeof res === 'object') {
          return res
        }
      }
    }
  }

  /**
   * @private
   */
  loadRoutes() {
    log(chalk.gray('Cleanup mockup rules'))
    for (const path of Object.keys(require.cache)) {
      if (!path.includes('node_modules') && path.startsWith(this.entry)) {
        delete require.cache[path]
      }
    }
    try {
      log(chalk.gray('Loading mockup rules'))
      let routes = require(this.entry)
      if (routes.__esModule) {
        routes = routes.default
      }
      this.routes = buildRoutes(routes)
      log(chalk.green('Mockup rules loaded'))
    } catch (error) {
      log(chalk.red('Loading mockup rules error'), '\n', error.stack)
    }
  }
}
