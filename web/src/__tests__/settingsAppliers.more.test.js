import { describe, it, expect } from 'vitest'
import { createSettingsAppliers } from '../generate/settingsAppliers'

describe('settingsAppliers broader behavior', () => {
  it('applies map size, background and color/border settings', () => {
    const setters = {}
    const record = (k) => (v) => { setters['_'+k] = v }
    // mapping setters used by tested appliers
    setters.setFinalWidth = record('finalWidth')
    setters.setFinalHeight = record('finalHeight')
    setters.setFinalSeed = record('finalSeed')
    setters.setRandomSeed = record('randomSeed')
    setters.setTextureRef = record('textureRef')
    setters.setBackgroundType = record('backgroundType')
    setters.setBackgroundSeed = record('backgroundSeed')
    setters.setOceanColorHex = record('oceanColorHex')
    setters.setLandColorHex = record('landColorHex')
    setters.setRegionBoundaryColorHex = record('regionBoundaryColorHex')
    setters.setBorderRef = record('borderRef')
    setters.setBorderWidth = record('borderWidth')
    setters.setBorderPosition = record('borderPosition')
    setters.setBorderColorHex = record('borderColorHex')

    const appliers = createSettingsAppliers(setters, {})

    appliers.applyMapSizeAndSeedSettings({ generatedWidth: '800', generatedHeight: '600', randomSeed: 'seed123', artPack: 'ap', landShape: 'islands', regionCount: '5', worldSize: '2', cityIconSetName: 'iconset', books: ['a','b'] })
    expect(setters._finalWidth).toBe(800)
    expect(setters._finalHeight).toBe(600)
    expect(setters._finalSeed).toBe('seed123')

    appliers.applyBackgroundTypeSettings({ solidColorBackground: true, backgroundTextureResource: { artPack: 'p', name: 'n' }, backgroundRandomSeed: 'rs', drawRegionBoundaries: true, colorizeLand: false, colorizeOcean: true })
    expect(setters._backgroundType).toBe('SolidColor')
    expect(setters._textureRef).toBe('p|n')
    expect(setters._backgroundSeed).toBe('rs')

    appliers.applyColorAndBoundarySettings({ oceanColor: '#010203', landColor: '#0a0b0c', regionBoundaryColor: '#0f0f0f', drawBorder: true, drawGridOverlay: false, drawRegionColors: true })
    expect(setters._oceanColorHex).toBe('#010203')
    expect(setters._landColorHex).toBe('#0a0b0c')
    expect(setters._regionBoundaryColorHex).toBe('#0f0f0f')

    appliers.applyBorderSettings({ borderResource: { artPack: 'b', name: 'x' }, borderWidth: '3', borderPosition: 'inside', borderColor: '#020202' })
    expect(setters._borderRef).toBe('b|x')
    expect(setters._borderWidth).toBe(3)
    expect(setters._borderPosition).toBe('inside')
    expect(setters._borderColorHex).toBe('#020202')
  })
})
