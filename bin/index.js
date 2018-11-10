#!/usr/bin/env node

const { red } = require('chalk')
const { log } = require('../lib/utils')

process.on('uncaughtException', error => {
  log(red('Uncaught exception'), '\n', error.stack)
})

process.on('unhandledRejection', error => {
  log(red('Unhandled rejection'), '\n', error.stack)
})

const path = require('path')
const minimist = require('minimist')
const { HTTPParser } = require('http-parser-js')

process.binding('http_parser').HTTPParser = HTTPParser

const args = minimist(process.argv.slice(2))
const { createServer } = require('..')

const server = createServer({
  cert: path.resolve('ssl/cert.pem'),
  key: path.resolve('ssl/key.pem'),
  entry: path.resolve(args._[0] || 'lib'),
  upstream: args.u || args.upstream || 'direct',
})

server.listen(args.p || args.port || 8123)
