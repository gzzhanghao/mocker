export const log = console.log // eslint-disable-line no-console

export function defer() {
  const result = {}
  result.promise = new Promise((resolve, reject) => {
    result.resolve = resolve
    result.reject = reject
  })
  return result
}
