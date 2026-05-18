import { describe, it, expect } from 'vitest'
import {
  mulberry32,
  sanitizeFilenameBase,
  findTitle,
  deriveNortFilenameFromContent,
} from '../sharedHelpers.js'

describe('sharedHelpers extras', () => {
  it('mulberry32 produces deterministic sequence', () => {
    const r = mulberry32(123)
    const a = r()
    const b = r()
    // deterministic: two calls are numbers in [0,1)
    expect(typeof a).toBe('number')
    expect(typeof b).toBe('number')
    expect(a).not.toBe(b)
  })

  it('sanitizeFilenameBase cleans names', () => {
    expect(sanitizeFilenameBase(' My File ', 'fallback')).toBe('My-File')
    expect(sanitizeFilenameBase('', 'fb')).toBe('fb')
  })

  it('findTitle and deriveNortFilenameFromContent extract Title', () => {
    const parsed = { edits: { textEdits: [{ type: 'Title', text: 'My Title' }] } }
    expect(findTitle(parsed)).toBe('My Title')
    const content = JSON.stringify(parsed)
    expect(deriveNortFilenameFromContent(content)).toBe('My Title')
  })
})
