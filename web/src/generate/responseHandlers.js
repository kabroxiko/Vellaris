import { base64ToBlob } from './utils'
import {
  requestWantsNortContent,
  cloneRequestWithoutNortContent,
  buildLegacyCompatibleRequest,
  buildSanitizedNortContentRequest,
} from './requestHelpers'

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
  const filename = `${baseName || 'generated-settings'}.nort`
  const blob = new Blob([nortContent], { type: 'application/json;charset=utf-8' })
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
    setCurrentSource(source)
  }
  try {
    globalThis.showToast?.('Map generated', { type: 'success', duration: 3000 })
  } catch (e) {
    console.warn('showToast failed', e)
  }
}

export async function retryWithCompatibilityFallbacks(
  res,
  requestOptions,
  outputMode,
  showProgressToast,
  apiBase
) {
  if (outputMode === 'nort-only') return res
  if (!res.ok && res.status >= 500 && requestWantsNortContent(requestOptions)) {
    const fallbackRequestOptions = cloneRequestWithoutNortContent(requestOptions)
    if (fallbackRequestOptions) {
      console.warn(
        'Primary /generate failed with returnNortContent; retrying without it for compatibility.'
      )
      showProgressToast('Retrying generation with compatibility mode...')
      res = await fetch(`${apiBase}/generate`, fallbackRequestOptions)
    }
  }
  if (!res.ok && res.status >= 500) {
    const legacyRequestOptions = buildLegacyCompatibleRequest(requestOptions)
    if (legacyRequestOptions) {
      console.warn('Compatibility retry: using legacy-safe /generate request.')
      showProgressToast('Retrying generation with legacy compatibility...')
      res = await fetch(`${apiBase}/generate`, legacyRequestOptions)
    }
  }
  if (!res.ok && res.status >= 500) {
    const sanitizedNortRequestOptions = buildSanitizedNortContentRequest(requestOptions)
    if (sanitizedNortRequestOptions) {
      console.warn('Compatibility retry: sanitizing custom image references in nortContent.')
      showProgressToast('Retrying generation after sanitizing settings...')
      res = await fetch(`${apiBase}/generate`, sanitizedNortRequestOptions)
    }
  }
  return res
}

export async function processGenerateResponse(bytes, contentType, options) {
  const { outputMode, baseName, source, fileName, setPreview, setCurrentSource } = options
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
  const data = JSON.parse(new TextDecoder('utf-8').decode(bytes))
  if (outputMode !== 'nort-only') {
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
  if (!data.nortContent) throw new Error('Server did not return settings content for download.')
  downloadNortContent(data.nortContent, baseName)
  setCurrentSource({
    type: 'nort-content',
    name: source?.name || fileName || 'Generated settings',
    nortContent: data.nortContent,
  })
  globalThis.showToast?.('Settings file downloaded', { type: 'success', duration: 3000 })
}
