import _ from 'lodash'

import createURLMatcher from './match'

/**
 * Transform mockup rules into flat routing list
 *
 * @typedef {{ url: string, match: Function }} Pattern
 * @typedef {{ patterns: Pattern[], handlers: Function[] }} Route
 *
 * @param {any[]} rule
 *
 * @returns {Route[]}
 */
export default function buildRoutes(rule) {
  if (!Array.isArray(rule)) {
    throw new TypeError('Mockup rules must be an array')
  }
  return flattenRoutes(rule).map(item => ({
    patterns: item.patterns.map(url => ({ url, match: createURLMatcher(url) })),
    handlers: item.handlers,
  }))
}

function flattenRoutes(rule) {
  const result = []
  for (let i = 0, ii = rule.length; i < ii; ) {
    const context = []
    for (; i < ii && typeof rule[i] === 'string'; i++) {
      context.push(rule[i])
    }
    if (!context.length) {
      context.push('')
    }
    const children = []
    for (; i < ii && typeof rule[i] !== 'string'; i++) {
      let items = [{ patterns: [''], handlers: [rule[i]] }]
      if (Array.isArray(rule[i])) {
        items = flattenRoutes(rule[i])
      }
      children.push(...items)
    }
    if (!context.some(url => url[0] !== '!')) {
      continue
    }
    for (const child of children) {
      result.push({
        patterns: _.flatMap(child.patterns, r => context.map(b => b + r)),
        handlers: child.handlers,
      })
    }
  }
  return result
}
