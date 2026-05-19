import { useEffect } from 'react'

export default function useApplyMergedSettings({
  currentSource,
  tryParse,
  appliersRef,
  mergedSettingsRef,
  lastApplierRunRef,
}) {
  useEffect(() => {
    if (!currentSource?.nortContent) return

    const settings = tryParse(currentSource.nortContent)
    if (!settings) {
      globalThis.showToast?.('ui.toast.invalidSettingsJson', {
        type: 'warning',
        duration: 6000,
      })
      return
    }

    settings.__applierSource = 'currentSource'

    const ap = appliersRef?.current
    if (!ap) return

    ap.applyMapSizeAndSeedSettings(settings)
    ap.applyBackgroundTypeSettings(settings)
    ap.applyColorAndBoundarySettings(settings)
    ap.applyBorderSettings(settings)
    ap.applyFrayedBorderSettings(settings)
    ap.applyCoastlineSettings(settings)
    ap.applyOceanSettings(settings)
    ap.applyRoadAndScaleSettings(settings)
    ap.applyTextSettings(settings)

    if (lastApplierRunRef) lastApplierRunRef.current = Date.now()
  }, [
    currentSource?.nortContent,
    currentSource?.originType,
    tryParse,
    appliersRef,
    mergedSettingsRef,
    lastApplierRunRef,
  ])
}
