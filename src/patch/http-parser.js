import { HTTPParser } from 'http-parser-js'

process.binding('http_parser').HTTPParser = HTTPParser
