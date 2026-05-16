import { expect } from 'vitest'

import {
  serializeNortObject,
  computeGridOverlayAlpha,
  computeConcentricWaveCount,
  scaleSliderValue,
  mergeColor,
  loadRandomOverrides,
  loadCustomizeOverrides,
} from '../GenerateForm.jsx'

describe('GenerateForm extra helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('serializeNortObject sorts object keys recursively', () => {
    const obj = { b: 1, a: { d: 4, c: 3 } }
    const s = serializeNortObject(obj)
    const posA = s.indexOf('"a"')
    const posB = s.indexOf('"b"')
    expect(posA).toBeLessThan(posB)
    const posC = s.indexOf('"c"')
    const posD = s.indexOf('"d"')
    expect(posC).toBeLessThan(posD)
  })

  it('computeGridOverlayAlpha returns parsed alpha when orig matches ui color', () => {
    const orig = '1,2,3,128' // colorToHex -> #010203 and alpha 128
    const ui = '#010203'
    expect(computeGridOverlayAlpha(orig, ui)).toBe(128)
  })

  it('computeGridOverlayAlpha defaults to 255 when no original color', () => {
    expect(computeGridOverlayAlpha(null, '#abcdef')).toBe(255)
  })

  it('computeConcentricWaveCount prefers original when UI count is 0 or missing', () => {
    expect(computeConcentricWaveCount(5, 0)).toBe(5)
    expect(computeConcentricWaveCount(5, '0')).toBe(5)
  })

  it('computeConcentricWaveCount uses UI numeric value when present', () => {
    expect(computeConcentricWaveCount(5, '7')).toBe(7)
  })

  it('computeConcentricWaveCount returns undefined for invalid inputs', () => {
    expect(computeConcentricWaveCount(undefined, 'abc')).toBeUndefined()
  })

  it('scaleSliderValue maps slider values to expected scales', () => {
    expect(scaleSliderValue(5)).toBeCloseTo(1, 0.0001)
    expect(scaleSliderValue(1)).toBeCloseTo(0.5, 0.0001)
    expect(scaleSliderValue(15)).toBeCloseTo(3, 0.0001)
    expect(scaleSliderValue('x')).toBeUndefined()
  })

  // Note: `mergeColor` is internal and not exported; behaviors are covered
  // indirectly via the applier tests that pass `mergeColor` as a context.

  it('loadRandomOverrides and loadCustomizeOverrides parse localStorage JSON', () => {
    localStorage.setItem('vellaris-random-manual-overrides', JSON.stringify({ foo: 1 }))
    localStorage.setItem('vellaris-customize-overrides', JSON.stringify({ bar: 2 }))
    expect(loadRandomOverrides()).toEqual({ foo: 1 })
    expect(loadCustomizeOverrides()).toEqual({ bar: 2 })
  })
})
