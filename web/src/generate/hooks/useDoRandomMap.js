import { useCallback } from 'react'
import { makeProgressToastController } from '../sharedHelpers'

export default function useDoRandomMap({ buildRandomCfg, fetchResolvedNort, applyReturnedSettingsToUi, generateFromNortContent, uiI18n, runGenerate }) {
  const doRandomMap = useCallback(
    async (toast = null) => {
      const localToast = toast ?? makeProgressToastController()
      try {
        localToast.show('ui.preparing')
        const cfg = buildRandomCfg()
        const nortContent = await fetchResolvedNort(cfg)
        applyReturnedSettingsToUi(nortContent)
        await generateFromNortContent(nortContent, localToast)
      } finally {
        // caller will hide toast if it created one
      }
    },
    [buildRandomCfg, fetchResolvedNort, applyReturnedSettingsToUi, generateFromNortContent, uiI18n, runGenerate]
  )

  return { doRandomMap }
}
