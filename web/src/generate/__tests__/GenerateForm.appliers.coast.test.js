import { vi } from 'vitest'
import { applyCoastOceanAndWavesHoisted } from '../GenerateForm.appliers'

vi.mock('../utils', () => ({
  formatColorString: vi.fn((hex, op) => {
    if (typeof hex === 'string' && hex.startsWith('fmt:')) return hex
    return `fmt:${hex}:${op}`
  }),
  colorToHexWithAlpha: vi.fn((hex, alpha) => {
    if (!hex) return null
    const h = String(hex)
    if (alpha === undefined || alpha === null) return `${h}ff`
    const a = Number(alpha)
    return `${h}${a.toString(16).padStart(2, '0')}`
  }),
  colorToHex: vi.fn((hex) => (hex ? String(hex) : null)),
}))
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
      coastlineColor: '#010203',
      coastShadingLevel: '10',
      coastShadingColor: 'fmt:#0a0b0c:80',
      oceanShadingLevel: '5',
      oceanShadingColor: 'fmt:#111213:70',
      oceanWavesType: 'sine',
      oceanWavesLevel: '2',
      getConcentricWaveCount: () => 7,
      fadeConcentricWaves: 'true',
      jitterToConcentricWaves: 'false',
      brokenLinesForConcentricWaves: 'true',
      oceanWavesColor: 'fmt:#202122:60',
      drawOceanEffectsInLakes: 'true',
      riverColor: '#303132',
      parseBooleanWithDefault: (val) => {
        if (typeof val === 'string') return val === 'true'
        return Boolean(val)
      },
      mergedSettingsRef: {},
    }

    applyCoastOceanAndWavesHoisted(parsed, ctx)

    expect(parsed.lineStyle).to.equal('smooth')
    expect(parsed.coastlineWidth).to.equal(3)

    // coastlineColor now uses combined hex with alpha
    expect(parsed.coastlineColor).to.equal('#010203ff')

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

    // river color now uses combined hex with alpha
    expect(parsed.riverColor).to.equal('#303132ff')
  })
})
