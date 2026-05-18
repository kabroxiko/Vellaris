import { describe, it, expect } from 'vitest'
import {
  shadeColor,
  hexWithAlpha,
  rgbaToHex,
  findTitle,
  deriveNortFilenameFromContent,
} from '../sharedHelpers'

describe('sharedHelpers additional functions', () => {
  it('shadeColor adjusts channel values safely', () => {
    expect(shadeColor('#000000', 10)).toBe('#0a0a0a')
    expect(shadeColor('#ffffff', -20)).toBe('#ebebeb')
    // boundaries
    expect(shadeColor('#010101', -10)).toBe('#000000')
  })

  it('hexWithAlpha returns rgba or fallback', () => {
    expect(hexWithAlpha('#010203', 0.5)).toBe('rgba(1,2,3,0.5)')
    expect(hexWithAlpha('bad', 0.4)).toMatch(/rgba\(194,184,145,0.4\)/)
  })

  it('rgbaToHex converts object to hex string', () => {
    expect(rgbaToHex({ r: 1, g: 2, b: 3 })).toBe('#010203')
    expect(rgbaToHex({})).toBe('#000000')
  })

  it('findTitle and deriveNortFilenameFromContent extract Title fields', () => {
    const parsed = { edits: { textEdits: [{ type: 'Title', text: 'My Map' }] } }
    expect(findTitle(parsed)).toBe('My Map')
    const content = JSON.stringify(parsed)
    expect(deriveNortFilenameFromContent(content)).toBe('My Map')
    // invalid input
    expect(deriveNortFilenameFromContent('not-json')).toBeNull()
  })
})
