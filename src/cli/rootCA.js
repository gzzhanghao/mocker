import fs from 'fs'
import path from 'path'

import { generateRootCAKey } from '@/keygen'

/**
 * @param {{ cert: string, key: string }} options
 */
export default function getRootCA(options) {
  try {
    return {
      cert: fs.readFileSync(options.cert, 'utf-8'),
      key: fs.readFileSync(options.key, 'utf-8'),
    }
  } catch (error) {
    // noop
  }
  const ca = generateRootCAKey()
  try {
    fs.mkdirSync(path.dirname(options.cert), { mode: 0o600, recursive: true })
    fs.mkdirSync(path.dirname(options.key), { mode: 0o600, recursive: true })
    fs.writeFileSync(options.cert, ca.cert, { mode: 0o600 })
    fs.writeFileSync(options.key, ca.key, { mode: 0o600 })
  } catch (error) {
    // noop
  }
  return ca
}
