import chokidar from 'chokidar'
import { gray, red, green } from 'chalk'

import { log } from './utils'
import buildRoutes from './routes/buildRoutes'

export default class RequestHandler {

  options = null

  watcher = null

  routes = []

  constructor(options) {
    this.options = options
  }

  listen() {
    this.watcher = chokidar.watch(this.options.entry, { ignored: /node_modules/ })
    this.watcher.on('change', this.loadRules.bind(this))
    this.loadRules()
  }

  async handleRequest(req) {
    for (const { match, handle } of this.routes) {
      if (!(req.params = match(req))) {
        continue
      }
      let res = handle
      while (typeof res === 'function') {
        res = await res(req)
      }
      if (typeof res === 'object') {
        return res
      }
    }
  }

  loadRules() {
    log(gray('Cleanup mockup rules'))
    for (const path of Object.keys(require.cache)) {
      if (!path.includes('node_modules') && path.startsWith(this.options.entry)) {
        delete require.cache[path]
      }
    }
    try {
      log(gray('Loading mockup rules'))
      let routes = require(this.options.entry)
      if (routes.__esModule) {
        routes = routes.default
      }
      this.routes = buildRoutes(routes)
      log(green('Mockup rules loaded'))
    } catch (error) {
      log(red('Loading mockup rules error'), '\n', error.stack)
    }
  }
}
