const IPV6_REGEX = /^(.*?)(:(\d*))?$/

export const log = console.log // eslint-disable-line no-console

export function parseHost(value, defaultPort) {
  const match = value.match(IPV6_REGEX)
  let hostname = match[1]
  if (match[1][0] === '[') {
    hostname = match[1].slice(1, -1)
  }
  const port = match[3] ? +match[3] : defaultPort
  return [hostname, port]
}
