import { useEffect, useRef, useState, useMemo } from 'react'
import {
  fetchPreviewBlob,
  composeMiniIslandFromBlobModule,
  buildPreviewPayload,
} from '../CustomizePreviewHelpers'

export default function useCustomizePreview({ previewFields, textures, currentSource }) {
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState(null)
  const [previewRefreshNonce, setPreviewRefreshNonce] = useState(0)
  const lastBaseBlobRef = useRef(null)

  const previewTriggerKey = useMemo(() => {
    const { colorizeLand, colorizeOcean, landColorHex, oceanColorHex, ...rest } =
      previewFields || {}
    return JSON.stringify(rest)
  }, [
    previewFields?.backgroundType,
    previewFields?.textureRef,
    previewFields?.backgroundSeed,
    previewFields?.randomSeed,
    previewFields?.finalWidth,
    previewFields?.finalHeight,
    previewFields?.drawBorder,
    previewFields?.drawGridOverlay,
    previewFields?.gridOverlayShape,
    previewFields?.gridOverlayRowOrColCount,
    previewFields?.gridOverlayColorHex,
    previewFields?.gridOverlayXOffset,
    previewFields?.gridOverlayYOffset,
    previewFields?.gridOverlayLineWidth,
    previewFields?.borderRef,
    previewFields?.borderWidth,
    previewFields?.borderPosition,
    previewFields?.borderColorOption,
    previewFields?.borderColorHex,
    previewFields?.frayedBorder,
    previewFields?.frayedBorderBlurLevel,
    previewFields?.frayedBorderSize,
    previewFields?.frayedBorderSeed,
    previewFields?.frayedBorderColorHex,
    previewFields?.roadStyle,
    previewFields?.roadWidth,
    previewFields?.roadColorHex,
    previewFields?.mountainSize,
    previewFields?.hillSize,
    previewFields?.duneSize,
    previewFields?.treeHeight,
    previewFields?.citySize,
  ])

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
