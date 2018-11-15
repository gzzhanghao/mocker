#!/usr/bin/env node

const path = require('path')
const { red } = require('chalk')
const { log } = require('../lib/utils')
const { HTTPParser } = require('http-parser-js')

process.on('uncaughtException', error => {
  log(red('Uncaught exception'), '\n', error.stack)
})

process.on('unhandledRejection', error => {
  log(red('Unhandled rejection'), '\n', error.stack)
})

process.binding('http_parser').HTTPParser = HTTPParser

const commander = require('commander')
const pkg = require('../package.json')

commander
  .version(pkg.version)
  .arguments('[entry]')
  .option('-p, --port <port>', 'proxy server port', 8123)
  .option('-u, --upstream <proxy>', 'upstream options', 'direct')
  .option('-k, --key <path>', 'ssl private key path', 'ssl/key.pem')
  .option('-c, --cert <path>', 'ssl certificate path', 'ssl/cert.pem')
  .action((entry, args) => {
    const { createServer } = require('..')

    const server = createServer({
      cert: path.resolve(args.cert),
      key: path.resolve(args.key),
      entry: path.resolve(entry || 'lib'),
      upstream: args.upstream,
    })

    server.listen(parseInt(args.port))
  })

commander.parse(process.argv)
