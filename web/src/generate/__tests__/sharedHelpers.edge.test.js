import { describe, it, expect } from 'vitest'
import * as H from '../sharedHelpers'

describe('sharedHelpers edge cases', () => {
  it('hexToHSB handles black and white correctly', () => {
    expect(H.hexToHSB('#000000')).toEqual([0, 0, 0])
    const white = H.hexToHSB('#ffffff')
    expect(white[1]).toBeCloseTo(0, 6) // saturation 0
    expect(white[2]).toBeCloseTo(1, 6) // brightness 1
  })

  it('hexToHSB returns zeros for invalid input', () => {
    expect(H.hexToHSB('not-a-hex')).toEqual([0, 0, 0])
  })

  it('hsbToRgb converts cyan as expected', () => {
    // h = 0.5 -> 180 degrees -> cyan
    const rgb = H.hsbToRgb(0.5, 1, 1)
    expect(rgb).toEqual([0, 255, 255])
  })
})
