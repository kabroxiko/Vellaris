import { useCallback } from 'react'

function makeProgressToastController() {
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

export default function useGenerate({ apiBase, handleResponseError, base64ToBlob, downloadNortContent, tryParse, serializeNortObject, handleSuccessRef, setError, setLoading }) {
  const readResponseBytesWithProgress = useCallback(async (res, onDownloadingStarted) => {
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
  }, [])

  const processGenerateResponse = useCallback(
    async (bytes, contentType, outputMode, baseName, source) => {
      if (!contentType.includes('application/json')) {
        if (outputMode === 'nort-only') throw new Error('Server returned image bytes; expected settings content.')
        handleSuccessRef.current?.(new Blob([bytes], { type: contentType || 'image/png' }), baseName, source)
        return
      }
      const decoded = new TextDecoder('utf-8').decode(bytes)
      const data = tryParse(decoded)
      if (!data || typeof data !== 'object') throw new Error('Invalid JSON response from server')
      if (outputMode !== 'nort-only') {
        const imageBase64 = data.imageBase64
        const copy = { ...data }
        delete copy.imageBase64
        const nortContent = serializeNortObject(copy)
        handleSuccessRef.current?.(base64ToBlob(imageBase64, 'image/png'), baseName, source, nortContent)
        return
      }
      const copy = { ...data }
      delete copy.imageBase64
      const nortContent = serializeNortObject(copy)
      try {
        const parsed = tryParse(nortContent)
        if (parsed) {
          // caller may manage merged settings
        }
      } catch (e) {
        // ignore
      }
      downloadNortContent(nortContent, baseName)
      handleSuccessRef.current?.(null, baseName, source, nortContent)
      globalThis.showToast?.('Settings file downloaded', { type: 'success', duration: 3000 })
    },
    [base64ToBlob, downloadNortContent, serializeNortObject, tryParse, handleSuccessRef]
  )

  const runGenerate = useCallback(
    async (requestOptions, baseName, source, outputMode = 'preview', externalToast = null) => {
      setError(null)
      setLoading(true)
      const toast = externalToast ?? makeProgressToastController()
      try {
        if (!externalToast) toast.show(outputMode === 'nort-only' ? 'Preparing settings...' : 'Generating map..')
        try {
          const body = requestOptions.body
          if (outputMode === 'nort-only' && body && typeof FormData !== 'undefined' && body instanceof FormData) {
            body.append('returnSettings', 'true')
          }
        } catch (e) {}

        let res = await fetch(`${apiBase}/generate`, requestOptions)
        if (!res.ok) await handleResponseError(res)
        const contentType = res.headers.get('content-type') || ''
        const bytes = await readResponseBytesWithProgress(res, () => {
          toast.show(outputMode === 'nort-only' ? 'Downloading settings...' : 'Downloading map...')
        })
        await processGenerateResponse(bytes, contentType, outputMode, baseName, source)
      } catch (err) {
        setError(err.message)
        try {
          globalThis.showToast?.(err.message, { type: 'error', duration: 6000 })
        } catch (e) {}
      } finally {
        setLoading(false)
        if (!externalToast) toast.hide()
      }
    },
    [apiBase, handleResponseError, readResponseBytesWithProgress, processGenerateResponse, setError, setLoading]
  )

  return runGenerate
}
