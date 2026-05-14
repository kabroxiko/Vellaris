import { describe, it, expect, vi } from 'vitest'
import { createSettingsAppliers } from '../settingsAppliers'

describe('settingsAppliers ocean/coast/frayed', () => {
  it('applyOceanSettings maps legacy oceanEffect to oceanWavesType and sets alpha/hex values', () => {
    const setters = {
      setOceanShadingLevel: vi.fn(),
      setOceanShadingAlpha: vi.fn(),
      setOceanShadingColorHex: vi.fn(),
      setOceanWavesType: vi.fn(),
      setOceanWavesLevel: vi.fn(),
      setOceanWavesAlpha: vi.fn(),
      setOceanWavesColorHex: vi.fn(),
      setDrawOceanEffectsInLakes: vi.fn(),
      setRiverColorHex: vi.fn(),
      setConcentricWaveCount: vi.fn(),
      setFadeConcentricWaves: vi.fn(),
      setJitterToConcentricWaves: vi.fn(),
      setBrokenLinesForConcentricWaves: vi.fn(),
    }
    const appliers = createSettingsAppliers(setters)

    const settings = {
      oceanEffect: 'legacy-wave',
      // use comma-separated RGBA where A is 0-255 so utils.parseColorChannels can parse
      oceanWavesColor: '17,34,51,64',
      oceanWavesLevel: 2,
      riverColor: '#445566',
      concentricWaveCount: 4,
      fadeConcentricWaves: true,
      jitterToConcentricWaves: false,
      brokenLinesForConcentricWaves: true,
    }

    appliers.applyOceanSettings(settings)

    expect(setters.setOceanWavesType).toHaveBeenCalledWith('legacy-wave')
    // rgba alpha 0.25 -> 25% opacity -> oceanWavesAlpha = 100 - 25 = 75
    expect(setters.setOceanWavesAlpha).toHaveBeenCalledWith(75)
    expect(setters.setOceanWavesLevel).toHaveBeenCalledWith(2)
    expect(setters.setOceanWavesColorHex).toHaveBeenCalledWith('#112233')
    expect(setters.setRiverColorHex).toHaveBeenCalledWith('#445566')
    expect(setters.setConcentricWaveCount).toHaveBeenCalledWith(4)
    expect(setters.setFadeConcentricWaves).toHaveBeenCalledWith(true)
    expect(setters.setJitterToConcentricWaves).toHaveBeenCalledWith(false)
    expect(setters.setBrokenLinesForConcentricWaves).toHaveBeenCalledWith(true)
  })

  it('applyCoastlineSettings applies coast shading color and inverted alpha', () => {
    const setters = {
      setLineStyle: vi.fn(),
      setCoastlineWidth: vi.fn(),
      setCoastlineColorHex: vi.fn(),
      setCoastShadingLevel: vi.fn(),
      setCoastShadingColorHex: vi.fn(),
      setCoastShadingAlpha: vi.fn(),
    }
    const appliers = createSettingsAppliers(setters)

    const settings = {
      coastlineColor: '#010203',
      // use comma RGBA; 102/255 ~= 0.4 -> 40%
      coastShadingColor: '255,0,0,102',
      coastShadingLevel: 3,
    }

    appliers.applyCoastlineSettings(settings)

    expect(setters.setCoastlineColorHex).toHaveBeenCalledWith('#010203')
    // coastShadingColor alpha 0.4 -> 40% -> stored as inverted (100-40)=60
    expect(setters.setCoastShadingAlpha).toHaveBeenCalledWith(60)
    expect(setters.setCoastShadingLevel).toHaveBeenCalledWith(3)
  })

  it('applyFrayedBorderSettings sets frayed border flag and color hex', () => {
    const setters = {
      setFrayedBorder: vi.fn(),
      setFrayedBorderBlurLevel: vi.fn(),
      setFrayedBorderSize: vi.fn(),
      setFrayedBorderSeed: vi.fn(),
      setDrawGrunge: vi.fn(),
      setGrungeWidth: vi.fn(),
      setFrayedBorderColorHex: vi.fn(),
    }
    const appliers = createSettingsAppliers(setters)

    const settings = {
      frayedBorder: true,
      frayedBorderBlurLevel: 2,
      frayedBorderSize: 5,
      frayedBorderSeed: 'seed42',
      drawGrunge: true,
      grungeWidth: 7,
      frayedBorderColor: '#ABCDEF',
    }

    appliers.applyFrayedBorderSettings(settings)

    expect(setters.setFrayedBorder).toHaveBeenCalledWith(true)
    expect(setters.setFrayedBorderBlurLevel).toHaveBeenCalledWith(2)
    expect(setters.setFrayedBorderSize).toHaveBeenCalledWith(5)
    expect(setters.setFrayedBorderSeed).toHaveBeenCalledWith('seed42')
    expect(setters.setDrawGrunge).toHaveBeenCalledWith(true)
    expect(setters.setGrungeWidth).toHaveBeenCalledWith(7)
    expect(setters.setFrayedBorderColorHex).toHaveBeenCalledWith('#abcdef')
  })
})
