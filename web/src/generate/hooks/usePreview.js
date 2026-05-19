import { useState, useCallback, useEffect } from 'react'
import { deriveNortFilenameFromContent, sanitizeFilenameBase } from '../sharedHelpers'
import { tryParseJson as tryParse } from '../helpers'

export default function usePreview({ mergedSettingsRef, setCurrentSource, setHasGeneratedOnce, setCustomizationDirty, setFileName, labels }) {
  const [preview, setPreview] = useState(null)

  const handleSuccess = useCallback(
    (blob, baseName, source, nortContent) => {
      const url = URL.createObjectURL(blob)
      setPreview((previous) => {
        if (previous?.url) URL.revokeObjectURL(previous.url)
        let filenameBase = baseName
        if (nortContent) {
          const derived = deriveNortFilenameFromContent(nortContent)
          if (derived) filenameBase = derived
        }
        const filename = `${sanitizeFilenameBase(filenameBase, 'vellaris-map')}.png`
        return {
          url,
          filename,
          sourceLabel:
            source?.type === 'random'
              ? 'Random Map'
              : (source?.name ?? 'Generated from Settings'),
        }
      })

      if (nortContent) {
        setCurrentSource({
          type: 'nort-content',
          name: source?.name ?? 'Generated settings',
          nortContent,
          originType: source?.type,
        })
        const parsed = tryParse(nortContent)
        if (parsed) mergedSettingsRef.current = parsed
      } else if (source) {
        setCurrentSource((prev) => {
          if (source?.type === 'random' && prev?.nortContent) return prev
          if (source?.nortContent && prev?.nortContent) return prev
          return source
        })
      }

      // Use i18n label when available
      const genMsg = (labels && labels['ui.map.generated']) || 'Map generated'
      globalThis.showToast?.(genMsg, { type: 'success', duration: 3000 })
      setHasGeneratedOnce(true)
      setCustomizationDirty(false)
    },
    [mergedSettingsRef, setCurrentSource, setHasGeneratedOnce, setCustomizationDirty]
  )

  const openPreviewModal = useCallback(() => {
    if (!preview?.url) return
    globalThis.openModal?.(preview.url, preview.filename)
  }, [preview])

  const handleDownloadMap = useCallback(() => {
    if (!preview?.url) return
    const anchor = document.createElement('a')
    anchor.href = preview.url
    anchor.download = preview.filename ?? 'vellaris-map.png'
    document.body.appendChild(anchor)
    anchor.click()
    // Notify user that download started (success = green bordered) using i18n when available
    const dlMsg = (labels && labels['ui.button.downloadMap']) || 'Map download started'
    globalThis.showToast?.(dlMsg, { type: 'success', duration: 2000 })
    anchor.remove()
  }, [preview])

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  return { preview, handleSuccess, openPreviewModal, handleDownloadMap }
}
