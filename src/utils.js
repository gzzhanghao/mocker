import net from 'net'

const IPV6_REGEX = /^(?<hostname>.*?)(:(?<port>\d*))?$/

export const log = console.log // eslint-disable-line no-console

export function parseHost(value, defaultPort) {
  const { groups } = value.match(IPV6_REGEX)
  let hostname = groups.hostname
  if (hostname[0] === '[' && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1)
  }
  const port = groups.port ? +groups.port : defaultPort
  return [hostname, port]
}

export function stringifyHost(hostname, port, defaultPort) {
  if (net.isIPv6(hostname)) {
    hostname = `[${hostname}]`
  }
  if (port === defaultPort) {
    return hostname
  }
  return `${hostname}:${port}`
}
