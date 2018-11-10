import buildPattern from './buildPattern'

/**
 * Transform mockup rules into flat route array
 *
 * @param {Array} routes
 *
 * eg.
 *
 * [
 *   '//mocker.io', [
 *     console.log,
 *     '/test', html('foo')
 *   ]
 * ]
 *
 * =>
 *
 * [
 *   {
 *     pattern: '//mocker.io',
 *     handle: console.log,
 *     match: buildPattern('//mocker.io')
 *   },
 *   {
 *     pattern: '//mocker.io/test',
 *     handle: html('foo'),
 *     match: buildPattern('//mocker.io/test')
 *   }
 * ]
 */
export default function buildRoutes(routes) {
  if (!Array.isArray(routes)) {
    throw new TypeError('Mockup rules must be an array')
  }
  return flattenRoutes(routes).map(item => ({
    pattern: item[0],
    handle: item[1],
    match: buildPattern(item[0]),
  }))
}

function flattenRoutes(rules) {
  let context = ''
  const result = []

  for (const item of rules) {
    if (typeof item === 'string') {
      context = item
      continue
    }
    if (typeof item === 'function') {
      result.push([context, item])
      continue
    }
    for (const child of flattenRoutes(item)) {
      result.push([context + child[0], child[1]])
    }
  }

  return result
}
