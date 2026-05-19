import { vi } from 'vitest'
import { applyCoastOceanAndWavesHoisted } from '../GenerateForm.appliers'

vi.mock('../utils', () => ({ formatColorString: vi.fn((hex, op) => `fmt:${hex}:${op}`) }))
vi.mock('../sharedHelpers', () => ({
  hexToRgbaString: vi.fn((hex, alpha) => `rgba(${hex},${alpha})`),
}))

describe('applyCoastOceanAndWavesHoisted', () => {
  beforeEach(() => vi.clearAllMocks())

  it('applies shading/opacities and formats wave/ocean colors correctly', () => {
    const parsed = {}
    const ctx = {
      lineStyle: 'smooth',
      coastlineWidth: '3',
      coastlineColorHex: '#010203',
      coastShadingLevel: '10',
      coastShadingColorHex: '#0a0b0c',
      coastShadingAlpha: '20',
      oceanShadingLevel: '5',
      oceanShadingColorHex: '#111213',
      oceanShadingAlpha: '30',
      oceanWavesType: 'sine',
      oceanWavesLevel: '2',
      oceanWavesAlpha: '40',
      getConcentricWaveCount: () => 7,
      fadeConcentricWaves: 'true',
      jitterToConcentricWaves: 'false',
      brokenLinesForConcentricWaves: 'true',
      oceanWavesColorHex: '#202122',
      drawOceanEffectsInLakes: 'true',
      riverColorHex: '#303132',
      parseBooleanWithDefault: (val) => {
        if (typeof val === 'string') return val === 'true'
        return Boolean(val)
      },
      mergedSettingsRef: {},
    }

    applyCoastOceanAndWavesHoisted(parsed, ctx)

    expect(parsed.lineStyle).to.equal('smooth')
    expect(parsed.coastlineWidth).to.equal(3)

    // coastlineColor uses hexToRgbaString (no formatter)
    expect(parsed.coastlineColor).to.equal('rgba(#010203,255)')

    // coast shading uses formatter with opacityPercent = 100 - coastShadingAlpha (20 -> 80)
    expect(parsed.coastShadingColor).to.equal('fmt:#0a0b0c:80')

    // ocean shading uses formatter with opacityPercent = 100 - oceanShadingAlpha (30 -> 70)
    expect(parsed.oceanShadingColor).to.equal('fmt:#111213:70')

    // concentric waves count and options
    expect(parsed.concentricWaveCount).to.equal(7)
    expect(parsed.fadeConcentricWaves).to.equal(true)
    expect(parsed.jitterToConcentricWaves).to.equal(false)
    expect(parsed.brokenLinesForConcentricWaves).to.equal(true)

    // ocean waves color formatted with opacityPercent = 100 - oceanWavesAlpha (40 -> 60)
    expect(parsed.oceanWavesColor).to.equal('fmt:#202122:60')

    // river color uses hexToRgbaString
    expect(parsed.riverColor).to.equal('rgba(#303132,255)')
  })
})
