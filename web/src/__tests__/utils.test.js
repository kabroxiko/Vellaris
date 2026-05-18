import { describe, it, expect } from 'vitest'
import {
  clampColorChannel,
  parseColorChannels,
  colorToHex,
  colorToAlphaPercent,
  formatColorString,
  parseFontSpec,
  fontSpecToFamily,
  updateFontFamilyInSpec,
  base64ToBlob,
} from '../generate/utils'

// Polyfills for Node test environment
if (typeof atob === 'undefined') {
  globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary')
}

describe('generate/utils', () => {
  it('clamps color channel values', () => {
    expect(clampColorChannel(300)).toBe(255)
    expect(clampColorChannel(-5)).toBe(0)
    expect(clampColorChannel(128)).toBe(128)
  })

  it('parses color channels from #hex, rgb string, and object', () => {
    expect(parseColorChannels('#010203')).toEqual({ r: 1, g: 2, b: 3, a: 255 })
    expect(parseColorChannels(' 10, 20,30 ')).toEqual({ r: 10, g: 20, b: 30, a: 255 })
    expect(parseColorChannels({ red: '5', green: 6, blue: 7, alpha: 128 })).toEqual({
      r: 5,
      g: 6,
      b: 7,
      a: 128,
    })
    expect(parseColorChannels(null)).toBeNull()
  })

  it('converts colors to hex and computes alpha percent', () => {
    expect(colorToHex('#0a0b0c')).toBe('#0a0b0c')
    expect(colorToAlphaPercent('0,0,0,128')).toBe(Math.round((128 / 255) * 100))
    expect(colorToAlphaPercent('invalid', 77)).toBe(77)
  })

  it('formats stable color strings with alpha', () => {
    expect(formatColorString('#0a0b0c', 50)).toBe('10,11,12,128')
    expect(formatColorString('10,20,30', 100)).toBe('10,20,30,255')
    expect(formatColorString('invalid', 50)).toBeNull()
  })

  it('parses and updates font specs', () => {
    const spec = 'SomeFont\t1\t18'
    expect(parseFontSpec(spec)).toEqual({ family: 'SomeFont', styleNumber: 1, size: 18 })
    expect(fontSpecToFamily(spec)).toBe('SomeFont')
    expect(parseFontSpec('bad')).toBeNull()
    expect(updateFontFamilyInSpec(spec, 'NewFamily')).toBe('NewFamily\t1\t18')
    expect(updateFontFamilyInSpec('', '  ')).toBe('')
  })

  it('converts base64 to Blob with given mime type', () => {
    const data = 'aGVsbG8=' // 'hello'
    const blob = base64ToBlob(data, 'text/plain')
    expect(blob.type).toBe('text/plain')
    // size 5 for 'hello'
    return blob.arrayBuffer().then((buf) => expect(buf.byteLength).toBe(5))
  })
})
