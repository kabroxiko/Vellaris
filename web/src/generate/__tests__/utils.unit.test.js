import { describe, it, expect } from 'vitest'
import {
  parseColorChannels,
  colorToHex,
  colorToAlphaPercent,
  formatColorString,
  parseFontSpec,
  fontSpecToFamily,
  updateFontFamilyInSpec,
  base64ToBlob,
} from '../utils'

describe('utils pure helpers', () => {
  it('parseColorChannels handles hex, rgb string, and object', () => {
    expect(parseColorChannels('#0a0b0c')).toEqual({ r: 10, g: 11, b: 12, a: 255 })
    expect(parseColorChannels('18,52,86')).toEqual({ r: 18, g: 52, b: 86, a: 255 })
    expect(parseColorChannels({ red: '1', green: 2, blue: 3 })).toEqual({
      r: 1,
      g: 2,
      b: 3,
      a: 255,
    })
    expect(parseColorChannels('invalid')).toBeNull()
  })

  it('colorToHex and colorToAlphaPercent and formatColorString work', () => {
    expect(colorToHex('#123456')).toBe('#123456')
    expect(colorToHex('18,52,86,128')).toBe('#123456')
    expect(colorToAlphaPercent('18,52,86,128')).toBe(Math.round((128 / 255) * 100))
    expect(formatColorString('#010203', 50)).toBe('#01020380')
    expect(formatColorString('invalid', 50)).toBeNull()
  })

  it('font spec parsing and updating', () => {
    const spec = 'MyFont\t1\t24'
    expect(parseFontSpec(spec)).toEqual({ family: 'MyFont', styleNumber: 1, size: 24 })
    expect(fontSpecToFamily(spec)).toBe('MyFont')
    expect(updateFontFamilyInSpec(spec, 'NewFam')).toBe('NewFam\t1\t24')
    // when existing spec is empty, function will create a new spec with fallback size
    expect(updateFontFamilyInSpec('', 'X')).toBe('X\t0\t24')
  })

  it('base64ToBlob creates a blob of expected type', () => {
    const blob = base64ToBlob(btoa('ABC'), 'text/plain')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain')
  })
})
