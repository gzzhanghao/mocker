const HOST_REGEX = /^(?<hostname>.*?)(:(?<port>\d*))?$/

export const log = console.log // eslint-disable-line no-console

/**
 * @param {string} value
 * @param {number} defaultPort
 *
 * @returns {[string, number]}
 */
export function parseHost(value, defaultPort) {
  const { groups } = value.match(HOST_REGEX)
  let hostname = groups.hostname
  if (hostname[0] === '[' && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1)
  }
  const port = groups.port ? +groups.port : defaultPort
  return [hostname, port]
}

/**
 * @param {string} hostname
 * @param {number} port
 * @param {number} defaultPort
 */
export function stringifyHost(hostname, port, defaultPort) {
  if (hostname.includes(':')) {
    hostname = `[${hostname}]`
  }
  if (port === defaultPort) {
    return hostname
  }
  return `${hostname}:${port}`
}
