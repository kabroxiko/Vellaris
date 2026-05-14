import backgroundBaseCache from '../backgroundBaseCache.js'

describe('backgroundBaseCache module', () => {
  beforeEach(() => {
    // mock URL helpers
    globalThis.URL = globalThis.URL || {}
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:1')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches once and caches blob, clear revokes object URL', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['ok']) })
    globalThis.fetch = fetchSpy

    const payload = { width: 10, height: 20, type: 't', artPack: 'ap', cityIconType: 'c' }
    const b1 = await backgroundBaseCache.get(payload)
    expect(b1).toBeInstanceOf(Blob)
    const b2 = await backgroundBaseCache.get(payload)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(b2).toBe(b1)

    backgroundBaseCache.clear()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled()

    // after clear, fetching again should call fetch
    fetchSpy.mockClear()
    const b3 = await backgroundBaseCache.get(payload)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(b3).toBeInstanceOf(Blob)
  })
})
