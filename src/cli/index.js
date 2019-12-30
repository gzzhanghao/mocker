import path from 'path'
import chalk from 'chalk'
import commander from 'commander'

import Router from '@/router'
import Upstream from '@/upstream'
import { log } from '@/utils'

import getRootCA from './rootCA'

process.on('uncaughtException', error => {
  log(chalk.red('Uncaught exception'), '\n', error.stack)
})

process.on('unhandledRejection', error => {
  log(chalk.red('Unhandled rejection'), '\n', error.stack)
})

commander
  .version(require('../../package.json').version)
  .arguments('[entry]')
  .option('-p, --port <port>', 'proxy server port', 8123)
  .option('-u, --upstream <proxy>', 'upstream options', 'direct')
  .option('-k, --key <path>', 'ssl private key path', 'ssl/key.pem')
  .option('-c, --cert <path>', 'ssl certificate path', 'ssl/cert.pem')
  .action(async (entry, args) => {
    const { createServer } = require('..')

    const server = createServer({
      rootCA: getRootCA({
        cert: path.resolve(args.cert),
        key: path.resolve(args.key),
      }),
      router: new Router(path.resolve(entry || 'lib')),
      upstream: await Upstream.create(args.upstream),
    })

    server.listen(parseInt(args.port))
  })

commander.parse(process.argv)
