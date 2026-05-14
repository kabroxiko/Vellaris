import { describe, it, expect } from 'vitest'
import {
  clampColorChannel,
  parseColorChannels,
  colorToHex,
  colorToAlphaPercent,
  parseFontSpec,
  fontSpecToFamily,
  updateFontFamilyInSpec,
} from '../utils.js'

describe('utils.js - color and font helpers', () => {
  it('clampColorChannel bounds values', () => {
    expect(clampColorChannel(-10)).toBe(0)
    expect(clampColorChannel(500)).toBe(255)
    expect(clampColorChannel(128)).toBe(128)
  })

  it('parseColorChannels handles hex, csv and objects', () => {
    expect(parseColorChannels('#112233')).toEqual({ r: 17, g: 34, b: 51, a: 255 })
    expect(parseColorChannels('10,20,30')).toEqual({ r: 10, g: 20, b: 30, a: 255 })
    expect(parseColorChannels({ r: 1, g: 2, b: 3 })).toEqual({ r: 1, g: 2, b: 3, a: 255 })
    expect(parseColorChannels('not a color')).toBeNull()
  })

  it('colorToHex and colorToAlphaPercent convert inputs', () => {
    expect(colorToHex('#0a0b0c')).toBe('#0a0b0c')
    expect(colorToHex({ r: 17, g: 34, b: 51 })).toBe('#112233')
    expect(colorToAlphaPercent('#112233')).toBe(100)
    expect(colorToAlphaPercent({ r: 0, g: 0, b: 0, a: 128 })).toBe(50)
  })

  it('font spec parsing and updates', () => {
    expect(parseFontSpec('Arial\t1\t12')).toEqual({ family: 'Arial', styleNumber: 1, size: 12 })
    expect(fontSpecToFamily('Foo\t2\t16')).toBe('Foo')
    expect(updateFontFamilyInSpec('Old\t1\t10', 'NewFamily', 24)).toBe('NewFamily\t1\t10')
  })
})
