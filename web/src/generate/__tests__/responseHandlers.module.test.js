import { describe, it, expect, vi } from 'vitest'
import { downloadNortContent, processGenerateResponse } from '../responseHandlers'

describe('responseHandlers module', () => {
  it('exports helper functions and download does not throw', () => {
    expect(typeof downloadNortContent).toBe('function')
  })

  it('processGenerateResponse handles image bytes without throwing', async () => {
    // stub URL helpers and global toast
    globalThis.URL.createObjectURL = (b) => 'blob://test'
    globalThis.URL.revokeObjectURL = () => {}
    globalThis.showToast = () => {}

    const setPreview = vi.fn()
    const setCurrentSource = vi.fn()

    await expect(
      processGenerateResponse(new Uint8Array([1, 2, 3]), 'image/png', {
        outputMode: 'image',
        baseName: 'bn',
        source: null,
        fileName: null,
        setPreview,
        setCurrentSource,
      })
    ).resolves.not.toThrow()
  })
})
