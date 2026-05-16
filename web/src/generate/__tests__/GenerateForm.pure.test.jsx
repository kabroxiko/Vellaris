import { describe, it, expect } from 'vitest'
import { computeGridOverlayAlpha, computeConcentricWaveCount, buildCustomizePayload, serializeNortObject } from '../GenerateForm'

describe('GenerateForm pure helpers', () => {
  it('computeGridOverlayAlpha returns 255 when no origColor', () => {
    expect(computeGridOverlayAlpha(null, '#ffffff')).toBe(255)
  })

  it('computeConcentricWaveCount preserves original when ui is empty', () => {
    expect(computeConcentricWaveCount(5, '')).toBe(5)
  })

  it('buildCustomizePayload maps values to payload shape', () => {
    const v = { backgroundType: 'SolidColor', drawRegionBoundaries: true, oceanColorHex: '#123456' }
    const payload = buildCustomizePayload(v)
    expect(payload.backgroundType).toBe('SolidColor')
    expect(payload.drawRegionBoundaries).toBe(true)
    expect(payload.oceanColorHex).toBe('#123456')
  })

  it('serializeNortObject produces stable JSON ordering', () => {
    const obj = { b: 2, a: 1, nested: { d: 4, c: 3 } }
    const s = serializeNortObject(obj)
    // keys should be ordered: a, b, nested with nested keys c, d
    const idxA = s.indexOf('\n  "a"')
    const idxB = s.indexOf('\n  "b"')
    const idxNested = s.indexOf('\n  "nested"')
    expect(idxA).toBeGreaterThan(-1)
    expect(idxB).toBeGreaterThan(idxA)
    expect(idxNested).toBeGreaterThan(idxB)
  })
})
