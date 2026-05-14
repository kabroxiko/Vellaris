import { describe, it, expect } from 'vitest'
import {
  stringValueOrEmpty,
  seedStringOrEmpty,
  selectCityIconType,
  dimensionFromSize,
  tryParseJson,
} from '../helpers.js'

describe('helpers.js - pure helpers', () => {
  it('stringValueOrEmpty returns strings or empty', () => {
    expect(stringValueOrEmpty('hello')).toBe('hello')
    expect(stringValueOrEmpty('')).toBe('')
    expect(stringValueOrEmpty(null)).toBe('')
  })

  it('seedStringOrEmpty coerces defined values', () => {
    expect(seedStringOrEmpty(0)).toBe('0')
    expect(seedStringOrEmpty('seed')).toBe('seed')
    expect(seedStringOrEmpty(null)).toBe('')
  })

  it('selectCityIconType returns previous when available', () => {
    expect(selectCityIconType('a', ['a', 'b'])).toBe('a')
    expect(selectCityIconType('c', ['a', 'b'])).toBe('')
  })

  it('dimensionFromSize identifies known presets', () => {
    expect(dimensionFromSize(4096, 4096)).toBe('Square')
    expect(dimensionFromSize(4096, 2304)).toBe('Sixteen_by_9')
    expect(dimensionFromSize(4096, 2531)).toBe('Golden_Ratio')
    expect(dimensionFromSize(100, 200)).toBe('')
  })

  it('tryParseJson parses valid JSON and returns null for invalid', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 })
    expect(tryParseJson('   ')).toBeNull()
    expect(tryParseJson('not json')).toBeNull()
    const obj = { edits: [] }
    expect(tryParseJson(obj)).toBe(obj)
  })
})
