import { describe, it, expect } from 'vitest'
import {
  hexToHSB,
  hsbToRgb,
  hexToRgba,
  rgbaToHex,
  sanitizeFilenameBase,
  parseHexColor,
  hexWithAlpha,
  shadeColor,
  hexToRgbaString,
  deriveNortFilenameFromContent,
  mulberry32,
} from '../generate/sharedHelpers'

describe('sharedHelpers deterministic functions', () => {
  it('converts hex to HSB and back to RGB for red', () => {
    const hsb = hexToHSB('#ff0000')
    expect(hsb[0]).toBe(0)
    expect(hsb[1]).toBeCloseTo(1)
    expect(hsb[2]).toBeCloseTo(1)
    const rgb = hsbToRgb(hsb[0], hsb[1], hsb[2])
    expect(rgb).toEqual([255, 0, 0])
  })

  it('hexToRgba and rgbaToHex are consistent', () => {
    const rgba = hexToRgba('#336699', 50)
    expect(rgba.r).toBe(51)
    expect(rgba.g).toBe(102)
    expect(rgba.b).toBe(153)
    expect(rgba.a).toBeCloseTo(0.5)
    expect(rgbaToHex({ r: 51, g: 102, b: 153 })).toBe('#336699')
  })

  it('sanitizes filenames and falls back when empty', () => {
    expect(sanitizeFilenameBase(' My File: v1 ', 'fallback')).toBe('My-File--v1')
    expect(sanitizeFilenameBase('', 'my-fallback')).toBe('my-fallback')
  })

  it('parses hex color and formats rgba string', () => {
    expect(parseHexColor('#ff00ff')).toEqual({ r: 255, g: 0, b: 255 })
    expect(hexToRgbaString('#336699', 255)).toBe('51,102,153,255')
  })

  it('applies alpha to hex producing rgba string', () => {
    expect(hexWithAlpha('#336699', 0.3)).toBe('rgba(51,102,153,0.3)')
  })

  it('shades colors within bounds', () => {
    expect(shadeColor('#000000', 10)).toBe('#0a0a0a')
    expect(shadeColor('#ffffff', -10)).toBe('#f5f5f5')
  })

  it('derives title from nort content', () => {
    const json = JSON.stringify({ edits: { textEdits: [{ type: 'Title', text: 'My Map' }] } })
    expect(deriveNortFilenameFromContent(json)).toBe('My Map')
  })

  it('mulberry32 returns a function producing numbers between 0 and 1', () => {
    const gen = mulberry32(1)
    const a = gen()
    const b = gen()
    expect(typeof a).toBe('number')
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
    expect(b).toBeGreaterThanOrEqual(0)
    expect(b).toBeLessThan(1)
    expect(a).not.toBe(b)
  })
})
