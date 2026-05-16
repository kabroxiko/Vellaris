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
