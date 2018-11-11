import buildPattern from './buildPattern'

/**
 * Transform mockup rules into flat route array
 *
 * @param {Array} routes
 *
 * eg.
 *
 * ['//mocker.io', [
 *   rootHandler,
 *   '/foo',
 *   '/bar',
 *   setHost,
 *   json({}),
 * ]]
 *
 * =>
 *
 * [{
 *   pattern: '//mocker.io',
 *   handle: rootHandler,
 *   match: buildPattern('//mocker.io')
 * }, {
 *   pattern: '//mocker.io/foo',
 *   handle: setHost,
 *   match: buildPattern('//mocker.io/foo')
 * }, {
 *   pattern: '//mocker.io/foo',
 *   handle: json({}),
 *   match: buildPattern('//mocker.io/foo')
 * }, {
 *   pattern: '//mocker.io/bar',
 *   handle: setHost,
 *   match: buildPattern('//mocker.io/bar')
 * }, {
 *   pattern: '//mocker.io/bar',
 *   handle: json({}),
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
  for (let i = 0, ii = routes.length; i < ii; ) {
    for (; i < ii && typeof routes[i] === 'string'; i++) {
      contexts.push(routes[i])
    }
    const children = []
    for (; i < ii && typeof routes[i] !== 'string'; i++) {
      let items = [['', routes[i]]]
      if (typeof routes[i] !== 'function') {
        items = flattenRoutes(routes[i])
      }
      children.push(...items)
    }
    if (!contexts.length) {
      contexts = ['']
    }
    for (const context of contexts) {
      result.push(...children.map(c => [context + c[0], c[1]]))
    }
    contexts = []
  }
  return result
}
