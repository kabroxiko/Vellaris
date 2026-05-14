import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchJson } from '../helpers.js'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('fetchJson', () => {
  it('resolves JSON when ok', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ a: 1 }) }))
    const out = await fetchJson('/x')
    expect(out).toEqual({ a: 1 })
  })

  it('rejects when not ok', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false }))
    await expect(fetchJson('/bad')).rejects.toThrow()
  })
})
