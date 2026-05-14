import { describe, it, expect } from 'vitest'
import { computeGridOverlayAlpha, computeConcentricWaveCount } from '../GenerateForm.jsx'

describe('GenerateForm pure helpers', () => {
  it('computeGridOverlayAlpha returns 255 when no origColor', () => {
    expect(computeGridOverlayAlpha(null, '#abcdef')).toBe(255)
  })

  it('computeGridOverlayAlpha preserves alpha when hex matches', () => {
    // origColor as r,g,b,a string
    const orig = '1,2,3,128'
    // colorToHex(parse(orig)) -> #010203
    expect(computeGridOverlayAlpha(orig, '#010203')).toBe(128)
  })

  it('computeGridOverlayAlpha returns 255 when hex differs', () => {
    const orig = '10,20,30,77'
    expect(computeGridOverlayAlpha(orig, '#ffffff')).toBe(255)
  })

  it('computeConcentricWaveCount preserves origCount when ui is empty or zero', () => {
    expect(computeConcentricWaveCount(5, '')).toBe(5)
    expect(computeConcentricWaveCount(7, '0')).toBe(7)
  })

  it('computeConcentricWaveCount uses numeric UI value when provided', () => {
    expect(computeConcentricWaveCount(undefined, '3')).toBe(3)
    expect(computeConcentricWaveCount(2, '4')).toBe(4)
  })

  it('computeConcentricWaveCount returns undefined for non-numeric UI and no orig', () => {
    expect(computeConcentricWaveCount(undefined, 'abc')).toBeUndefined()
  })
})
