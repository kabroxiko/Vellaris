import { describe, it, expect } from 'vitest'
import { createSettingsAppliers } from '../generate/settingsAppliers'

describe('createSettingsAppliers scale inverses', () => {
  it('applies inverse slider values for mountain and tree scales', () => {
    // Ensure crypto utilities exist in the test environment used by Vitest
    if (globalThis.crypto === undefined) {
      globalThis.crypto = { getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = i + 1 } }
    }

    const setters = {}
    setters.setMountainSize = (v) => { setters._mountainSize = v }
    setters.setTreeHeight = (v) => { setters._treeHeight = v }

    const appliers = createSettingsAppliers(setters, {})

    // mountainScale 1 should map to slider value 5 (per inverseGetSliderFromScale)
    // treeHeightScale 0.25 should map to slider value 3 (inverseGetTreeHeightSliderFromScale)
    appliers.applyRoadAndScaleSettings({ mountainScale: 1, treeHeightScale: 0.25 })

    expect(setters._mountainSize).toBe(5)
    expect(setters._treeHeight).toBe(3)
  })
})
