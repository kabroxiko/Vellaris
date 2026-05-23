import { describe, it, expect, vi } from 'vitest'
import { createSettingsAppliers } from '../settingsAppliers'

describe('settingsAppliers ocean/coast/frayed', () => {
  it('applyOceanSettings maps legacy oceanEffect to oceanWavesType and sets alpha/hex values', () => {
    const setters = {
      setOceanShadingLevel: vi.fn(),
      setOceanShadingColor: vi.fn(),
      setOceanWavesType: vi.fn(),
      setOceanWavesLevel: vi.fn(),
      setOceanWavesColor: vi.fn(),
      setDrawOceanEffectsInLakes: vi.fn(),
      setRiverColor: vi.fn(),
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
    expect(setters.setOceanWavesLevel).toHaveBeenCalledWith(2)
    expect(setters.setOceanWavesColor).toHaveBeenCalledWith('#11223340')
    expect(setters.setRiverColor).toHaveBeenCalledWith('#445566ff')
    expect(setters.setConcentricWaveCount).toHaveBeenCalledWith(4)
    expect(setters.setFadeConcentricWaves).toHaveBeenCalledWith(true)
    expect(setters.setJitterToConcentricWaves).toHaveBeenCalledWith(false)
    expect(setters.setBrokenLinesForConcentricWaves).toHaveBeenCalledWith(true)
  })

  it('applyCoastlineSettings applies coast shading color and inverted alpha', () => {
    const setters = {
      setLineStyle: vi.fn(),
      setCoastlineWidth: vi.fn(),
      setCoastlineColor: vi.fn(),
      setCoastShadingLevel: vi.fn(),
      setCoastShadingColor: vi.fn(),
    }
    const appliers = createSettingsAppliers(setters)

    const settings = {
      coastlineColor: '#010203',
      // use comma RGBA; 102/255 ~= 0.4 -> 40%
      coastShadingColor: '255,0,0,102',
      coastShadingLevel: 3,
    }

    appliers.applyCoastlineSettings(settings)

    expect(setters.setCoastlineColor).toHaveBeenCalledWith('#010203')
    // coastShadingColor alpha 102 -> stored as combined #RRGGBBAA
    expect(setters.setCoastShadingColor).toHaveBeenCalledWith('#ff000066')
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
      setFrayedBorderColor: vi.fn(),
    }
    const appliers = createSettingsAppliers(setters)

    const settings = {
      frayedBorder: true,
      frayedBorderBlurLevel: 2,
      frayedBorderSize: 5,
      frayedBorderSeed: 'seed42',
      drawGrunge: true,
      grungeWidth: 7,
      frayedBorderColor: '#abcdef',
    }

    appliers.applyFrayedBorderSettings(settings)

    expect(setters.setFrayedBorder).toHaveBeenCalledWith(true)
    expect(setters.setFrayedBorderBlurLevel).toHaveBeenCalledWith(2)
    expect(setters.setFrayedBorderSize).toHaveBeenCalledWith(5)
    expect(setters.setFrayedBorderSeed).toHaveBeenCalledWith('seed42')
    expect(setters.setDrawGrunge).toHaveBeenCalledWith(true)
    expect(setters.setGrungeWidth).toHaveBeenCalledWith(7)
    expect(setters.setFrayedBorderColor).toHaveBeenCalledWith('#abcdef')
  })
})
