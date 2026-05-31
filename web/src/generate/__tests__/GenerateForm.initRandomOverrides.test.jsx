import React from 'react'
import { render } from '@testing-library/react'
import { vi, expect, it, beforeEach, afterEach } from 'vitest'
import GenerateForm from '../GenerateForm'

// We'll mock useGenerate to avoid network calls
vi.mock('../hooks/useGenerate', () => ({ default: () => () => Promise.resolve() }))
// Provide a module-scoped initMock so the mock factory can reference it.
let initMock = (..._args) => Promise.resolve({ defaults: {} })

// Mock useUiOptions at module level; initializeUiForLanguage will delegate to current initMock
vi.mock('../hooks/useUiOptions', () => ({
  default: () => ({
    initializeUiForLanguage: (...args) => initMock(...args),
    artPacks: [],
    setArtPacks: () => {},
    textures: [],
    setTextures: () => {},
    borderTypes: [],
    setBorderTypes: () => {},
    allBooks: [],
    setAllBooks: () => {},
    uiI18n: { labels: { 'ui.section.then': 'Then' } },
    setUiI18n: () => {},
    uiOptions: {},
    setUiOptions: () => {},
    uiLoaded: true,
  }),
  loadUiOptions: (..._args) => {},
  loadCityIconTypes: (..._args) => Promise.resolve([]),
}))

describe('GenerateForm initialRandomOverrides parsing', () => {

  beforeEach(() => {
    // Reset localStorage and override initMock for each test
    localStorage.clear()
    initMock = vi.fn((..._args) => Promise.resolve({ defaults: {} }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('parses JSON string stored in localStorage', async () => {
    localStorage.setItem('vellaris-map-language', JSON.stringify('es'))
    render(<GenerateForm uiLanguage="en" />)
    // Wait for initializeUiForLanguage to be called
    await vi.waitFor(() => expect(initMock).toHaveBeenCalled())
    const calledWith = initMock.mock.calls[0][1]
    expect(calledWith.initialRandomOverrides).toEqual({ mapLanguage: 'es' })
  })

  it('uses raw string when stored as plain value', async () => {
    localStorage.setItem('vellaris-map-language', 'fr')
    render(<GenerateForm uiLanguage="en" />)
    await vi.waitFor(() => expect(initMock).toHaveBeenCalled())
    const calledWith = initMock.mock.calls[0][1]
    expect(calledWith.initialRandomOverrides).toEqual({ mapLanguage: 'fr' })
  })

  it('falls back to raw value and warns on malformed JSON', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // malformed JSON
    localStorage.setItem('vellaris-map-language', '{"invalid":')
    render(<GenerateForm uiLanguage="en" />)
    await vi.waitFor(() => expect(initMock).toHaveBeenCalled())
    const calledWith = initMock.mock.calls[0][1]
    expect(calledWith.initialRandomOverrides).toEqual({ mapLanguage: '{"invalid":' })
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
