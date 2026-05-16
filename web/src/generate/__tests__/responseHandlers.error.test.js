import { describe, it, expect, vi } from 'vitest'
import { processGenerateResponse } from '../responseHandlers'

describe('responseHandlers error paths', () => {
  beforeEach(() => {
    globalThis.showToast = vi.fn()
    globalThis.URL.createObjectURL = vi.fn(() => 'blob://x')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('throws when JSON image response missing imageBase64 string', async () => {
    const data = JSON.stringify({ imageBase64: 123 })
    await expect(
      processGenerateResponse(new TextEncoder().encode(data), 'application/json', {
        outputMode: 'image',
        baseName: null,
        source: null,
        fileName: null,
        setPreview: () => {},
        setCurrentSource: () => {},
      })
    ).rejects.toThrow()
    expect(globalThis.showToast).toHaveBeenCalled()
  })

  it('throws when nort-only JSON lacks nortContent', async () => {
    const data = JSON.stringify({ some: 'thing' })
    await expect(
      processGenerateResponse(new TextEncoder().encode(data), 'application/json', {
        outputMode: 'nort-only',
        baseName: null,
        source: null,
        fileName: null,
        setPreview: () => {},
        setCurrentSource: () => {},
      })
    ).rejects.toThrow()
    expect(globalThis.showToast).toHaveBeenCalled()
  })
})
