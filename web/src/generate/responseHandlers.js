import { base64ToBlob } from './utils'

// Try to parse a .nort content string or return the object as-is.
// Moved to module scope to reduce nested function complexity (Sonar S7721).
function tryParse(content) {
  try {
    if (typeof content === 'string') {
      const t = content.trim()
      if (!t) return null
      if (!(t.startsWith('{') || t.startsWith('['))) return null
      return JSON.parse(t)
    }
    return content
  } catch (e) {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('tryParse: JSON parse failed', e)
    return null
  }
}

// Find a Title entry in a parsed .nort `edits` structure, if present.
function findTitle(parsed) {
  if (!parsed || !parsed.edits) return null
  const textList = Array.isArray(parsed.edits.textEdits)
    ? parsed.edits.textEdits
    : Array.isArray(parsed.edits.text)
    ? parsed.edits.text
    : null
  if (!Array.isArray(textList)) return null
  for (const t of textList) {
    const tType = t && (t.type || t.typeName || t.Type)
    const tText = t && (t.text || t.value || t.Text)
    if (tType === 'Title' && typeof tText === 'string' && tText.trim()) return tText.trim()
  }
  return null
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

export function downloadNortContent(nortContent, baseName) {
  // Helpers to keep complexity low

  let pretty = null
  let filenameBase = baseName || 'generated-settings'
  const parsed = tryParse(nortContent)
  if (parsed) {
    pretty = JSON.stringify(parsed, null, 2)
    if (!baseName) {
      const title = findTitle(parsed)
      if (title) filenameBase = title
      else {
        // treat as parse-failure for filename derivation so we fall back
        pretty = null
        if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('downloadNortContent: cannot derive title from edits')
      }
    }
  }

  if (pretty === null) {
    // ensure we still write something sensible
    pretty = typeof nortContent === 'string' ? nortContent : JSON.stringify(nortContent)
  }
  // sanitize filenameBase
  filenameBase = String(filenameBase).trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-') || 'generated-settings'
  const filename = `${filenameBase}.nort`
  const blob = new Blob([pretty], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function handleSuccess(blob, options) {
  const { baseName, source, fileName, setPreview, setCurrentSource, nortContent } = options
  const url = URL.createObjectURL(blob)
  setPreview((previous) => {
    if (previous?.url) {
      URL.revokeObjectURL(previous.url)
    }
    const filename = baseName ? `${baseName}.png` : 'vellaris-map.png'
    return {
      url,
      filename,
      sourceLabel:
        source?.type === 'random'
          ? 'Random Map'
          : source?.name || fileName || 'Generated from Settings',
    }
  })
  if (nortContent) {
    setCurrentSource({
      type: 'nort-content',
      name: source?.name || fileName || 'Generated settings',
      nortContent,
    })
  } else if (source) {
    // Preserve existing `nortContent` (e.g., resolved random settings)
    // when the source is a random-origin source to avoid disabling
    // the Customize panel after a generate completes.
    setCurrentSource((prev) => {
      try {
        if (source?.originType === 'random' && prev && prev.nortContent) return prev
      } catch (e) {
        if (typeof console !== 'undefined' && console.debug) console.debug('handleSuccess: preserve current source check failed', e)
      }
      return source
    })
  }
  try {
    globalThis.showToast?.('Map generated', { type: 'success', duration: 3000 })
  } catch (e) {
    console.warn('showToast failed', e)
  }
}

// Compatibility fallbacks removed: server and client should fail-fast on errors.

export async function processGenerateResponse(bytes, contentType, options) {
  const { outputMode, baseName, source, fileName, setPreview, setCurrentSource } = options

  // client log download removed

  try {
    if (!contentType.includes('application/json')) {
      if (outputMode === 'nort-only')
        throw new Error('Server returned image bytes; expected settings content.')
      handleSuccess(new Blob([bytes], { type: contentType || 'image/png' }), {
        baseName,
        source,
        fileName,
        setPreview,
        setCurrentSource,
      })
      return
    }
    const decoded = new TextDecoder('utf-8').decode(bytes)
    const data = tryParse(decoded)
    if (!data || typeof data !== 'object') throw new Error('Invalid JSON response from server')
    if (outputMode !== 'nort-only') {
      if (!data.imageBase64 || typeof data.imageBase64 !== 'string') throw new Error('Server did not return image data')
      handleSuccess(base64ToBlob(data.imageBase64, 'image/png'), {
        baseName,
        source,
        fileName,
        setPreview,
        setCurrentSource,
        nortContent: data.nortContent,
      })
      return
    }
    if (!data.nortContent || typeof data.nortContent !== 'string') throw new Error('Server did not return settings content for download.')
    try {
      downloadNortContent(data.nortContent, baseName)
    } catch (e) {
      try {
        globalThis.showToast?.(e.message || 'Failed to download settings', { type: 'error', duration: 5000 })
      } catch (err) {
        if (typeof console !== 'undefined' && console.debug) console.debug('processGenerateResponse: showToast failed', err)
      }
      throw e
    }
    setCurrentSource({
      type: 'nort-content',
      name: source?.name || fileName || 'Generated settings',
      nortContent: data.nortContent,
    })
    globalThis.showToast?.('Settings file downloaded', { type: 'success', duration: 3000 })
  } catch (e) {
    try {
      globalThis.showToast?.(e.message || 'Generate response processing failed', { type: 'error', duration: 5000 })
    } catch (err) {
      if (typeof console !== 'undefined' && console.debug) console.debug('processGenerateResponse: showToast failed', err)
    }
    throw e
  }
}
