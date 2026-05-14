import { describe, it, expect } from 'vitest'
import {
  hexToHSB,
  hsbToRgb,
  hexToRgba,
  rgbaToHex,
  shadeColor,
  parseHexColor,
} from '../sharedHelpers.js'

describe('sharedHelpers.js - deterministic color utilities', () => {
  it('hexToHSB and hsbToRgb round-trip for red', () => {
    const hsb = hexToHSB('#ff0000')
    expect(hsb[1]).toBeCloseTo(1, 5)
    expect(hsb[2]).toBeCloseTo(1, 5)
    const rgb = hsbToRgb(hsb[0], hsb[1], hsb[2])
    expect(rgb).toEqual([255, 0, 0])
  })

  it('hexToRgba and rgbaToHex convert', () => {
    expect(hexToRgba('#112233', 50)).toEqual({ r: 17, g: 34, b: 51, a: 0.5 })
    expect(rgbaToHex({ r: 17, g: 34, b: 51 })).toBe('#112233')
  })

  it('shadeColor adjusts channels safely', () => {
    expect(shadeColor('#000000', 10)).toBe('#0a0a0a')
    expect(shadeColor('#ffffff', -10)).toBe('#f5f5f5')
  })

  it('parseHexColor returns null for invalid and rgb for valid', () => {
    expect(parseHexColor('bad')).toBeNull()
    expect(parseHexColor('#010203')).toEqual({ r: 1, g: 2, b: 3 })
  })
})
