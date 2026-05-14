import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processGenerateResponse } from '../responseHandlers'

describe('responseHandlers - processGenerateResponse', () => {
  let originalShowToast

  beforeEach(() => {
    originalShowToast = globalThis.showToast
    globalThis.showToast = vi.fn()
    // Mock URL and document behaviors used by handleSuccess/downloadNortContent
    globalThis.URL = globalThis.URL || {}
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake')
    globalThis.URL.revokeObjectURL = vi.fn()
    // Ensure appendChild is safe to call in JSDOM environment
    globalThis.document = globalThis.document || {}
    if (!globalThis.document.body) globalThis.document.body = {}
    globalThis.document.body.appendChild = vi.fn()
  })

  afterEach(() => {
    globalThis.showToast = originalShowToast
    vi.restoreAllMocks()
  })

  it('calls setPreview for non-JSON image bytes', async () => {
    const setPreview = vi.fn()
    const setCurrentSource = vi.fn()
    const options = { outputMode: 'image', baseName: null, source: null, fileName: null, setPreview, setCurrentSource }
    const bytes = new Uint8Array([1, 2, 3])

    await processGenerateResponse(bytes, 'image/png', options)

    expect(setPreview).toHaveBeenCalled()
  })

  it('parses JSON image response and sets preview', async () => {
    const setPreview = vi.fn()
    const setCurrentSource = vi.fn()
    const payload = { imageBase64: 'ZmFrZQ==', nortContent: '{"foo":1}' }
    const bytes = new TextEncoder().encode(JSON.stringify(payload))
    const options = { outputMode: 'image', baseName: null, source: null, fileName: null, setPreview, setCurrentSource }

    await processGenerateResponse(bytes, 'application/json', options)

    expect(setPreview).toHaveBeenCalled()
  })

  it('parses JSON nort-only response and sets current source', async () => {
    const setPreview = vi.fn()
    const setCurrentSource = vi.fn()
    const payload = { nortContent: '{"edits":{}}' }
    const bytes = new TextEncoder().encode(JSON.stringify(payload))
    const options = { outputMode: 'nort-only', baseName: 'base', source: null, fileName: null, setPreview, setCurrentSource }

    await processGenerateResponse(bytes, 'application/json', options)

    expect(setCurrentSource).toHaveBeenCalled()
  })
})
