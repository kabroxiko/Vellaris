import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadRandomOverrides,
  loadCustomizeOverrides,
  persistCustomizeOverrides,
} from '../GenerateForm.helpers'

beforeEach(() => {
  localStorage.clear()
})

describe('localStorage helpers', () => {
  it('loadRandomOverrides returns parsed object or empty object', () => {
    expect(loadRandomOverrides()).toEqual({})
    localStorage.setItem('vellaris-random-manual-overrides', JSON.stringify({ foo: 'bar' }))
    expect(loadRandomOverrides()).toEqual({ foo: 'bar' })
  })

  it('loadCustomizeOverrides and persistCustomizeOverrides roundtrip', () => {
    expect(loadCustomizeOverrides()).toEqual({})
    const values = { a: 1, b: 'x' }
    persistCustomizeOverrides(values)
    const raw = localStorage.getItem('vellaris-customize-overrides')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw)
    // payload may omit undefined fields; ensure roundtrip reads back same stored object
    expect(loadCustomizeOverrides()).toEqual(parsed)
  })
})
