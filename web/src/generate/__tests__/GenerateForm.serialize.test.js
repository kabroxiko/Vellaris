import { describe, it, expect } from 'vitest'
import { serializeNortObject } from '../GenerateForm.helpers'

describe('serializeNortObject', () => {
  it('sorts object keys recursively when serializing', () => {
    const obj = { b: 1, a: { d: 4, c: 3 } }
    const s = serializeNortObject(obj)
    // 'a' should appear before 'b' and within 'a' 'c' before 'd'
    expect(s.indexOf('\n  "a"')).toBeLessThan(s.indexOf('\n  "b"'))
    expect(s.indexOf('\n    "c"')).toBeLessThan(s.indexOf('\n    "d"'))
  })
})
