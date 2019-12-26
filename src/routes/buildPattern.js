import parseURL from './parseURL'
import { parse as parseQuery } from 'querystring'

export default function buildPattern(schema) {
  const components = parseURL(schema)

  const matchProtocol = protocol(components.protocol)
  const matchHostname = hostname(components.hostname)
  const matchPort = port(components.port)
  const matchQuery = query(components.search && parseQuery(components.search.slice(1)))
  const matchPathname = pathname(components.pathname)

  return req => (
    true

    && matchPort(req.port || (req.secure ? 443 : 80))
    && matchProtocol(req.protocol)
    && matchHostname(req.hostname)
    && matchQuery(req.query)

    // pathname must be the last one so we can return path params directly
    && matchPathname(req.pathname)
  )
}

function protocol(schema) {
  if (schema == null) {
    return () => true
  }
  const accepts = schema.toUpperCase().split('|')
  return target => accepts.includes(target.replace(/:$/, '').toUpperCase())
}

/**
 * Matching hostname
 *
 * Supports DNS wildcard
 */
function hostname(schema) {
  if (schema == null) {
    return () => true
  }

  const domain = schema.replace(/^\*(\.\*)?/, '')
  const strict = !schema.startsWith('*.*.')
  const wildcard = schema.startsWith('*.')
  const length = schema.split('.').length

  return target => {
    if (!target.endsWith(domain)) {
      return false
    }
    if (strict && target.split('.').length !== length) {
      return false
    }
    return wildcard || target === schema
  }
}

function port(schema) {
  if (schema == null) {
    return () => true
  }
  const accepts = schema.split('|')
  return target => accepts.includes(target)
}

/**
 * Matching pathname with params
 *
 * eg. /pathname/with/:shortParam/::longParam
 *
 * :shortParam matches any characters except "/"
 * ::longParam matches any characters
 */
function pathname(schema) {
  if (schema == null) {
    return () => ({})
  }

  const params = []

  const source = schema.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/::?\w+/g, param => {
    if (param.startsWith('::')) {
      params.push(param.slice(2))
      return '(.+)'
    }
    params.push(param.slice(1))
    return '([^/]+)'
  })

  const paramLength = params.length
  const regex = new RegExp(`^${source}$`)

  return target => {
    const match = target.match(regex)
    if (!match) {
      return null
    }
    const result = {}
    for (let i = 0; i < paramLength; i++) {
      result[params[i]] = match[i + 1]
    }
    return result
  }
}

/**
 * Matching query
 *
 * eg. foo&bar=baz
 *
 * "foo" must exists, and "bar" must equals to "baz"
 */
function query(schema) {
  if (schema == null) {
    return () => true
  }
  const keys = Object.keys(schema)
  return target => {
    for (const key of keys) {
      if (target[key] == null) {
        return false
      }
      if (schema[key] && (target[key] !== schema[key])) {
        return false
      }
    }
    return true
  }
}
