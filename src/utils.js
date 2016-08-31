export function waitFor(emitter, event) {
  return new Promise(resolve => {
    emitter.once(event, resolve)
  })
}
