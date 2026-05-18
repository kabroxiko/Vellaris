import { describe, it, beforeEach, expect, vi } from 'vitest'
import { downloadNortContent } from '../responseHandlers.js'

beforeEach(() => {
  vi.restoreAllMocks()
  globalThis.URL.createObjectURL = vi.fn(() => 'blob://1')
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('downloadNortContent', () => {
  it('creates an anchor and triggers download for JSON string with title', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const originalCreate = document.createElement.bind(document)
    const createElSpy = vi.spyOn(document, 'createElement')
    // Mock anchor element behavior without recursion
    createElSpy.mockImplementation((tag) => {
      if (tag === 'a') {
        const a = originalCreate('a')
        a.click = vi.fn()
        return a
      }
      return originalCreate(tag)
    })

    const parsed = { edits: { textEdits: [{ type: 'Title', text: 'T' }] } }
    downloadNortContent(JSON.stringify(parsed), null)
    expect(appendSpy).toHaveBeenCalled()
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled()
  })
})
