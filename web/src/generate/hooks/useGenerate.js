import { useCallback } from 'react'
import { makeProgressToastController, readResponseBytesWithProgress } from '../sharedHelpers'

// use shared makeProgressToastController from sharedHelpers

export default function useGenerate({
  apiBase,
  handleResponseError,
  base64ToBlob,
  downloadNortContent,
  tryParse,
  serializeNortObject,
  handleSuccessRef,
  setError,
  setLoading,
}) {
  // use shared readResponseBytesWithProgress from sharedHelpers

  const processGenerateResponse = useCallback(
    async (bytes, contentType, outputMode, baseName, source) => {
      if (!contentType.includes('application/json')) {
        if (outputMode === 'nort-only')
          throw new Error('Server returned image bytes; expected settings content.')
        handleSuccessRef.current?.(
          new Blob([bytes], { type: contentType || 'image/png' }),
          baseName,
          source
        )
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
        handleSuccessRef.current?.(
          base64ToBlob(imageBase64, 'image/png'),
          baseName,
          source,
          nortContent
        )
        return
      }
      const copy = { ...data }
      delete copy.imageBase64
      const nortContent = serializeNortObject(copy)
      const parsed = tryParse(nortContent)
      if (parsed) {
        // caller may manage merged settings
      }
      downloadNortContent(nortContent, baseName)
      handleSuccessRef.current?.(null, baseName, source, nortContent)
      globalThis.showToast?.('ui.toast.settingsDownloaded', { type: 'success', duration: 3000 })
    },
    [base64ToBlob, downloadNortContent, serializeNortObject, tryParse, handleSuccessRef]
  )

  const runGenerate = useCallback(
    async (requestOptions, baseName, source, outputMode = 'preview', externalToast = null) => {
      setError(null)
      setLoading(true)
      const toast = externalToast ?? makeProgressToastController()
      try {
        if (!externalToast)
          toast.show(outputMode === 'nort-only' ? 'ui.preparingSettings' : 'ui.generating')
        const body = requestOptions.body
        if (
          outputMode === 'nort-only' &&
          body &&
          typeof FormData !== 'undefined' &&
          body instanceof FormData
        ) {
          body.append('returnSettings', 'true')
        }

        let res = await fetch(`${apiBase}/generate`, requestOptions)
        if (!res.ok) await handleResponseError(res)
        const contentType = res.headers.get('content-type') || ''
        const bytes = await readResponseBytesWithProgress(res, () => {
          toast.show(outputMode === 'nort-only' ? 'ui.toast.downloadingSettings' : 'ui.toast.downloadingMap')
        })
        await processGenerateResponse(bytes, contentType, outputMode, baseName, source)
      } catch (err) {
        setError(err.message)
        try {
          globalThis.showToast?.({ key: 'ui.toast.error', params: { msg: err.message } }, { type: 'error', duration: 6000 })
        } catch (e) {
          console.warn('showToast failed', e)
        }
      } finally {
        setLoading(false)
        if (!externalToast) toast.hide()
      }
    },
    [
      apiBase,
      handleResponseError,
      readResponseBytesWithProgress,
      processGenerateResponse,
      setError,
      setLoading,
    ]
  )

  return runGenerate
}
