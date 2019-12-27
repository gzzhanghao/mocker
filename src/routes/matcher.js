import qs from 'querystring'
import parsePattern from './parsePattern'

export default function createMatcher(schema) {
  const patterns = parsePattern(schema)

  const matchProtocol = patterns.protocol && createProtocolMatcher(patterns.protocol)
  const matchHostname = patterns.hostname && createHostnameMatcher(patterns.hostname)
  const matchPort = patterns.port && createPortMatcher(patterns.port)
  const matchQuery = patterns.search && createQueryMatcher(patterns.search)
  const matchPathname = patterns.pathname && createPathnameMatcher(patterns.pathname)

  return function matchRequest(req) {
    if (matchProtocol && !matchProtocol(req.protocol)) {
      return
    }
    if (matchPort && !matchPort(req.port || (req.secure ? 443 : 80))) {
      return
    }
    if (matchHostname && !matchHostname(req.hostname)) {
      return
    }
    if (matchQuery && !matchQuery(req.query)) {
      return
    }
    if (!matchPathname) {
      return {}
    }
    return matchPathname(req.pathname)
  }
}

function createProtocolMatcher(pattern) {
  const accepts = pattern.toUpperCase().split('|')
  return function matchProtocol(protocol) {
    return accepts.includes(protocol.replace(/:$/, '').toUpperCase())
  }
}

/**
 * Matching hostname
 *
 * Supports DNS wildcard
 */
function createHostnameMatcher(pattern) {
  const domain = pattern.replace(/^\*(\.\*)?/, '')
  const strict = !pattern.startsWith('*.*.')
  const wildcard = pattern.startsWith('*.')
  const patternLength = pattern.split('.').length

  return function matchHostname(hostname) {
    if (hostname === pattern) {
      return true
    }
    if (!hostname.endsWith(domain)) {
      return false
    }
    if (strict && hostname.split('.').length !== patternLength) {
      return false
    }
    return wildcard || hostname === pattern
  }
}

function createPortMatcher(pattern) {
  const accepts = pattern.split('|')
  return function matchPort(target) {
    return accepts.includes(target)
  }
}

/**
 * Matching pathname with params
 *
 * eg. /pathname/with/:shortParam/::longParam
 *
 * :shortParam matches any characters except "/"
 * ::longParam matches any characters
 */
function createPathnameMatcher(pattern) {
  if (pattern == null) {
    return () => ({})
  }

  const source = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/::?\w+/g, param => {
    if (param.startsWith('::')) {
      return `(?<${param.slice(2)}>.+)`
    }
    return `(?<${param.slice(1)}>[^/]+)`
  })

  const regex = new RegExp(`^${source}$`)

  return pathname => {
    const match = pathname.match(regex)
    if (match) {
      return match.groups
    }
  }
}

/**
 * Matching query
 *
 * eg. foo&bar=baz
 *
 * "foo" must exists, and "bar" must equals to "baz"
 */
function createQueryMatcher(pattern) {
  const patternQuery = qs.parse(pattern.slice(1))
  const keys = Object.keys(patternQuery)

  return function matchQuery(search) {
    const query = qs.parse(search)
    for (const key of keys) {
      if (query[key] == null) {
        return false
      }
      if (query[key] && (patternQuery[key] !== query[key])) {
        return false
      }
    }
    return true
  }
}
