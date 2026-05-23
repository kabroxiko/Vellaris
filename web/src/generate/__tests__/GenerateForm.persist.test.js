import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildCustomizePayload, persistCustomizeOverrides } from '../GenerateForm.helpers'

describe('GenerateForm persistCustomizeOverrides', () => {
  let originalLocalStorage

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage
    globalThis.localStorage = { setItem: vi.fn(), getItem: vi.fn() }
  })

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  it('calls localStorage.setItem with serialized payload', () => {
    const values = {
      backgroundType: 'SolidColor',
      width: 100,
      height: 200,
      drawText: true,
      textColor: '#112233',
    }
    const payload = buildCustomizePayload(values)
    persistCustomizeOverrides(values)
    expect(globalThis.localStorage.setItem).toHaveBeenCalled()
    const [key, stored] = globalThis.localStorage.setItem.mock.calls[0]
    expect(typeof key).toBe('string')
    expect(JSON.parse(stored)).toEqual(payload)
  })
})
