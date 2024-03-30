setImmediate.queue = []
setImmediate.keys = new WeakMap
addEventListener('message', e => {
  if (e.data == 'runImmediate') {
    e.stopImmediatePropagation()
    const process = setImmediate.queue
    setImmediate.queue = []
    for (const f of process) {
      try {
        f && f()
      }
      catch (e) {
        setTimeout(() => {throw e})
      }
    }
  }
})
function setImmediate(f) {
  const key = {}
  const idx = setImmediate.queue.length
  setImmediate.keys.set(key, [setImmediate.queue, idx])
  setImmediate.queue[idx] = f
  if (idx == 0) {
    postMessage('runImmediate')
  }
  return key
}
function clearImmediate(key) {
  const [queue, idx] = setImmediate.keys.get(key) || []
  if (idx >= 0) queue[idx] = null
}