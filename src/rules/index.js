import chokidar from 'chokidar'
import { gray, red, green } from 'chalk'

import log from '../logger'
import config from '../config'
import compileRules from './compileRules'

/**
 * Watch config.entry and invoke callback when entry reloaded
 */
export default function(callback) {

  chokidar.watch(config.entry, { ignored: /node_modules/ }).on('change', () => {
    log(gray('Reloading'))

    for (const path of Object.keys(require.cache)) {
      if (!path.includes('node_modules') && path.startsWith(config.entry)) {
        delete require.cache[path]
      }
    }

    try {
      callback(compileRules(require(config.entry).default))
      log(green('Reloaded'))
    } catch (error) {
      log(red('Reload error'), '\n', error.stack)
    }
  })

  try {
    return compileRules(require(config.entry).default)
  } catch (error) {
    log(red('Compile error'), '\n', error.stack)
  }

  return []
}
