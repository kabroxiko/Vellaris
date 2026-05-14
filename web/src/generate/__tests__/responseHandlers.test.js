import { describe, it, expect, beforeEach, vi } from 'vitest'
import { processGenerateResponse } from '../responseHandlers.js'

beforeEach(() => {
  vi.restoreAllMocks()
  globalThis.showToast = vi.fn()
  globalThis.URL.createObjectURL = vi.fn(() => 'blob://1')
  globalThis.URL.revokeObjectURL = vi.fn()
  // polyfill atob for base64ToBlob usage
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary')
})

describe('processGenerateResponse image and json handling', () => {
  it('handles raw image bytes and calls setPreview', async () => {
    const setPreview = vi.fn()
    const setCurrentSource = vi.fn()
    const bytes = new TextEncoder().encode('PNGDATA')
    await processGenerateResponse(bytes, 'image/png', {
      outputMode: 'image',
      baseName: 'test',
      source: null,
      fileName: null,
      setPreview,
      setCurrentSource,
    })
    expect(setPreview).toHaveBeenCalled()
  })

  it('handles JSON with imageBase64 and sets preview', async () => {
    const setPreview = vi.fn()
    const setCurrentSource = vi.fn()
    const payload = { imageBase64: Buffer.from('PNGDATA').toString('base64'), nortContent: '{}' }
    const bytes = new TextEncoder().encode(JSON.stringify(payload))
    await processGenerateResponse(bytes, 'application/json', {
      outputMode: 'image',
      baseName: 'img',
      source: null,
      fileName: null,
      setPreview,
      setCurrentSource,
    })
    expect(setPreview).toHaveBeenCalled()
  })
})
