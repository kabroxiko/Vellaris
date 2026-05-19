import { useCallback } from 'react'

export default function useNortBuilder(opts) {
  const {
    mergedSettingsRef,
    currentSource,
    tryParse,
    serializeNortObject,
    mergeUiIntoParsed,
    updateSettingsWithDimensions: externalUpdateDims,
    preview,
    mapLanguage,
  } = opts

  const parseNortSettings = useCallback(
    (explicitNortContent) => {
      if (explicitNortContent) return tryParse(explicitNortContent)
      if (mergedSettingsRef?.current) {
        if (typeof structuredClone === 'function') return structuredClone(mergedSettingsRef.current)
        const str = JSON.stringify(mergedSettingsRef.current)
        const parsed = tryParse(str)
        return parsed ?? mergedSettingsRef.current
      }
      return tryParse(currentSource?.nortContent)
    },
    [mergedSettingsRef, currentSource, tryParse]
  )

  const cloneMergedSettings = useCallback(() => {
    if (!mergedSettingsRef?.current) return null
    if (typeof structuredClone === 'function') return structuredClone(mergedSettingsRef.current)
    const str = JSON.stringify(mergedSettingsRef.current)
    const parsed = tryParse(str)
    return parsed ?? mergedSettingsRef.current
  }, [mergedSettingsRef, tryParse])

  const updateSettingsWithDimensions = useCallback(
    (parsedSettings, finalWidth, finalHeight, finalSeed) => {
      if (externalUpdateDims) return externalUpdateDims(parsedSettings)
      if (finalWidth) parsedSettings.generatedWidth = Number(finalWidth)
      if (finalHeight) parsedSettings.generatedHeight = Number(finalHeight)
      if (finalSeed) parsedSettings.randomSeed = Number(finalSeed)
    },
    [externalUpdateDims]
  )

  const buildNortContentRequest = useCallback(
    ({ explicitNortContent = null } = {}) => {
      const parsedSettings = parseNortSettings(explicitNortContent)
      if (!parsedSettings) throw new Error('Current settings are not valid JSON.')

      // Merge UI values into parsed settings using provided applier
      mergeUiIntoParsed(parsedSettings, opts)

      updateSettingsWithDimensions(parsedSettings, opts.finalWidth, opts.finalHeight, opts.finalSeed)

      if (mapLanguage) parsedSettings.language = mapLanguage
      serializeNortObject(parsedSettings)

      return {
        requestOptions: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedSettings),
        },
        baseName: (preview?.filename ?? 'generated-map.png').replace(/\.png$/, ''),
        source: {
            type: currentSource.type,
            name: currentSource.name,
            nortContent: currentSource.nortContent,
          },
      }
    },
    [parseNortSettings, mergeUiIntoParsed, updateSettingsWithDimensions, serializeNortObject, preview, currentSource, mapLanguage, opts]
  )

  return { buildNortContentRequest, parseNortSettings, cloneMergedSettings, updateSettingsWithDimensions }
}
