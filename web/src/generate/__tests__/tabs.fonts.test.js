import { describe, it, expect } from 'vitest'
import { parseFontSpec, updateFontFamilyInSpec, fontSpecToFamily } from '../utils'

describe('font spec helpers', () => {
  it('parseFontSpec extracts family and size from tab-separated spec', () => {
    const spec = 'Goudy Bookletter\t0\t24'
    const parsed = parseFontSpec(spec)
    expect(parsed.family).toBe('Goudy Bookletter')
    expect(parsed.size).toBe(24)
  })

  it('updateFontFamilyInSpec replaces family preserving size', () => {
    const spec = 'OldFamily 18px'
    const updated = updateFontFamilyInSpec(spec, 'NewFamily', 20)
    expect(fontSpecToFamily(updated)).toBe('NewFamily')
  })
})
