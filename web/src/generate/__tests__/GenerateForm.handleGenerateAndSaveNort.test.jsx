import React from 'react'
import { render } from '@testing-library/react'
import { vi, expect, it, beforeEach, afterEach, describe } from 'vitest'
import GenerateForm from '../GenerateForm'

// Provide module-scoped fakeBody that the mocked useNortBuilder will return
let fakeBody = null
vi.mock('../hooks/useNortBuilder', () => ({
  default: () => ({
    buildNortContentRequest: () => ({ requestOptions: { body: fakeBody } }),
  }),
}))

const downloadMock = vi.fn()
vi.mock('../responseHandlers', () => ({ downloadNortContent: (...args) => downloadMock(...args) }))

// Ensure uiOptions hook provides minimal UI labels and uiLoaded
vi.mock('../hooks/useUiOptions', () => ({
  default: () => ({
    initializeUiForLanguage: () => Promise.resolve({ defaults: {} }),
    artPacks: [],
    setArtPacks: () => {},
    textures: [],
    setTextures: () => {},
    borderTypes: [],
    setBorderTypes: () => {},
    allBooks: [],
    setAllBooks: () => {},
    uiI18n: { labels: { 'ui.section.then': 'Then', 'ui.loading': 'Loading' } },
    setUiI18n: () => {},
    uiOptions: {},
    setUiOptions: () => {},
    uiLoaded: true,
  }),
  loadUiOptions: () => Promise.resolve(null),
  loadCityIconTypes: () => Promise.resolve([]),
}))

describe('handleGenerateAndSaveNort branches', () => {
  beforeEach(() => {
    fakeBody = null
    downloadMock.mockReset()
    globalThis.showToast = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete globalThis.showToast
  })

  it('shows warning when no body present', async () => {
    fakeBody = null
    render(<GenerateForm uiLanguage="en" />)
    // call exposed handler
    await globalThis.__test_handleGenerateAndSaveNort({ preventDefault: () => {} })
    expect(globalThis.showToast).toHaveBeenCalled()
    // Ensure download not called
    expect(downloadMock).not.toHaveBeenCalled()
  })

  it('shows warning when body is string but invalid JSON', async () => {
    fakeBody = 'not-a-json'
    render(<GenerateForm uiLanguage="en" />)
    await globalThis.__test_handleGenerateAndSaveNort({ preventDefault: () => {} })
    expect(globalThis.showToast).toHaveBeenCalled()
    expect(downloadMock).not.toHaveBeenCalled()
  })

  it('downloads when body is FormData-like with nortFile', async () => {
    // body.get('nortFile') should return an object with text()
    const fileObj = { text: () => Promise.resolve('{"settings":{}}') }
    fakeBody = {
      get: (k) => (k === 'nortFile' ? fileObj : null),
    }
    render(<GenerateForm uiLanguage="en" />)
    await globalThis.__test_handleGenerateAndSaveNort({ preventDefault: () => {} })
    // Wait a tick for async handlers
    expect(downloadMock).toHaveBeenCalled()
    expect(globalThis.showToast).toHaveBeenCalled()
  })
})
