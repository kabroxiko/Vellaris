import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as RH from '../responseHandlers.js'

vi.mock('./utils', () => ({ base64ToBlob: vi.fn(() => new Blob(['x'])) }))
vi.mock('./helpers', () => ({ tryParseJson: (s) => {
  try { return JSON.parse(s) } catch { return null }
} }))

describe('responseHandlers extra coverage', () => {
  beforeEach(() => {
    // URL helpers
    globalThis.URL = globalThis.URL || {}
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:extra')
    globalThis.URL.revokeObjectURL = vi.fn()
    // DOM anchor
    const anchor = { click: vi.fn(), remove: vi.fn(), set download(v) { this._download = v }, get download() { return this._download } }
    vi.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'a' ? anchor : document.createElement.__orig(tag)))
    // ensure appendChild doesn't throw
    document.body.appendChild = vi.fn()
    // preserve original for restore
    if (!document.createElement.__orig) document.createElement.__orig = document.createElement.__original || document.createElement
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('downloadNortContent falls back to generated-settings when title missing', () => {
    // FindTitle is not mocked here; tryParse returns an object but no title -> fallback
    // call the function
    const anchor = { click: vi.fn(), remove: vi.fn() }
    // Provide a simple mock for createElement that returns an object we can inspect
    const origCreate = document.createElement
    vi.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'a' ? anchor : origCreate(tag)))

    RH.downloadNortContent(JSON.stringify({ a: 1 }))

    // anchor.download should have been set to generated-settings.nort
    expect(anchor.download).toBe('generated-settings.nort')

    document.createElement.mockRestore()
  })

  it('handleSuccess preserves nortContent for random origin when prev has nortContent', () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    // setPreview mimics React state setter that takes an updater
    const previous = { url: 'old', nortContent: 'prev' }
    const setPreview = vi.fn((updater) => updater(previous))

    let setCurrentResult = null
    const setCurrentSource = (arg) => {
      if (typeof arg === 'function') {
        setCurrentResult = arg({ nortContent: 'prev' })
      } else setCurrentResult = arg
      return setCurrentResult
    }

    RH.handleSuccess(blob, {
      baseName: null,
      source: { originType: 'random' },
      fileName: null,
      setPreview,
      setCurrentSource,
    })

    expect(setPreview).toHaveBeenCalled()
    // when originType is random and prev has nortContent, the previous should be preserved
    expect(setCurrentResult).toEqual({ nortContent: 'prev' })
  })

  it('processGenerateResponse surfaces downloadNortContent errors and triggers showToast', async () => {
    // Make DOM anchor creation throw so downloadNortContent fails
    vi.spyOn(document, 'createElement').mockImplementation(() => { throw new Error('dlfail') })
    globalThis.showToast = vi.fn()

    const payload = { nortContent: '{"edits":{}}' }
    const bytes = new TextEncoder().encode(JSON.stringify(payload))

    await expect(
      RH.processGenerateResponse(bytes, 'application/json', {
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
