import qs from 'querystring'

import parseURL from './parseURL'

/**
 * Create matching function for given url
 *
 * @param {string} url
 *
 * @returns {Function}
 */
export default function createURLMatcher(url) {
  const pattern = parseURL(url)

  const matchProtocol = createProtocolMatcher(pattern.protocol)
  const matchHostname = createHostnameMatcher(pattern.hostname)
  const matchPort = createPortMatcher(pattern.port)
  const matchQuery = createQueryMatcher(pattern.search)
  const matchPathname = createPathnameMatcher(pattern.pathname)

  return function matchRequest(req) {
    if (!matchProtocol(req.protocol)) {
      return
    }
    if (!matchPort(req.port)) {
      return
    }
    if (!matchHostname(req.hostname)) {
      return
    }
    if (!matchQuery(req.query)) {
      return
    }
    return matchPathname(req.pathname)
  }
}

/**
 * Matching protocol
 */
function createProtocolMatcher(pattern) {
  if (!pattern) {
    return () => true
  }
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
  if (!pattern) {
    return () => true
  }
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

/**
 * Matching port number
 */
function createPortMatcher(pattern) {
  if (!pattern) {
    return () => true
  }
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
  if (!pattern) {
    return () => Object.create(null)
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
      return match.groups || Object.create(null)
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
  if (!pattern) {
    return () => true
  }

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
