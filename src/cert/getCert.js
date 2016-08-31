import fs from 'fs'
import path from 'path'
import { promisify } from 'bluebird'

const mkdir = promisify(fs.mkdir)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

export default async (keysPath, generate) => {
  const certPath = path.join(keysPath, 'cert.pem')
  const keyPath = path.join(keysPath, 'key.pem')
  const pubPath = path.join(keysPath, 'pub.pem')

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

  await mkdir(keysPath)
  await Promise.all([
    writeFile(certPath, ca.cert),
    writeFile(keyPath, ca.key),
    writeFile(pubPath, ca.pub)
  ])

  return ca
}
