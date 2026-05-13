// Shared helper utilities extracted to avoid duplication across modules
export function hexToHSB(hex) {
  const hh = String(hex || '').replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(hh)) return [0, 0, 0]
  const r = Number.parseInt(hh.slice(0,2),16)/255
  const g = Number.parseInt(hh.slice(2,4),16)/255
  const b = Number.parseInt(hh.slice(4,6),16)/255
  const max = Math.max(r,g,b)
  const min = Math.min(r,g,b)
  const delta = max - min
  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = ((b - r) / delta) + 2
    else hue = ((r - g) / delta) + 4
    hue = hue * 60
    if (hue < 0) hue += 360
  }
  const sat = max === 0 ? 0 : delta / max
  const bri = max
  return [hue/360, sat, bri]
}

export function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hsbToRgb(h, s, v) {
  const hh = (h * 360)
  const c = v * s
  const x = c * (1 - Math.abs(((hh/60) % 2) - 1))
  const m = v - c
  let r1=0,g1=0,b1=0
  if (hh >= 0 && hh < 60) {
    r1 = c
    g1 = x
  } else if (hh < 120) {
    r1 = x
    g1 = c
  } else if (hh < 180) {
    g1 = c
    b1 = x
  } else if (hh < 240) {
    g1 = x
    b1 = c
  } else if (hh < 300) {
    r1 = x
    b1 = c
  } else {
    r1 = c
    b1 = x
  }
  const R = Math.round((r1 + m) * 255)
  const G = Math.round((g1 + m) * 255)
  const B = Math.round((b1 + m) * 255)
  return [R,G,B]
}

export function hexToRgba(hex, transparencyPercent = 0) {
  if (!hex) return { r: 0, g: 0, b: 0, a: 1 }
  const h = hex.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0, a: 1 }
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  const opacity = 1 - (Number(transparencyPercent || 0) / 100)
  return { r, g, b, a: Math.max(0, Math.min(1, opacity)) }
}

export function rgbaToHex(col) {
  const r = Math.round(col.r || 0)
  const g = Math.round(col.g || 0)
  const b = Math.round(col.b || 0)
  return (
    '#'+
    r.toString(16).padStart(2, '0')+
    g.toString(16).padStart(2, '0')+
    b.toString(16).padStart(2, '0')
  )
}

export async function doFetchWithRetries(url, opts, attempts = 3, delayMs = 300) {
  for (let i = 0; i < attempts; i++) {
    try {
      const resp = await fetch(url, opts)
      if (!resp.ok) throw new Error('Non-OK response')
      return resp
    } catch (err) {
      if (i === attempts - 1) throw err
      if (opts?.signal?.aborted) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

export function shadeColor(hex, percent) {
  const h = hex.replace(/^#/, '')
  const num = Number.parseInt(h, 16)
  let r = (num >> 16) + percent
  let g = ((num >> 8) & 0x00ff) + percent
  let b = (num & 0x0000ff) + percent
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0')
}

export function hexWithAlpha(hex, alpha) {
  const h = hex.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(194,184,145,${alpha})`
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function parseHexColor(hexStr) {
  if (!hexStr) return null
  const hex = hexStr.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

export function hexToRgbaString(hexStr, alpha = 255) {
  const rgb = parseHexColor(hexStr)
  return rgb ? `${rgb.r},${rgb.g},${rgb.b},${alpha}` : hexStr
}

export function sanitizeFilenameBase(name, fallback) {
  let s = String(name)
  s = s.trim()
  s = s.replaceAll(/[\\/:*?"<>|]+/g, '-')
  s = s.replaceAll(/\s+/g, '-')
  if (s) return s
  return fallback ?? 'vellaris-map'
}

export async function readResponseBytesWithProgress(res, onDownloadingStarted) {
  const reader = res.body?.getReader?.()
  onDownloadingStarted?.()

  if (!reader) {
    return new Uint8Array(await res.arrayBuffer())
  }

  let loaded = 0
  const chunks = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      loaded += value.length
    }
  }

  const merged = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

export function findTitle(parsed) {
  if (!parsed?.edits) return null
  let textList = null
  if (Array.isArray(parsed.edits.textEdits)) textList = parsed.edits.textEdits
  else if (Array.isArray(parsed.edits.text)) textList = parsed.edits.text
  if (!Array.isArray(textList)) return null
  for (const t of textList) {
    const tType = t?.type || t?.typeName || t?.Type
    const tText = t?.text || t?.value || t?.Text
    if (tType === 'Title' && typeof tText === 'string' && tText.trim()) return tText.trim()
  }
  return null
}

export function deriveNortFilenameFromContent(nortContent) {
  let parsed = null
  if (typeof nortContent === 'string') {
    try { parsed = JSON.parse(nortContent) } catch (e) { parsed = null }
  } else parsed = nortContent
  if (!parsed?.edits) return null
  let textList = null
  if (Array.isArray(parsed.edits?.textEdits)) textList = parsed.edits.textEdits
  else if (Array.isArray(parsed.edits?.text)) textList = parsed.edits.text
  if (!Array.isArray(textList)) return null
  for (const t of textList) {
    const tType = t?.type || t?.typeName || t?.Type
    const tText = t?.text || t?.value || t?.Text
    if (tType === 'Title' && typeof tText === 'string' && tText.trim()) return tText.trim()
  }
  return null
}

export function makeProgressToastController() {
  let progressToastId = null
  const show = (message) => {
    try {
      if (progressToastId) globalThis.hideToast?.(progressToastId)
      progressToastId =
        globalThis.showToast?.(message, {
          type: 'info',
          duration: 0,
          dismissible: false,
          working: true,
        }) ?? null
    } catch (e) {
      console.warn('showToast failed', e)
    }
  }
  const hide = () => {
    try {
      if (progressToastId) globalThis.hideToast?.(progressToastId)
    } catch (e) {
      console.warn('hideToast failed', e)
    }
  }
  return { show, hide }
}
