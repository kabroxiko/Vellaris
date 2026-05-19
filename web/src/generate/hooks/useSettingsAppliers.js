import { useMemo, useRef, useEffect } from 'react'
import { createSettingsAppliers } from '../settingsAppliers'

export default function useSettingsAppliers(setters, customizeValues, deps = []) {
  const appliers = useMemo(() => createSettingsAppliers(setters, customizeValues), deps)
  const appliersRef = useRef(appliers)
  useEffect(() => {
    appliersRef.current = appliers
  }, [appliers])
  return { appliers, appliersRef }
}
