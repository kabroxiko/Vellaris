import { useCallback, useRef, useState } from 'react'
import { loadRandomOverrides } from '../GenerateForm.helpers'

const RANDOM_OVERRIDES_STORAGE_KEY = 'vellaris-random-manual-overrides'

export default function useRandomSettings(initialOverrides) {
  const initial = initialOverrides ?? loadRandomOverrides()
  const [randomOverrides, setRandomOverrides] = useState(initial)
  const booksLoadedRef = useRef(false)

  // Do not persist manual overrides to localStorage — they should be
  // ephemeral and not survive a full page reload. Persistence code removed.

  const updateRandomOverride = useCallback((key, value) => {
    setRandomOverrides((previous) => {
      const next = { ...previous }
      if (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete next[key]
      } else {
        next[key] = value
      }
      // Persist `mapLanguage` across page reloads only.
      try {
        if (key === 'mapLanguage') {
          if (value === null || value === undefined || value === '') {
            localStorage.removeItem('vellaris-map-language')
          } else {
            // Persist as a plain string to simplify retrieval (avoid JSON.parse)
            localStorage.setItem('vellaris-map-language', String(value))
          }
        }
      } catch (e) {
        // Log storage errors so they are visible during development and in CI
        // while avoiding a hard failure for non-persistent environments.
        // eslint-disable-next-line no-console
        console.warn('useRandomSettings: failed to access localStorage for mapLanguage', e)
      }
      return next
    })
  }, [])

  // helper factory used by the form to create handlers that both update
  // the local state and persist manual overrides
  const makeRandomHandler = (setter, key) => (value) => {
    setter(value)
    updateRandomOverride(key, value)
  }

  const handleSelectedBooksChange = useCallback(
    (booksSet, setter) => {
      setter(booksSet)
      if (!booksLoadedRef.current) return
      updateRandomOverride('selectedBooks', Array.from(booksSet))
    },
    [updateRandomOverride]
  )

  return {
    randomOverrides,
    setRandomOverrides,
    updateRandomOverride,
    makeRandomHandler,
    booksLoadedRef,
    handleSelectedBooksChange,
  }
}
