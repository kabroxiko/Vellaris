import { useEffect } from 'react'
import { schedulePreviewFetch } from '../previewPoller'

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

    const cleanup = schedulePreviewFetch({
      previewFields,
      textures,
      currentSource,
      setPreviewFromBlob,
      delay: 100,
    })

    return () => {
      cleanup()
    }
  }, [
    previewTriggerKey,
    currentSource?.nortContent,
    currentSource?.payload,
    currentSource?.type,
    // intentionally not including setPreviewFromBlob/clearPreview
  ])
}
