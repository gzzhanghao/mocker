import url from 'url'
import path from 'path'
import chokidar from 'chokidar'

import Request from './Request'
import compileRules from './compileRules'

import { log } from '../utils'

export default mockupPath => {
  let mockup = compileRules(require(mockupPath).default)

  chokidar.watch(mockupPath, { ignored: /node_modules/ }).on('change', () => {
    for (const entry of getCacheTree(require.cache, require.resolve(mockupPath), /node_modules/)) {
      delete require.cache[entry]
    }
    try {
      mockup = compileRules(require(mockupPath).default)
    } catch (error) {
      log('mock', 'rebuild', mockupPath, error)
    }
  })

  return async (rawRew, res) => {
    const req = new Request(rawRew)

    for (const rule of mockup) {
      if (req.params = rule.match(req)) {
        try {
          if (await Promise.resolve(rule.handle(req, res)) === false) {
            return
          }
        } catch (error) {
          log('mock', 'mockup', rule.name, error)
          res.writeHead(400)
          res.end()
          return
        }
      }
    }
  }
}

function getCacheTree(cache, entry, ignored) {
  const items = [entry]
  for (const item of items) {
    if (cache[item]) {
      cache[item].children.forEach(child => {
        const name = child.id || child
        if (!ignored || !ignored.test(name)) {
          items.push(child.id || child)
        }
      })
    }
  }
  return items
}
