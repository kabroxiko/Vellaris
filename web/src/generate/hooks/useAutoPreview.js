import { useEffect } from 'react'
import { buildPreviewPayload, fetchPreviewBlob } from '../CustomizePreviewHelpers'

export default function useAutoPreview(
  previewTriggerKey,
  previewFields,
  textures,
  currentSource,
  setPreviewFromBlob,
  clearPreview,
  hasCustomizationSource
) {
  useEffect(() => {
    const hasRandomPayloadSource = Boolean(
      currentSource?.type === 'random' && currentSource?.payload
    )

    if (typeof globalThis !== 'undefined' && globalThis.__prefetchedBackgroundPreviewBlob) {
      const blob = globalThis.__prefetchedBackgroundPreviewBlob
      delete globalThis.__prefetchedBackgroundPreviewBlob
      ;(async () => {
        await setPreviewFromBlob(blob)
      })()
      return
    }

    if (!hasCustomizationSource && !hasRandomPayloadSource) {
      clearPreview()
      return
    }

    const controller = new AbortController()
    let timerId = setTimeout(async () => {
      if (controller.signal.aborted) return
      const payload = buildPreviewPayload(previewFields, textures, currentSource)
      const blob = await fetchPreviewBlob(payload, controller)
      await setPreviewFromBlob(blob)
    }, 100)

    return () => {
      clearTimeout(timerId)
      controller.abort()
    }
  }, [
    previewTriggerKey,
    currentSource?.nortContent,
    currentSource?.payload,
    currentSource?.type,
    // intentionally not including setPreviewFromBlob/clearPreview
  ])
}
