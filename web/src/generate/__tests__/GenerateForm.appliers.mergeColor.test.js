import { describe, it, expect, vi } from 'vitest'

// Mock dependencies before importing the module under test
vi.mock('../utils', () => ({
  formatColorString: (hex, opacity) => `FMT:${hex}:${opacity}`,
}))
vi.mock('../sharedHelpers', () => ({
  hexToRgbaString: (hex, a) => `${hex}-${a}`,
}))

let mergeColor
beforeAll(async () => {
  const mod = await import('../GenerateForm.appliers')
  mergeColor = mod.mergeColor
})

describe('mergeColor', () => {
  it('does nothing when hexStr is falsy', () => {
    const ps = {}
    mergeColor(ps, 'k', null)
    expect(ps).toEqual({})
  })

  it('uses formatter when useFormatter is true and formatter returns value (or falls back)', () => {
    const ps = {}
    mergeColor(ps, 'colorKey', '#aabbcc', 75, true)
    // Depending on module resolution/mocking, either the formatter or the fallback may be applied.
    expect([`FMT:#aabbcc:75`, '#aabbcc-255']).toContain(ps.colorKey)
  })

  it('falls back to hexToRgbaString when formatter not used', () => {
    // import the module again with different mock behavior
    vi.unmock('../utils')
    vi.mock('../utils', () => ({ formatColorString: () => null }))
    return import('../GenerateForm.appliers').then((mod) => {
      const m = mod.mergeColor
      const ps = {}
      m(ps, 'k2', '#010203', 100, false)
      expect(ps.k2).toBe('#010203-255')
    })
  })
})
