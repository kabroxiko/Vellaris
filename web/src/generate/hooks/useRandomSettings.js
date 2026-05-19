import { useCallback, useEffect, useRef, useState } from 'react'
import { loadRandomOverrides } from '../GenerateForm.helpers'

const RANDOM_OVERRIDES_STORAGE_KEY = 'vellaris-random-manual-overrides'

export default function useRandomSettings(initialOverrides) {
  const initial = initialOverrides ?? loadRandomOverrides()
  const [randomOverrides, setRandomOverrides] = useState(initial)
  const booksLoadedRef = useRef(false)

  useEffect(() => {
    try {
      globalThis?.localStorage?.setItem(
        RANDOM_OVERRIDES_STORAGE_KEY,
        JSON.stringify(randomOverrides)
      )
    } catch (e) {
      // Handle storage failures: quota exceeded, unavailable storage (e.g. private
      // browsing), or other DOMExceptions. Don't rethrow — persistence is best-effort.
      // Always log the failure so it can be observed in logs and during testing.
      // eslint-disable-next-line no-console
      console.warn('useRandomSettings: failed to persist overrides to localStorage', e)
    }
  }, [randomOverrides])

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
