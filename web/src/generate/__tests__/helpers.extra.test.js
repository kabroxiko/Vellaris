import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appendIfSet, fetchJson, tryParseJson } from '../helpers.js'
import { base64ToBlob, formatColorString } from '../utils.js'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('small helpers', () => {
  it('appendIfSet appends when value present', () => {
    const fd = { append: vi.fn() }
    appendIfSet(fd, 'k', 'v')
    expect(fd.append).toHaveBeenCalledWith('k', 'v')
    appendIfSet(fd, 'k2', '')
    expect(fd.append).not.toHaveBeenCalledWith('k2', '')
  })

  it('formatColorString returns r,g,b,a for hex input', () => {
    expect(formatColorString('#010203', 50)).toBe('1,2,3,128')
    expect(formatColorString('not-a-hex', 50)).toBeNull()
  })

  it('base64ToBlob decodes base64 to Blob', () => {
    // 'A' -> 0x41
    const b = base64ToBlob('QQ==', 'text/plain')
    expect(b).toBeInstanceOf(Blob)
  })

  it('tryParseJson returns object or null', () => {
    expect(tryParseJson('{"x":1}')).toEqual({ x: 1 })
    expect(tryParseJson('bad')).toBeNull()
  })
})
