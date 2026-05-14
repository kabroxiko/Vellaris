import { buildFormDataFromParsedJson, buildFormDataFromFormData } from './requestHelpers'
import { describe, it, expect } from 'vitest'

describe('requestHelpers', () => {
  it('buildFormDataFromParsedJson appends nortFile and optional fields', () => {
    const parsed = { nortContent: 'abc', width: 100, height: 200, randomSeed: 42 }
    const form = buildFormDataFromParsedJson(parsed)
    const file = form.get('nortFile')
    expect(file).toBeTruthy()
    expect(form.get('width')).toBe('100')
    expect(form.get('height')).toBe('200')
    expect(form.get('randomSeed')).toBe('42')
  })

  it('buildFormDataFromParsedJson skips empty optional fields', () => {
    const parsed = { nortContent: 'x', width: '', height: null }
    const form = buildFormDataFromParsedJson(parsed)
    expect(form.get('width')).toBeNull()
    expect(form.get('height')).toBeNull()
    expect(form.get('randomSeed')).toBeNull()
  })

  it('buildFormDataFromFormData copies only allowed keys', () => {
    const original = new FormData()
    original.append('nortFile', new Blob(['n']))
    original.append('width', '50')
    original.append('foo', 'bar')
    const form = buildFormDataFromFormData(original)
    expect(form.get('nortFile')).toBeTruthy()
    expect(form.get('width')).toBe('50')
    expect(form.get('foo')).toBeNull()
  })
})
