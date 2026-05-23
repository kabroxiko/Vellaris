import * as utils from '../utils.js'

describe('utils module', () => {
  it('clamps color channels correctly', () => {
    expect(utils.clampColorChannel(-5)).toBe(0)
    expect(utils.clampColorChannel(300)).toBe(255)
    expect(utils.clampColorChannel(128)).toBe(128)
  })

  it('parses various color formats', () => {
    expect(utils.parseColorChannels('#010203')).toEqual({ r: 1, g: 2, b: 3, a: 255 })
    expect(utils.parseColorChannels('4,5,6')).toEqual({ r: 4, g: 5, b: 6, a: 255 })
    expect(utils.parseColorChannels({ r: '7', g: 8, b: 9, a: 10 })).toEqual({
      r: 7,
      g: 8,
      b: 9,
      a: 10,
    })
    expect(utils.colorToHex('#0a0b0c')).toBe('#0a0b0c')
    expect(utils.colorToAlphaPercent('#010203')).toBe(100)
    expect(utils.formatColorString('#010203', 50)).toBe('#01020380')
  })

  it('parses and updates font specs', () => {
    const spec = 'MyFamily\t1\t24'
    expect(utils.parseFontSpec(spec)).toEqual({ family: 'MyFamily', styleNumber: 1, size: 24 })
    expect(utils.fontSpecToFamily(spec)).toBe('MyFamily')
    const updated = utils.updateFontFamilyInSpec(spec, 'NewFam')
    expect(updated.startsWith('NewFam\t')).toBeTruthy()
  })

  it('converts base64 to Blob', () => {
    const b64 = Buffer.from('abc').toString('base64')
    const blob = utils.base64ToBlob(b64, 'text/plain')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain')
  })
})
