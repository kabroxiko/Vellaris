import { createSettingsAppliers } from './settingsAppliers'
import { describe, it, expect, vi } from 'vitest'

describe('createSettingsAppliers', () => {
  it('applyMapSizeAndSeedSettings calls numeric and seed setters', () => {
    const setters = {
      setFinalWidth: vi.fn(),
      setFinalHeight: vi.fn(),
      setFinalSeed: vi.fn(),
      setRandomSeed: vi.fn(),
      setArtPack: vi.fn(),
      setLandShape: vi.fn(),
      setRegionCount: vi.fn(),
      setWorldSize: vi.fn(),
      setCityIconType: vi.fn(),
      setSelectedBooks: vi.fn(),
      setDimension: vi.fn(),
    }
    const appliers = createSettingsAppliers(setters, {})
    appliers.applyMapSizeAndSeedSettings({
      generatedWidth: '300',
      generatedHeight: '200',
      randomSeed: 7,
      artPack: 'packA',
      landShape: null,
      regionCount: '5',
      worldSize: '2',
      cityIconSetName: 'icons',
      books: ['b1', 'b2'],
    })

    expect(setters.setFinalWidth).toHaveBeenCalledWith(300)
    expect(setters.setFinalHeight).toHaveBeenCalledWith(200)
    expect(setters.setFinalSeed).toHaveBeenCalledWith('7')
    expect(setters.setRandomSeed).toHaveBeenCalledWith('7')
    expect(setters.setArtPack).toHaveBeenCalledWith('packA')
    expect(setters.setRegionCount).toHaveBeenCalledWith(5)
    expect(setters.setWorldSize).toHaveBeenCalledWith(2)
    expect(setters.setCityIconType).toHaveBeenCalledWith('icons')
    expect(setters.setSelectedBooks).toHaveBeenCalled()
    expect(setters.setDimension).toHaveBeenCalled()
  })

  it('does not call setters when currentValues match', () => {
    const setters = { setFinalWidth: vi.fn() }
    const current = { finalWidth: 400 }
    const appliers = createSettingsAppliers(setters, current)
    appliers.applyMapSizeAndSeedSettings({ generatedWidth: 400 })
    expect(setters.setFinalWidth).not.toHaveBeenCalled()
  })
})
import { createSettingsAppliers } from './settingsAppliers.js'

describe('settingsAppliers module', () => {
  it('applyMapSizeAndSeedSettings invokes setters with normalized values', () => {
    const state = {}
    const setters = {
      setFinalWidth: (v) => (state.finalWidth = v),
      setFinalHeight: (v) => (state.finalHeight = v),
      setFinalSeed: (v) => (state.finalSeed = v),
      setRandomSeed: (v) => (state.randomSeed = v),
      setArtPack: (v) => (state.artPack = v),
      setLandShape: (v) => (state.landShape = v),
      setRegionCount: (v) => (state.regionCount = v),
      setWorldSize: (v) => (state.worldSize = v),
      setCityIconType: (v) => (state.cityIconType = v),
      setSelectedBooks: (v) => (state.selectedBooks = v),
      setDimension: (v) => (state.dimension = v),
    }

    const appliers = createSettingsAppliers(setters, {})
    appliers.applyMapSizeAndSeedSettings({
      generatedWidth: '100',
      generatedHeight: 200,
      randomSeed: 'seed-xyz',
      artPack: 'apack',
      worldSize: '2',
      regionCount: '5',
      books: ['b1', 'b2'],
      generatedWidth: 100,
      generatedHeight: 200,
    })

    expect(state.finalWidth).toBe(100)
    expect(state.finalHeight).toBe(200)
    expect(state.finalSeed).toBeTruthy()
    expect(state.randomSeed).toBeTruthy()
    expect(state.artPack).toBe('apack')
    expect(state.worldSize).toBe(2)
    expect(state.regionCount).toBe(5)
    expect(state.selectedBooks instanceof Set).toBeTruthy()
    expect(state.dimension).toBeDefined()
  })
})
