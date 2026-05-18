import { describe, it, expect } from 'vitest'
import {
  hexToHSB,
  mulberry32,
  hsbToRgb,
  hexToRgba,
  rgbaToHex,
  shadeColor,
  hexWithAlpha,
  parseHexColor,
  hexToRgbaString,
  sanitizeFilenameBase,
  findTitle,
  deriveNortFilenameFromContent,
  readResponseBytesWithProgress,
  makeProgressToastController,
} from '../generate/sharedHelpers'

describe('sharedHelpers deterministic functions', () => {
  it('converts hex to HSB and back-related helpers', () => {
    const [h, s, b] = hexToHSB('#ff0000')
    expect(Math.round(h * 360)).toBe(0)
    expect(Math.round(s * 100)).toBe(100)
    expect(Math.round(b * 100)).toBe(100)

    const rgb = hsbToRgb(h, s, b)
    expect(rgb).toEqual([255, 0, 0])
  })

  it('mulberry32 produces deterministic sequence', () => {
    const r = mulberry32(12345)
    const a = [r(), r(), r()]
    const s = mulberry32(12345)
    expect([s(), s(), s()]).toEqual(a)
  })

  it('hex/rgb helpers', () => {
    expect(hexToRgba('#010203')).toEqual({ r: 1, g: 2, b: 3, a: 1 })
    expect(rgbaToHex({ r: 10, g: 11, b: 12 })).toBe('#0a0b0c')
    expect(shadeColor('#010101', 10)).toMatch(/^#/) // returns hex
    expect(hexWithAlpha('#0a0b0c', 0.5)).toContain('rgba(')
    expect(parseHexColor('#0a0b0c')).toEqual({ r: 10, g: 11, b: 12 })
    expect(hexToRgbaString('#0a0b0c', 128)).toBe('10,11,12,128')
  })

  it('sanitizeFilenameBase and title parsing', () => {
    // existing implementation may produce consecutive dashes for mixed separators
    expect(sanitizeFilenameBase(' My File / Name ')).toBe('My-File---Name')
    const parsed = { edits: { textEdits: [{ type: 'Title', text: 'My Title' }] } }
    expect(findTitle(parsed)).toBe('My Title')
    expect(deriveNortFilenameFromContent(JSON.stringify(parsed))).toBe('My Title')
    // invalid JSON should return null but not throw
    expect(deriveNortFilenameFromContent('not-json')).toBeNull()
  })

  it('reads response bytes with progress for stream and non-stream', async () => {
    // non-stream response
    const nonStream = { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }
    const non = await readResponseBytesWithProgress(nonStream, () => {})
    expect(Array.from(non)).toEqual([1, 2, 3])

    // stream-like reader
    let called = false
    const chunks = [Uint8Array.from([4, 5]), Uint8Array.from([6])]
    const reader = {
      i: 0,
      read() {
        if (this.i >= chunks.length) return Promise.resolve({ done: true })
        return Promise.resolve({ done: false, value: chunks[this.i++] })
      },
    }
    const streamResp = { body: { getReader: () => reader } }
    const onStart = () => {
      called = true
    }
    const res = await readResponseBytesWithProgress(streamResp, onStart)
    expect(called).toBe(true)
    expect(Array.from(res)).toEqual([4, 5, 6])
  })

  it('makeProgressToastController handles show/hide without errors', () => {
    const savedShow = globalThis.showToast
    const savedHide = globalThis.hideToast
    let last = null
    globalThis.showToast = (msg) => {
      last = msg
      return 'id'
    }
    globalThis.hideToast = (id) => {
      last = `hide:${id}`
    }
    const ctl = makeProgressToastController()
    ctl.show('Working')
    expect(last).toBe('Working')
    ctl.hide()
    expect(last).toBe('hide:id')
    globalThis.showToast = savedShow
    globalThis.hideToast = savedHide
  })
})
