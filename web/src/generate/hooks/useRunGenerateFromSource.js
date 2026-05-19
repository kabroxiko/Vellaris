import { useCallback } from 'react'

export default function useRunGenerateFromSource({ fileObj, currentSource, buildNortContentRequest, runGenerate, setError, setLoading }) {
  const runGenerateFromCurrentSource = useCallback(
    async (requestBehavior = null, outputMode = 'preview') => {
      const effectiveRequestBehavior = requestBehavior ?? {}
      let result = null

      try {
        if (fileObj) {
          const text = await fileObj.text()
          result = buildNortContentRequest({ ...effectiveRequestBehavior, explicitNortContent: text })
        } else if (currentSource?.nortContent) {
          result = buildNortContentRequest(effectiveRequestBehavior)
        } else {
          return
        }
      } catch (err) {
        const message = err?.message ?? 'Failed to prepare map request.'
        setError(message)
        globalThis.showToast?.(message, { type: 'error', duration: 6000 })
        return
      }

      await runGenerate(result.requestOptions, result.baseName, result.source, outputMode)
    },
    [fileObj, currentSource, buildNortContentRequest, runGenerate, setError, setLoading]
  )

  return { runGenerateFromCurrentSource }
}
