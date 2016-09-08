#!/usr/bin/env node

import path from 'path'
import yargs from 'yargs'

import pkg from '../package'
import bootstrap from './bootstrap'

const argv = yargs

  .usage('Usage: $0 [options]')

  .alias('h', 'help')
  .help('h')

  .describe('v', 'Show version')
  .alias('v', 'version')
  .boolean('v')

  .describe('c', 'Path to config file')
  .default('c', 'mocker.config.js')
  .coerce('c', path.resolve)
  .alias('c', 'config')
  .nargs('c', 1)
  .string('c')

  .argv

if (argv.v) {
  console.log(pkg.version)
  process.exit(0)
}

bootstrap(require(argv.c))
