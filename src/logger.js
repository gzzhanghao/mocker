import chalk from 'chalk'
import dateFormat from 'dateformat'

const levels = ['debug', 'info', 'warn', 'error', 'fatal', 'none']

const log = createLogger('log')
const warn = createLogger('warn')
const error = createLogger('error')

const noop = () => {}

let logLevel = levels.indexOf((process.env.MOCKER_LOG || '').toLowerCase())
if (logLevel < 0) {
  logLevel = levels.indexOf('info')
}

const logger = Object.assign({}, chalk, {
  debug: log,
  info: log,
  warn: warn,
  error: error,
  fatal: error,
})

for (let i = logLevel - 1; i >= 0; i--) {
  logger[levels[i]] = noop
}

function createLogger(level) {
  return (...args) => {
    console[level](chalk.gray(dateFormat(new Date, 'yyyymmdd HH:MM:ss')), ...args)
  }
}

export default logger
