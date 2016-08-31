export function waitFor(emitter, event) {
  return new Promise(resolve => {
    emitter.once(event, resolve)
  })
}

export function log(module, action, msg, error) {
  console.log(`[${module}:${action}] ${error.message} : ${msg}`)
  console.log(error.stack)
}
