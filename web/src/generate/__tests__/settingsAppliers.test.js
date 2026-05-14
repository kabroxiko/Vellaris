import { describe, it, expect } from 'vitest'
import { createSettingsAppliers } from '../settingsAppliers.js'

describe('settingsAppliers - scale and map settings', () => {
  it('maps mountainScale to slider via inverseGetSliderFromScale', () => {
    const captured = {}
    const setters = {
      setMountainSize: (v) => (captured.mountainSize = v),
      setTreeHeight: (v) => (captured.treeHeight = v),
    }
    const appliers = createSettingsAppliers(setters, {})
    appliers.applyRoadAndScaleSettings({ mountainScale: 1, treeHeightScale: 0.6 })
    // mountainScale 1 -> slider 5 per implementation
    expect(captured.mountainSize).toBe(5)
    // treeHeightScale 0.6 -> (0.6-0.1)/0.05 = 10
    expect(captured.treeHeight).toBe(10)
  })

  it('applies map size, seed and dimension settings', () => {
    const captured = {}
    const setters = {
      setFinalWidth: (v) => (captured.finalWidth = v),
      setFinalHeight: (v) => (captured.finalHeight = v),
      setFinalSeed: (v) => (captured.finalSeed = v),
      setRandomSeed: (v) => (captured.randomSeed = v),
      setDimension: (v) => (captured.dimension = v),
    }
    const appliers = createSettingsAppliers(setters, {})
    appliers.applyMapSizeAndSeedSettings({ generatedWidth: 4096, generatedHeight: 4096, randomSeed: 42 })
    expect(captured.finalWidth).toBe(4096)
    expect(captured.finalHeight).toBe(4096)
    expect(captured.finalSeed).toBe('42')
    expect(captured.randomSeed).toBe('42')
    expect(captured.dimension).toBe('Square')
  })
})
