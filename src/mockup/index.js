import chokidar from 'chokidar'

import logger from '../logger'
import compileRules from './compileRules'

/**
 * Watch mockupPath and invoke callback when files changed
 */
export default (mockupPath, callback) => {
  callback(compileRules(require(mockupPath).default))

  chokidar.watch(mockupPath, { ignored: /node_modules/ }).on('change', () => {
    logger.debug(logger.gray('reloading'))
    for (const entry of getCacheTree(require.cache, require.resolve(mockupPath), /node_modules/)) {
      delete require.cache[entry]
    }
    try {
      callback(compileRules(require(mockupPath).default))
    } catch (error) {
      logger.error(logger.red('reload'), '\n', error.stack)
    }
    logger.info(logger.green('reloaded'))
  })
}

/**
 * Walk through cache tree and get dependencies of the entry
 */
function getCacheTree(cache, entry, ignored) {
  const items = [entry]
  for (const item of items) {
    if (!cache[item]) {
      continue
    }
    for (const child of cache[item].children) {
      const name = child.id || child
      if (!ignored || !ignored.test(name)) {
        items.push(name)
      }
    }
  }
  return items
}
