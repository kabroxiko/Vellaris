import { describe, it, expect, vi } from 'vitest'
import { createSettingsAppliers } from '../settingsAppliers'

describe('createSettingsAppliers', () => {
  it('calls appropriate setters for map size and seeds', () => {
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
      generatedWidth: '100',
      generatedHeight: '200',
      randomSeed: 'seed123',
      artPack: 'packA',
      worldSize: '2',
      regionCount: '5',
      cityIconSetName: 'icons',
      books: ['a', 'b'],
    })

    expect(setters.setFinalWidth).toHaveBeenCalled()
    expect(setters.setFinalHeight).toHaveBeenCalled()
    expect(setters.setFinalSeed).toHaveBeenCalled()
    expect(setters.setRandomSeed).toHaveBeenCalled()
    expect(setters.setArtPack).toHaveBeenCalled()
    expect(setters.setWorldSize).toHaveBeenCalled()
    expect(setters.setRegionCount).toHaveBeenCalled()
    expect(setters.setCityIconType).toHaveBeenCalled()
    expect(setters.setSelectedBooks).toHaveBeenCalled()
    expect(setters.setDimension).toHaveBeenCalled()
  })
})
