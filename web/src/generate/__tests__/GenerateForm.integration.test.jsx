import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
// Note: GenerateForm is imported dynamically inside tests so Vitest mocks
// can be applied before module evaluation.

// Mock hooks and child components before importing GenerateForm
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
    uiI18n: { labels: { 'ui.loading': 'Loading', 'ui.section.then': 'Then' } },
    setUiI18n: () => {},
    uiOptions: {},
    setUiOptions: () => {},
    uiLoaded: true,
  }),
  loadUiOptions: () => Promise.resolve(null),
  loadCityIconTypes: () => Promise.resolve([]),
}))

vi.mock('../hooks/useNortBuilder', () => ({
  default: () => ({ buildNortContentRequest: () => ({ requestOptions: { body: JSON.stringify({ settings: { foo: 1 } }) } }) }),
}))

// Minimal mocks for other hooks used by GenerateForm so it mounts cleanly
// `runGenerateMock` will be used by tests that assert generate was invoked.
const runGenerateMock = vi.fn(async () => {})
vi.mock('../hooks/useGenerate', () => ({ default: () => runGenerateMock }))
vi.mock('../hooks/useRandomSettings', () => ({ default: () => ({ randomOverrides: {}, updateRandomOverride: () => {}, makeRandomHandler: () => () => {}, booksLoadedRef: { current: false }, handleSelectedBooksChange: () => {} }) }))
vi.mock('../hooks/useCustomizeSettings', () => ({ default: () => ({ values: {}, setters: {}, customizeDeps: [] }) }))
vi.mock('../hooks/useFileHandler', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual }
})
vi.mock('../hooks/usePreview', () => ({ default: () => ({ preview: null, handleSuccess: () => {}, openPreviewModal: () => {}, handleDownloadMap: () => {} }) }))
vi.mock('../hooks/useDoRandomMap', () => ({ default: () => ({ doRandomMap: () => Promise.resolve() }) }))
vi.mock('../hooks/useRunGenerateFromSource', () => ({ default: () => ({ runGenerateFromCurrentSource: () => Promise.resolve() }) }))
vi.mock('../hooks/useSettingsAppliers', () => ({ default: () => ({ appliersRef: { current: { applyMapSizeAndSeedSettings: () => {}, applyBackgroundTypeSettings: () => {}, applyColorAndBoundarySettings: () => {}, applyBorderSettings: () => {}, applyFrayedBorderSettings: () => {}, applyCoastlineSettings: () => {}, applyOceanSettings: () => {}, applyRoadAndScaleSettings: () => {}, applyTextSettings: () => {} } } }) }))

// Mock child sections to a minimal render - CustomizeSettingsSection will render a button to trigger download handler
vi.mock('./CustomizeSettingsSection', () => ({
  default: (props) => React.createElement('div', {}, React.createElement('button', { onClick: () => props.handlers?.handleGenerateAndSaveNort?.({ preventDefault: () => {} }) }, 'Download Settings')),
}))
vi.mock('./RandomSettingsSection', () => ({ default: () => React.createElement('div', {}, 'RandomSection') }))

