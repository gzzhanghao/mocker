import buildPattern from './buildPattern'

/**
 * Transform mockup rules into flat route array
 *
 * @param {Array} routes
 *
 * eg.
 *
 * ['//mocker.io', [
 *   console.log,
 *   '/foo',
 *   '/bar', [
 *     html('foo')
 *   ]
 * ]]
 *
 * =>
 *
 * [{
 *   pattern: '//mocker.io',
 *   handle: console.log,
 *   match: buildPattern('//mocker.io')
 * },{
 *   pattern: '//mocker.io/foo',
 *   handle: html('foo'),
 *   match: buildPattern('//mocker.io/foo')
 * },{
 *   pattern: '//mocker.io/bar',
 *   handle: html('bar'),
 *   match: buildPattern('//mocker.io/bar')
 * }]
 */
export default function buildRoutes(routes) {
  return flattenRoutes(routes).map(item => ({
    pattern: item[0],
    handle: item[1],
    match: buildPattern(item[0]),
  }))
}

function flattenRoutes(routes) {
  const result = []
  let contexts = []

  if (!Array.isArray(routes)) {
    throw new TypeError('Mockup rules must be an array')
  }

  for (const item of routes) {
    if (typeof item === 'string') {
      contexts.push(item)
      continue
    }
    let children = [['', item]]
    if (typeof item !== 'function') {
      children = flattenRoutes(item)
    }
    if (!contexts.length) {
      result.push(...children)
      continue
    }
    for (const child of children) {
      result.push(...contexts.map(c => [c + child[0], child[1]]))
    }
    contexts = []
  }

  return result
}
