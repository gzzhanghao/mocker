import compilePattern from './compilePattern'

export default rules => flattenRules(rules).map(item => ({
  pattern: item[0],
  handle: item[1],
  match: compilePattern(item[0]),
}))

function flattenRules(rules) {
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
    for (const child of flattenRules(item)) {
      result.push([context + child[0], child[1]])
    }
  }

  return result
}
