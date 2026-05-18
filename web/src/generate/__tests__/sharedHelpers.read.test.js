import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readResponseBytesWithProgress } from '../sharedHelpers.js'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('readResponseBytesWithProgress', () => {
  it('reads via arrayBuffer when no reader', async () => {
    const data = new Uint8Array([1, 2, 3])
    const res = { arrayBuffer: async () => data.buffer }
    const onStart = vi.fn()
    const out = await readResponseBytesWithProgress(res, onStart)
    // implementation always calls progress callback
    expect(onStart).toHaveBeenCalled()
    expect(out).toBeInstanceOf(Uint8Array)
    expect(Array.from(out)).toEqual([1, 2, 3])
  })

  it('reads stream via reader when available', async () => {
    const chunks = [new Uint8Array([4, 5]), new Uint8Array([6])]
    let i = 0
    const reader = {
      read: async () => {
        if (i >= chunks.length) return { done: true }
        const v = chunks[i++]
        return { done: false, value: v }
      },
    }
    const res = { body: { getReader: () => reader } }
    const onStart = vi.fn()
    const out = await readResponseBytesWithProgress(res, onStart)
    expect(onStart).toHaveBeenCalled()
    expect(Array.from(out)).toEqual([4, 5, 6])
  })
})
