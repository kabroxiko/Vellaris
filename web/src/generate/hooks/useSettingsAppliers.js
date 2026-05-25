import { useMemo, useRef, useEffect } from 'react'
import { createSettingsAppliers } from '../settingsAppliers'

export default function useSettingsAppliers(setters, customizeValues, deps = [], options = {}) {
  const optionsKey = JSON.stringify(options || {})
  const appliers = useMemo(
    () => createSettingsAppliers(setters, customizeValues, options),
    [...deps, optionsKey]
  )
  const appliersRef = useRef(appliers)
  useEffect(() => {
    appliersRef.current = appliers
  }, [appliers])
  return { appliers, appliersRef }
}
