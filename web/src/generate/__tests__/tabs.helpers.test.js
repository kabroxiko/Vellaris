import { describe, it, expect } from 'vitest'
import { sanitizeFilenameBase } from '../sharedHelpers'

describe('tabs helper quick tests', () => {
  it('sanitizeFilenameBase replaces illegal chars and collapses whitespace', () => {
    const s = sanitizeFilenameBase(' My: File/Name *with?chars ')
    // implementation replaces illegal chars then collapses whitespace,
    // which can produce adjacent hyphens where punctuation and spaces meet
    expect(s).toBe('My--File-Name--with-chars')
  })
})
