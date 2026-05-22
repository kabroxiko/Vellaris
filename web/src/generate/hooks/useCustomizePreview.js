import { useEffect, useRef, useState, useMemo } from 'react'
import { composeMiniIslandFromBlobModule } from '../CustomizePreviewHelpers'
import { schedulePreviewFetch } from '../previewPoller'
import { computePreviewTriggerKey, PREVIEW_TRIGGER_KEYS } from '../previewHelpers'

export default function useCustomizePreview({ previewFields, textures, currentSource }) {
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState(null)
  const [previewRefreshNonce, setPreviewRefreshNonce] = useState(0)
  const lastBaseBlobRef = useRef(null)

  const previewTriggerKey = useMemo(
    () => computePreviewTriggerKey(previewFields),
    PREVIEW_TRIGGER_KEYS.map((k) => previewFields?.[k])
  )

  const triggerPreviewRefresh = () => setPreviewRefreshNonce((n) => n + 1)

  async function setPreviewFromBlob(blob) {
    lastBaseBlobRef.current = blob
    if (typeof createImageBitmap !== 'function') {
      const url = URL.createObjectURL(blob)
      setBackgroundPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return url
      })
      return
    }
    const processedBlob = await composeMiniIslandFromBlobModule(blob, {}, previewFields)
    const url = URL.createObjectURL(processedBlob || blob)
    setBackgroundPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return url
    })
  }

  async function recomposeUsingLastBase(opts) {
    if (!lastBaseBlobRef.current) return
    if (typeof createImageBitmap !== 'function') {
      const url = URL.createObjectURL(lastBaseBlobRef.current)
      setBackgroundPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return url
      })
      return
    }
    const processed = await composeMiniIslandFromBlobModule(
      lastBaseBlobRef.current,
      opts,
      previewFields
    )
    const url = URL.createObjectURL(processed || lastBaseBlobRef.current)
    setBackgroundPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return url
    })
  }

  function clearPreview() {
    setBackgroundPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return null
    })
  }

  useEffect(() => {
    // If there is no customization source available, there's nothing to preview.
    const hasCustomizationSource = Boolean(currentSource?.nortContent)
    const hasRandomPayloadSource = Boolean(
      currentSource?.type === 'random' && currentSource?.payload
    )
    if (!hasCustomizationSource && !hasRandomPayloadSource) {
      setBackgroundPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return null
      })
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
    previewRefreshNonce,
  ])

  useEffect(() => {
    return () => {
      setBackgroundPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return null
      })
    }
  }, [])

  return {
    backgroundPreviewUrl,
    setPreviewFromBlob,
    recomposeUsingLastBase,
    triggerPreviewRefresh,
    lastBaseBlobRef,
    clearPreview,
  }
}
