import { describe, it, expect } from 'vitest'
import { pick, stripHtmlWrapper, removeTags } from '../CustomizeSettingsSection'

describe('CustomizeSettingsSection utils', () => {
  it('pick returns only specified keys present in object', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const out = pick(obj, ['a', 'c', 'd'])
    expect(out).toEqual({ a: 1, c: 3 })
  })

  it('stripHtmlWrapper removes surrounding <html> wrappers and trims', () => {
    const s = '   <html>  Hello<br/>World  </html>   '
    const out = stripHtmlWrapper(s)
    expect(out).toBe('Hello<br/>World')
  })

  it('removeTags strips tags but preserves text', () => {
    const s = '<p>Hello <strong>there</strong> world</p>'
    const out = removeTags(s)
    expect(out).toBe('Hello there world')
  })
})
