import { vi } from 'vitest'

vi.mock('./utils', () => ({ base64ToBlob: vi.fn(() => new Blob(['x'])) }))
vi.mock('./helpers', () => ({
  tryParseJson: (s) => {
    try {
      return JSON.parse(s)
    } catch {
      return null
    }
  },
}))
vi.mock('./sharedHelpers', () => ({ findTitle: (p) => p?.edits?.textEdits?.[0]?.text ?? null }))

import { downloadNortContent, handleSuccess, processGenerateResponse } from '../responseHandlers.js'

describe('responseHandlers', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:1')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('downloadNortContent creates anchor and revokes URL', () => {
    const anchor = { click: vi.fn(), remove: vi.fn() }
    const appended = []
    const originalCreate = document.createElement
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'a' ? anchor : originalCreate(tag)
    )
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => appended.push(el))

    downloadNortContent('{"edits":{"textEdits":[{"type":"Title","text":"T"}]}}')

    expect(anchor.click).toHaveBeenCalled()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled()

    // restore spies
    document.createElement.mockRestore()
    document.body.appendChild.mockRestore()
  })

  it('handleSuccess sets preview and current source', () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    const state = {}
    const setPreview = vi.fn((fn) => {
      state.preview = fn(null)
      return state.preview
    })
    const setCurrentSource = vi.fn((v) => {
      state.current = v
      return v
    })

    handleSuccess(blob, {
      baseName: 'base',
      source: { type: 'random' },
      fileName: 'f',
      setPreview,
      setCurrentSource,
    })

    expect(setPreview).toHaveBeenCalled()
    expect(state.preview.url).toBe('blob:1')
    expect(state.preview.filename).toBe('base.png')
    expect(setCurrentSource).toHaveBeenCalled()
  })

  it('processGenerateResponse handles non-json image bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const setPreview = vi.fn((fn) => fn(null))
    const setCurrentSource = vi.fn()
    await processGenerateResponse(bytes, 'image/png', {
      outputMode: 'image',
      setPreview,
      setCurrentSource,
    })
    expect(setPreview).toHaveBeenCalled()
  })
})
