import { describe, it, expect } from 'vitest'
import mergeUiIntoParsed from '../mergeUiIntoParsed'

const baseOpts = {
  backgroundType: 'FractalNoise',
  setResourceFromRef: () => {},
  mergeColor: () => {},
  getGridOverlayAlpha: () => 255,
  getConcentricWaveCount: () => undefined,
  parseBooleanWithDefault: Boolean,
}

describe('mergeUiIntoParsed drawBorder', () => {
  it('writes an unchecked checkbox into the payload', () => {
    const parsed = { drawBorder: true }
    mergeUiIntoParsed(parsed, { ...baseOpts, drawBorder: false })
    expect(parsed.drawBorder).toBe(false)
  })

  it('writes a checked checkbox into the payload', () => {
    const parsed = { drawBorder: false }
    mergeUiIntoParsed(parsed, { ...baseOpts, drawBorder: true })
    expect(parsed.drawBorder).toBe(true)
  })

  it('leaves the incoming value alone when the UI value is missing', () => {
    const parsed = { drawBorder: true }
    mergeUiIntoParsed(parsed, { ...baseOpts })
    expect(parsed.drawBorder).toBe(true)
  })
})
