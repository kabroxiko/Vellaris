import { describe, it, expect } from 'vitest'
import {
  applyCoastOceanAndWavesHoisted,
  applyTextAndBackgroundHoisted,
  applyBackgroundFlagsHoisted,
  applyResourcesAndTopLevelHoisted,
} from '../GenerateForm.appliers'

describe('GenerateForm coast/ocean, text/background, and resources appliers', () => {
  it('applyCoastOceanAndWavesHoisted sets expected ocean and coast fields', () => {
    const parsed = {}
    const ctx = {
      lineStyle: 'dashed',
      coastlineWidth: '3',
      coastlineColorHex: '#123456',
      coastShadingLevel: '10',
      coastShadingColorHex: '#abcdef',
      coastShadingAlpha: '20',
      oceanShadingLevel: '5',
      oceanShadingColorHex: '#010203',
      oceanShadingAlpha: '30',
      oceanWavesType: 'concentric',
      oceanWavesLevel: '40',
      oceanWavesAlpha: '12',
      getConcentricWaveCount: () => 4,
      fadeConcentricWaves: true,
      jitterToConcentricWaves: false,
      brokenLinesForConcentricWaves: true,
      mergeColor: (out, key, hex) => {
        if (hex) out[key] = hex
      },
      oceanWavesColorHex: '#112233',
      drawOceanEffectsInLakes: true,
      riverColorHex: '#445566',
      parseBooleanWithDefault: Boolean,
      mergedSettingsRef: { current: {} },
    }

    // set missing variable expected by the hoisted function (falls back to global)
    globalThis.oceanWavesAlpha = '12'
    applyCoastOceanAndWavesHoisted(parsed, ctx)
    delete globalThis.oceanWavesAlpha

    expect(parsed.lineStyle).toBe('dashed')
    expect(parsed.coastlineWidth).toBe(3)
    expect(parsed.coastShadingLevel).toBe(10)
    expect(parsed.oceanShadingLevel).toBe(5)
    expect(parsed.oceanEffect).toBe('concentric')
    expect(parsed.oceanWavesLevel).toBe(40)
    expect(parsed.concentricWaveCount).toBe(4)
    expect(parsed.fadeConcentricWaves).toBe(true)
    expect(parsed.drawOceanEffectsInLakes).toBe(true)
    expect(parsed.riverColor).toBe('#445566')
  })

  it('applyTextAndBackgroundHoisted sets text and bold background colors', () => {
    const parsed = {}
    const ctx = {
      drawText: true,
      textColorHex: '#000000',
      drawBoldBackground: true,
      boldBackgroundColorHex: '#ffffff',
      mergeColor: (out, key, hex) => {
        if (hex) out[key] = hex
      },
    }

    applyTextAndBackgroundHoisted(parsed, ctx)
    expect(parsed.drawText).toBe(true)
    expect(parsed.textColor).toBe('#000000')
    expect(parsed.drawBoldBackground).toBe(true)
    expect(parsed.boldBackgroundColor).toBe('#ffffff')
  })

  it('applyBackgroundFlagsHoisted applies correct flags for types', () => {
    const parsed1 = {}
    applyBackgroundFlagsHoisted(parsed1, 'SolidColor')
    expect(parsed1.solidColorBackground).toBe(true)
    expect(parsed1.generateBackgroundFromTexture).toBe(false)

    const parsed2 = {}
    applyBackgroundFlagsHoisted(parsed2, 'GeneratedFromTexture')
    expect(parsed2.generateBackgroundFromTexture).toBe(true)
    expect(parsed2.solidColorBackground).toBe(false)
  })

  it('applyResourcesAndTopLevelHoisted maps resources and numeric fields', () => {
    const parsed = {}
    const ctx = {
      setResourceFromRef: (out, key, ref) => {
        if (ref) out[key] = { artPack: ref.split('|')[0], name: ref.split('|')[1] }
      },
      borderRef: 'packX|nameY',
      textureRef: '',
      backgroundSeed: '5',
      artPack: 'packA',
      worldSize: '2000',
      landShape: 'island',
      regionCount: '3',
      randomSeed: '7',
      selectedBooks: new Set(['B', 'A']),
    }

    applyResourcesAndTopLevelHoisted(parsed, ctx)
    expect(parsed.borderResource).toEqual({ artPack: 'packX', name: 'nameY' })
    expect(parsed.backgroundRandomSeed).toBe(5)
    expect(parsed.artPack).toBe('packA')
    expect(parsed.worldSize).toBe(2000)
    expect(parsed.landShape).toBe('island')
    expect(parsed.regionCount).toBe(3)
    expect(parsed.randomSeed).toBe(7)
    expect(Array.isArray(parsed.books)).toBe(true)
    expect(parsed.books).toEqual(['A', 'B'])
  })
})
