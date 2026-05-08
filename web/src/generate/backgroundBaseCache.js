const MAX_ENTRIES = 12
const CONCURRENCY = 3

const cache = new Map()
const pending = new Map()
let active = 0
const queue = []

function makeKey(payload) {
  // keep key small and deterministic — include only relevant fields
  try {
    const keyObj = {
      width: payload.width || payload.previewWidth || 0,
      height: payload.height || payload.previewHeight || 0,
      type: payload.type || payload.background || null,
      artPack: payload.artPack || null,
      cityIconType: payload.cityIconType || null,
    }
    return JSON.stringify(keyObj)
  } catch (e) {
    return String(Math.random())
  }
}

function evictIfNeeded() {
  if (cache.size <= MAX_ENTRIES) return
  // evict oldest (insertion order)
  const it = cache.keys().next()
  if (!it.done) {
    const k = it.value
    const v = cache.get(k)
    if (v && v.objectUrl) {
      try { URL.revokeObjectURL(v.objectUrl) } catch (e) {}
    }
    cache.delete(k)
  }
}

function acquireSlot() {
  return new Promise((resolve) => {
    if (active < CONCURRENCY) {
      active++
      resolve()
      return
    }
    queue.push(resolve)
  })
}

function releaseSlot() {
  active--
  if (queue.length > 0) {
    const r = queue.shift()
    active++
    try { r() } catch (e) {}
  }
}

async function fetchWithRetries(url, opts, attempts = 3, delayMs = 300) {
  for (let i = 0; i < attempts; i++) {
    try {
      const resp = await fetch(url, opts)
      if (!resp.ok) throw new Error('Non-OK response')
      return resp
    } catch (err) {
      if (i === attempts - 1) throw err
      if (opts.signal && opts.signal.aborted) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '/api'

async function _doFetchBase(payload, signal) {
  await acquireSlot()
  try {
    const resp = await fetchWithRetries(`${API_BASE}/background-base`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
    const blob = await resp.blob()
    const objectUrl = URL.createObjectURL(blob)
    return { blob, objectUrl }
  } finally {
    releaseSlot()
  }
}

async function get(payload, signal) {
  const key = makeKey(payload)
  if (cache.has(key)) return cache.get(key).blob
  if (pending.has(key)) {
    return pending.get(key)
  }
  const p = (async () => {
    try {
      const res = await _doFetchBase(payload, signal)
      cache.set(key, { blob: res.blob, objectUrl: res.objectUrl, ts: Date.now() })
      evictIfNeeded()
      return res.blob
    } finally {
      pending.delete(key)
    }
  })()
  pending.set(key, p)
  return p
}

// Start preload but don't await (caller can ignore failures)
function preload(payload) {
  const key = makeKey(payload)
  if (cache.has(key) || pending.has(key)) return
  const ctrl = new AbortController()
  const p = get(payload, ctrl.signal).catch(() => {})
  // store pending so concurrent preloads share work
  pending.set(key, p)
}

function clear() {
  for (const v of cache.values()) {
    if (v && v.objectUrl) {
      try { URL.revokeObjectURL(v.objectUrl) } catch (e) {}
    }
  }
  cache.clear()
}

export default { get, preload, clear }
