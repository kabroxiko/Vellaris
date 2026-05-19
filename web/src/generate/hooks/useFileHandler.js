import { useCallback } from 'react'

export default function useFileHandler({
  requestLanguage,
  runGenerate,
  setFileName,
  setFileObj,
  setCurrentSource,
  tryParse,
}) {
  const handleFile = useCallback(
    (f) => {
      if (!f) return
      setFileName(f.name)
      setFileObj(f)
      setCurrentSource({ type: 'nort', name: f.name })
      f.text()
        .then(async (text) => {
          const source = { type: 'nort-content', name: f.name, nortContent: text }
          setCurrentSource(source)

          let parsedSettings = tryParse(text)
          if (!parsedSettings) throw new Error('Loaded settings file is not valid JSON.')
          // Preserve parsed settings on the caller side by assigning to mergedSettingsRef there
          // Caller should update merged settings ref if desired.
          // Immediately request generation so UI shows preview quickly.
          const parsed = parsedSettings
          await runGenerate(
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsed),
            },
            f.name.replace(/\.[^.]+$/, ''),
            source
          )
        })
        .catch((e) => {
          if (typeof console !== 'undefined' && typeof console.debug === 'function')
            console.debug('GenerateForm: file read failed', e)
        })
    },
    [requestLanguage, runGenerate, setFileName, setFileObj, setCurrentSource, tryParse]
  )

  const handleFileInput = useCallback(
    (e) => {
      handleFile(e.target.files?.[0])
    },
    [handleFile]
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      const f = e.dataTransfer.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  return { handleFile, handleFileInput, onDrop }
}
