import { describe, it, expect, beforeEach, vi } from 'vitest'
import cacheModule from '../backgroundBaseCache.js'

beforeEach(() => {
  vi.restoreAllMocks()
  globalThis.fetch = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x']) }))
  globalThis.URL.createObjectURL = vi.fn(() => 'blob://1')
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('backgroundBaseCache basic behavior', () => {
  it('get returns a blob and clear revokes object URLs', async () => {
    const payload = { width: 100, height: 200, type: 't' }
    const result = await cacheModule.get(payload)
    expect(result).toBeInstanceOf(Blob)
    // ensure cache clear doesn't throw and revokes URLs
    cacheModule.clear()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled()
  })
})
