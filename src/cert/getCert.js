import fs from 'fs'
import { yellow } from 'chalk'
import { promisify } from 'bluebird'
import { join, dirname } from 'path'

import log from '../logger'

const mkdir = promisify(fs.mkdir)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

export default async (path, generate) => {
  const certPath = join(path, 'cert.pem')
  const keyPath = join(path, 'key.pem')
  const pubPath = join(path, 'pub.pem')

  try {

    return await Promise.all([
      readFile(certPath, 'utf-8'),
      readFile(keyPath, 'utf-8'),
      readFile(pubPath, 'utf-8')
    ]).then(([cert, key, pub]) => ({ cert, key, pub }))

  } catch (error) {
    // @noop
  }

  const ca = generate()

  await mkdir(path).catch(() => {
    // @noop
  })

  await Promise.all([
    writeFile(certPath, ca.cert, { mode: 0o600 }),
    writeFile(keyPath, ca.key, { mode: 0o600 }),
    writeFile(pubPath, ca.pub, { mode: 0o600 })
  ])

  return ca
}
