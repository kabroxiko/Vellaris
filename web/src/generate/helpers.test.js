import { dimensionFromSize, selectCityIconType, tryParseJson, appendIfSet, stringValueOrEmpty, seedStringOrEmpty } from './helpers'
import { describe, it, expect } from 'vitest'

describe('helpers', () => {
  it('dimensionFromSize recognizes known presets', () => {
    expect(dimensionFromSize(4096, 4096)).toBe('Square')
    expect(dimensionFromSize(4096, 2304)).toBe('Sixteen_by_9')
    expect(dimensionFromSize(4096, 2531)).toBe('Golden_Ratio')
    expect(dimensionFromSize(100, 100)).toBe('')
  })

  it('selectCityIconType returns previous when available', () => {
    expect(selectCityIconType('a', ['a', 'b'])).toBe('a')
    expect(selectCityIconType('x', ['a', 'b'])).toBe('')
  })

  it('tryParseJson handles valid, invalid and non-string inputs', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 })
    expect(tryParseJson('')).toBeNull()
    expect(tryParseJson('notjson')).toBeNull()
    const obj = { x: 1 }
    expect(tryParseJson(obj)).toBe(obj)
  })

  it('appendIfSet appends only non-empty values', () => {
    const fd = new FormData()
    appendIfSet(fd, 'k1', 'v')
    appendIfSet(fd, 'k2', '')
    appendIfSet(fd, 'k3', null)
    expect(fd.get('k1')).toBe('v')
    expect(fd.get('k2')).toBeNull()
    expect(fd.get('k3')).toBeNull()
  })

  it('string and seed helpers normalize values', () => {
    expect(stringValueOrEmpty('x')).toBe('x')
    expect(stringValueOrEmpty(null)).toBe('')
    expect(seedStringOrEmpty(0)).toBe('0')
    expect(seedStringOrEmpty('')).toBe('')
  })
})
