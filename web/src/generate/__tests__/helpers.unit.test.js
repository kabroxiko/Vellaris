import { describe, it, expect } from 'vitest'
import { stringValueOrEmpty, seedStringOrEmpty, selectCityIconType, dimensionFromSize, tryParseJson, appendIfSet, handleResponseError } from '../helpers'

describe('helpers pure functions', () => {
  it('stringValueOrEmpty and seedStringOrEmpty behave', () => {
    expect(stringValueOrEmpty('abc')).toBe('abc')
    expect(stringValueOrEmpty(1)).toBe('')
    expect(seedStringOrEmpty(0)).toBe('0')
    expect(seedStringOrEmpty('')).toBe('')
  })

  it('selectCityIconType and dimensionFromSize', () => {
    expect(selectCityIconType('x', ['a', 'b'])).toBe('')
    expect(selectCityIconType('a', ['a', 'b'])).toBe('a')
    expect(dimensionFromSize(4096, 4096)).toBe('Square')
    expect(dimensionFromSize(4096, 2304)).toBe('Sixteen_by_9')
    expect(dimensionFromSize(100, 100)).toBe('')
  })

  it('tryParseJson returns parsed object or null', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 })
    expect(tryParseJson('   ')).toBeNull()
    expect(tryParseJson('nope')).toBeNull()
    expect(tryParseJson({ foo: 1 })).toEqual({ foo: 1 })
  })

  it('appendIfSet appends only when set', () => {
    const fd = { calls: [], append: function(k, v) { this.calls.push([k, v]) } }
    appendIfSet(fd, 'k', 'v')
    appendIfSet(fd, 'k2', '')
    appendIfSet(fd, 'k3', null)
    expect(fd.calls).toEqual([['k', 'v']])
  })

  it('handleResponseError extracts message and throws', async () => {
    const headers = new Map([['x', 'y']])
    const res = {
      status: 400,
      headers: { entries: () => headers.entries() },
      text: async () => JSON.stringify({ message: 'Bad stuff' }),
    }

    await expect(handleResponseError(res)).rejects.toThrow(/Server returned 400: Bad stuff/)
  })
})
