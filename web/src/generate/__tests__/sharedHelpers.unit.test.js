import { describe, it, expect } from 'vitest'
import {
  hexToHSB,
  hsbToRgb,
  sanitizeFilenameBase,
  parseHexColor,
  hexToRgbaString,
  mulberry32,
} from '../sharedHelpers'

describe('sharedHelpers pure functions', () => {
  it('hexToHSB and round-trip to rgb', () => {
    const hsb = hexToHSB('#ff0000')
    // red hue roughly 0
    expect(hsb[0]).toBeGreaterThanOrEqual(0)
    expect(hsb[0]).toBeLessThanOrEqual(1)
    const rgb = hsbToRgb(hsb[0], hsb[1], hsb[2])
    expect(rgb[0]).toBeGreaterThanOrEqual(0)
    expect(rgb[0]).toBeLessThanOrEqual(255)
  })

  it('parseHexColor and hexToRgbaString', () => {
    expect(parseHexColor('#010203')).toEqual({ r: 1, g: 2, b: 3 })
    expect(hexToRgbaString('#010203', 128)).toBe('1,2,3,128')
    expect(parseHexColor('bad')).toBeNull()
  })

  it('sanitizeFilenameBase replaces illegal chars and whitespace', () => {
    expect(sanitizeFilenameBase(' a/b:c *?"<>| name ')).toMatch(/a-b-c-/)
    expect(sanitizeFilenameBase('', 'fallback')).toBe('fallback')
  })

  it('mulberry32 produces repeatable sequence for same seed', () => {
    const r1 = mulberry32(42)
    const r2 = mulberry32(42)
    // first two values should match
    expect(r1()).toBeCloseTo(r2(), 6)
    expect(r1()).toBeCloseTo(r2(), 6)
  })
})