describe('GenerateForm integration (light)', () => {
  beforeEach(() => {
    // ensure global test hooks removed
    delete globalThis.__test_buildNortContentRequest
    delete globalThis.__test_handleGenerateAndSaveNort
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading when uiLoaded is false', async () => {
    // Override useUiOptions to return uiLoaded:false for this test
    const useUi = await import('../hooks/useUiOptions')
    vi.spyOn(useUi, 'default').mockImplementation(() => ({
      initializeUiForLanguage: () => Promise.resolve({ defaults: {} }),
      uiLoaded: false,
      uiI18n: { labels: { 'ui.loading': 'Please wait' } },
    }))
    const { default: GenerateForm } = await import('../GenerateForm')
    const { findByText } = render(React.createElement(GenerateForm, { uiLanguage: 'en' }))
    const el = await findByText('Please wait')
    expect(el).toBeTruthy()
  })

  it('exposes buildNortContentRequest via globalThis', () => {
    // import GenerateForm after mocks are applied
    return import('../GenerateForm').then(({ default: GenerateForm }) => {
      render(React.createElement(GenerateForm, { uiLanguage: 'en' }))
      expect(typeof globalThis.__test_buildNortContentRequest).toBe('function')
      const res = globalThis.__test_buildNortContentRequest()
      expect(res.requestOptions).toBeTruthy()
    })
  })

  it('Download Settings button triggers internal handler', () => {
    return import('../GenerateForm').then(({ default: GenerateForm }) => {
      render(React.createElement(GenerateForm, { uiLanguage: 'en' }))
      // global handler should be available and callable
      expect(typeof globalThis.__test_handleGenerateAndSaveNort).toBe('function')
      // click the mocked button rendered by CustomizeSettingsSection
      const btn = document.querySelector('button')
      expect(btn).toBeTruthy()
      fireEvent.click(btn)
      // handler should run without throwing
      expect(typeof globalThis.__test_handleGenerateAndSaveNort).toBe('function')
    })
  })
})

// Prepare a deterministic UI options payload returned by the backend
const uiOpts = {
  books: ['a'],
  artPacks: ['nortantis'],
  textures: [],
  borderTypes: [],
  defaults: { generatedWidth: 640, generatedHeight: 480 },
  labels: {
    'ui.button.regenerate': 'Regenerate',
    'ui.generating': 'Generating',
    'ui.button.downloadSettings': 'Download Settings',
  },
  options: { tabs: [{ id: 'background', label: 'Background' }] },
}

// Partially mock ../helpers to override network call while preserving other helpers
vi.mock('../helpers', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchJson: () => Promise.resolve(uiOpts),
  }
})

// Mock frontend labels merge to return simple labels
vi.mock('../../i18n/webLabels', async (importOriginal) => ({
  constActual: await importOriginal(),
  getFrontendLabels: () =>
    Promise.resolve({ 'ui.button.regenerate': 'Regenerate', 'ui.generating': 'Generating' }),
}))

// (useGenerate mock is declared above)

describe('GenerateForm integration (file upload -> generate)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  beforeEach(() => {
    // Ensure fetch returns responses appropriate for each endpoint.
    // /generate-settings -> text() with nort content
    // /background-base -> blob() for image data
    vi.stubGlobal('fetch', async (url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || String(url)
      if (urlStr.includes('/generate-settings')) {
        return { ok: true, text: async () => JSON.stringify({ example: 'ok' }) }
      }
      if (urlStr.includes('/background-base')) {
        return { ok: true, blob: async () => new Blob([''], { type: 'image/png' }) }
      }
      // Default: return a simple text response
      return { ok: true, text: async () => JSON.stringify({}) }
    })
  })

  it('uploads a .nort file and triggers runGenerate', async () => {
    const { default: GenerateForm } = await import('../GenerateForm')
    const { container } = render(React.createElement(GenerateForm, { uiLanguage: 'en' }))

    // Wait for the Regenerate button to appear (UI loaded)
    const regen = await screen.findByRole('button', { name: /Regenerate/i })
    expect(regen).toBeTruthy()

    // locate the hidden file input and simulate file selection
    const input = container.querySelector('#nort-file-input')
    expect(input).toBeTruthy()

    const fileContent = JSON.stringify({ example: 'ok' })
    const testFile = new File([fileContent], 'test.nort', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [testFile] } })

    // Now click Regenerate
    fireEvent.click(regen)

    await waitFor(() => expect(runGenerateMock).toHaveBeenCalled())
    const callArg = runGenerateMock.mock.calls[0][0]
    expect(callArg).toBeDefined()
    // ensure body contains our nort payload
    const body = callArg.body
    expect(typeof body === 'string').toBe(true)
    const parsed = JSON.parse(body)
    expect(parsed.example).toBe('ok')
  })
})
