import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  stringValueOrEmpty,
  seedStringOrEmpty,
  selectCityIconType,
  dimensionFromSize,
  handleResponseError,
  tryParseJson,
  appendIfSet,
} from '../helpers'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('helpers additional coverage', () => {
  it('stringValueOrEmpty returns string for strings and empty otherwise', () => {
    expect(stringValueOrEmpty('abc')).toBe('abc')
    expect(stringValueOrEmpty('')).toBe('')
    expect(stringValueOrEmpty(null)).toBe('')
    expect(stringValueOrEmpty(123)).toBe('')
  })

  it('seedStringOrEmpty coerces values to string or empty', () => {
    expect(seedStringOrEmpty(undefined)).toBe('')
    expect(seedStringOrEmpty(null)).toBe('')
    expect(seedStringOrEmpty('')).toBe('')
    expect(seedStringOrEmpty(0)).toBe('0')
    expect(seedStringOrEmpty(42)).toBe('42')
  })

  it('selectCityIconType returns previous when present, otherwise empty', () => {
    expect(selectCityIconType('a', ['a', 'b'])).toBe('a')
    expect(selectCityIconType('x', ['a', 'b'])).toBe('')
    expect(selectCityIconType(null, ['a'])).toBe('')
  })

  it('dimensionFromSize recognizes common presets', () => {
    expect(dimensionFromSize(4096, 4096)).toBe('Square')
    expect(dimensionFromSize(4096, 2304)).toBe('Sixteen_by_9')
    expect(dimensionFromSize(4096, 2531)).toBe('Golden_Ratio')
    expect(dimensionFromSize(100, 200)).toBe('')
  })

  it('handleResponseError extracts JSON message and throws', async () => {
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const res = {
      headers: { entries: () => [['x', 'y']][Symbol.iterator]() },
      status: 500,
      text: async () => JSON.stringify({ message: 'boom' }),
    }

    await expect(handleResponseError(res)).rejects.toThrow('Server returned 500: boom')
    expect(mockError).toHaveBeenCalled()
    mockError.mockRestore()
    mockWarn.mockRestore()
  })

  it('handleResponseError handles non-JSON body and throws with condensed preview', async () => {
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = {
      headers: { entries: () => [][Symbol.iterator]() },
      status: 400,
      text: async () => '   lots\n\n of   whitespace   ',
    }

    await expect(handleResponseError(res)).rejects.toThrow(/Server returned 400:/)
    expect(mockError).toHaveBeenCalled()
    mockError.mockRestore()
  })
})
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
    const fd = {
      calls: [],
      append: function (k, v) {
        this.calls.push([k, v])
      },
    }
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
