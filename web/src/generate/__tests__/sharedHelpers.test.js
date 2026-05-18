import { describe, it, expect } from 'vitest'
import {
  hexToHSB,
  hsbToRgb,
  mulberry32,
  rgbaToHex,
  parseHexColor,
  hexToRgbaString,
  sanitizeFilenameBase,
  shadeColor,
  hexWithAlpha,
} from '../sharedHelpers'

describe('sharedHelpers (deterministic)', () => {
  it('hexToHSB and hsbToRgb are inverses for red', () => {
    const hsb = hexToHSB('#ff0000')
    expect(hsb[0]).toBeCloseTo(0, 6)
    expect(hsb[1]).toBeCloseTo(1, 6)
    expect(hsb[2]).toBeCloseTo(1, 6)
    const rgb = hsbToRgb(hsb[0], hsb[1], hsb[2])
    expect(rgb).toEqual([255, 0, 0])
  })

  it('parseHexColor and hexToRgbaString produce correct values', () => {
    const parsed = parseHexColor('#abcdef')
    expect(parsed).toEqual({ r: 171, g: 205, b: 239 })
    expect(hexToRgbaString('#abcdef', 128)).toBe('171,205,239,128')
    expect(parseHexColor('invalid')).toBeNull()
  })

  it('rgbaToHex converts numbers to padded hex', () => {
    expect(rgbaToHex({ r: 10, g: 11, b: 12 })).toBe('#0a0b0c')
    expect(rgbaToHex({})).toBe('#000000')
  })

  it('hexWithAlpha returns rgba and hexToRgba respects alpha', () => {
    expect(hexWithAlpha('#010203', 0.5)).toBe('rgba(1,2,3,0.5)')
    expect(hexToRgbaString('#010203')).toBe('1,2,3,255')
  })

  it('shadeColor clamps and shifts channels', () => {
    expect(shadeColor('#000000', 10)).toBe('#0a0a0a')
    expect(shadeColor('#fffff0', -20)).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('mulberry32 is deterministic for same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect(a()).toBe(b())
    expect(a()).toBe(b())
  })

  it('sanitizeFilenameBase replaces invalid characters and spaces', () => {
    expect(sanitizeFilenameBase(' My File:Name ', 'fallback')).toBe('My-File-Name')
    expect(sanitizeFilenameBase('', 'fallback')).toBe('fallback')
  })
})
import * as shared from '../sharedHelpers.js'

describe('sharedHelpers module', () => {
  it('hex/hsb/rgb helpers behave predictably', () => {
    expect(shared.hexToHSB('#ff0000')).toEqual([0, 1, 1])
    expect(shared.hsbToRgb(0, 1, 1)).toEqual([255, 0, 0])
    expect(shared.hexToRgba('#010203', 50)).toEqual({ r: 1, g: 2, b: 3, a: 0.5 })
    expect(shared.rgbaToHex({ r: 1, g: 2, b: 3 })).toBe('#010203')
    expect(shared.shadeColor('#000000', 10)).toBe('#0a0a0a')
    expect(shared.hexWithAlpha('#010203', 0.5)).toBe('rgba(1,2,3,0.5)')
    expect(shared.parseHexColor('#010203')).toEqual({ r: 1, g: 2, b: 3 })
    expect(shared.hexToRgbaString('#010203', 128)).toBe('1,2,3,128')
  })

  it('utility helpers for filenames and progress work', async () => {
    expect(shared.sanitizeFilenameBase('a/:b c')).toContain('-')
    const fakeResp = { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }
    const bytes = await shared.readResponseBytesWithProgress(fakeResp)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(3)
  })

  it('derive and find title helpers return expected values', () => {
    const obj = { edits: { textEdits: [{ type: 'Title', text: 'MyTitle' }] } }
    expect(shared.findTitle(obj)).toBe('MyTitle')
    const json = JSON.stringify(obj)
    expect(shared.deriveNortFilenameFromContent(json)).toBe('MyTitle')
  })

  it('mulberry32 produces deterministic sequences for same seed', () => {
    const g1 = shared.mulberry32(42)
    const g2 = shared.mulberry32(42)
    const a = g1()
    const b = g2()
    expect(a).toBeCloseTo(b, 12)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })
})
