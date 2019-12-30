#!/usr/bin/env node

const { HTTPParser } = require('http-parser-js')

HTTPParser.encoding = 'utf-8'
process.binding('http_parser').HTTPParser = HTTPParser

require('../lib/cli')
