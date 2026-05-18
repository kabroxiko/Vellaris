import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Finally import the component under test
import GenerateForm from '../GenerateForm'

// Provide a minimal localStorage polyfill for environments without jsdom
if (globalThis.localStorage === undefined) {
  globalThis.localStorage = (function () {
    let store = {}
    return {
      getItem(key) {
        return Object.hasOwn(store, key) ? store[key] : null
      },
      setItem(key, value) {
        store[key] = String(value)
      },
      removeItem(key) {
        delete store[key]
      },
      clear() {
        store = {}
      },
    }
  })()
}

// Mocks
// Simulate `useGenerate` returning a `runGenerate` function that calls
// `handleSuccessRef.current` to simulate a successful generation and preview.
vi.mock('../hooks/useGenerate', () => ({
  default: (opts) => {
    return async (requestOptions, baseName, source, outputMode) => {
      // simulate server returning image bytes and nortContent
      try {
        const nort = JSON.stringify({ generated: true })
        const blob = new Blob(['fakepng'], { type: 'image/png' })
        if (opts?.handleSuccessRef) {
          const tryCall = () => {
            try {
              const fn = opts.handleSuccessRef.current
              if (typeof fn === 'function') {
                fn(blob, baseName, source, nort)
                return true
              }
            } catch (e) {
              // Log instead of silently swallowing so test failures are observable
              /* eslint-disable no-console */
              console.debug('useGenerate mock: handleSuccessRef threw', e)
              /* eslint-enable no-console */
            }
            return false
          }
          if (!tryCall()) {
            // give React a tick to assign the ref then try again
            await new Promise((res) => setTimeout(res, 0))
            tryCall()
          }
        }
      } catch (e) {
        // Log instead of silently swallowing so test failures are observable
        /* eslint-disable no-console */
        console.debug('useGenerate mock: failed to simulate success', e)
        /* eslint-enable no-console */
      }
    }
  },
}))

// Mock helpers.fetchJson used by loadUiOptions
vi.mock('../helpers', () => ({
  fetchJson: vi.fn(async () => ({
    artPacks: [],
    books: [],
    textures: [],
    borderTypes: [],
    defaults: {},
    options: {},
    cityIconTypesByPack: {},
    labels: { 'ui.loading': 'Loading...' },
  })),
  handleResponseError: vi.fn(),
  selectCityIconType: vi.fn(() => null),
  tryParseJson: JSON.parse,
  seedStringOrEmpty: (v) => (v !== undefined && v !== null && v !== '' ? String(v) : ''),
  stringValueOrEmpty: (v) => (typeof v === 'string' && v ? v : ''),
  appendIfSet: (fd, key, value) => {
    if (value !== null && value !== undefined && value !== '') fd.append(key, String(value))
  },
}))

// Mock frontend labels
vi.mock('../i18n/webLabels', () => ({ getFrontendLabels: async () => ({}) }))

// Mock heavy helper modules used by GenerateForm
vi.mock('../GenerateForm.helpers', () => ({
  serializeNortObject: (o) => JSON.stringify(o),
  scaleSliderValue: () => 1,
  computeGridOverlayAlpha: () => 1,
  computeConcentricWaveCount: () => 3,
  setResourceFromRef: () => {},
  parseBooleanWithDefault: () => false,
  persistCustomizeOverrides: () => {},
  loadRandomOverrides: () => ({}),
  loadCustomizeOverrides: () => ({}),
  buildCustomizePayload: () => ({}),
}))
vi.mock('../GenerateForm.appliers', () => ({
  applyBackgroundFlagsHoisted: () => {},
  applyResourcesAndTopLevelHoisted: () => {},
  applyGridAndColoringHoisted: () => {},
  applyBordersFrayedAndGrungeHoisted: () => {},
  applyCoastOceanAndWavesHoisted: () => {},
  applyTextAndBackgroundHoisted: () => {},
  applyRoadsAndScalesHoisted: () => {},
  mergeColor: () => {},
}))

// Mock child sections to expose handlers for tests
vi.mock('../RandomSettingsSection', () => ({
  __esModule: true,
  default: ({ handlers }) => {
    return (
      <div>
        <button data-testid="trigger-random" onClick={(e) => handlers.handleRandomMap?.(e)}>
          random
        </button>
        <button
          data-testid="trigger-file"
          onClick={() =>
            handlers.handleFileInput({
              target: {
                files: [
                  new File([JSON.stringify({ foo: 1 })], 'test.nort', { type: 'application/json' }),
                ],
              },
            })
          }
        >
          file
        </button>
      </div>
    )
  },
}))

vi.mock('../CustomizeSettingsSection', () => ({
  __esModule: true,
  default: ({ handlers }) => {
    return (
      <div>
        <button
          data-testid="generate-save"
          onClick={(e) => handlers.handleGenerateAndSaveNort?.(e)}
        >
          save
        </button>
        <button data-testid="open-preview" onClick={() => handlers.openPreviewModal?.()}>
          open
        </button>
        <button data-testid="download-map" onClick={() => handlers.handleDownloadMap?.()}>
          download
        </button>
      </div>
    )
  },
}))

beforeEach(() => {
  globalThis.showToast = vi.fn()
  // ensure localStorage is clean
  localStorage.clear()
})
afterEach(() => {
  delete globalThis.showToast
})

describe('GenerateForm basic flows', () => {
  it('shows a warning when saving merged settings fails (no current source)', async () => {
    const { getByTestId } = render(<GenerateForm uiLanguage="en" />)
    // wait for UI to finish loading and child sections to render
    await waitFor(() => getByTestId('generate-save'))
    const btn = getByTestId('generate-save')
    fireEvent.click(btn)
    await waitFor(() => {
      expect(globalThis.showToast).toHaveBeenCalled()
      const call = globalThis.showToast.mock.calls[0]
      expect(call[1].type).toBe('warning')
    })
  })

  it('handles file input and calls runGenerate', async () => {
    const { getByTestId } = render(<GenerateForm uiLanguage="en" />)
    await waitFor(() => getByTestId('trigger-file'))
    const btn = getByTestId('trigger-file')
    fireEvent.click(btn)
    // wait for async handler to invoke runGenerate which will call handleSuccessRef
    await waitFor(() => expect(globalThis.showToast).toHaveBeenCalled())
  })

  it('persists random overrides to localStorage when handlers change', async () => {
    const { getByTestId } = render(<GenerateForm uiLanguage="en" />)
    await waitFor(() => getByTestId('trigger-random'))
    // trigger random handler to attempt a generate (we don't assert runGenerate here)
    const rbtn = getByTestId('trigger-random')
    fireEvent.click(rbtn)
    // localStorage key should be present (GenerateForm writes randomOverrides)
    await waitFor(() => {
      const stored = localStorage.getItem('vellaris-random-manual-overrides')
      // may be present as JSON string
      expect(stored).not.toBeNull()
    })
  })

  it('opens preview modal and downloads map when preview available', async () => {
    const openModal = vi.fn()
    globalThis.openModal = openModal
    // spy on createElement to intercept anchor click
    const origCreate = document.createElement.bind(document)
    const clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreate(tag)
      if (tag === 'a') {
        el.click = clickSpy
        el.remove = () => {}
      }
      return el
    })

    const { getByTestId } = render(<GenerateForm uiLanguage="en" />)
    // trigger file input which will call runGenerate and set preview via handleSuccess
    await waitFor(() => getByTestId('trigger-file'))
    fireEvent.click(getByTestId('trigger-file'))
    // wait for preview to be set and open-preview button to exist
    await waitFor(() => getByTestId('open-preview'))
    fireEvent.click(getByTestId('open-preview'))
    expect(openModal).toHaveBeenCalled()
    // now test download
    await waitFor(() => getByTestId('download-map'))
    fireEvent.click(getByTestId('download-map'))
    expect(clickSpy).toHaveBeenCalled()
    // restore
    document.createElement.mockRestore()
    delete globalThis.openModal
  })

  it('buildNortContentRequest works with explicit nort content', async () => {
    const { getByTestId } = render(<GenerateForm uiLanguage="en" />)
    // ensure component initialized and test hooks are exposed
    await waitFor(() => getByTestId('generate-save'))
    // set currentSource by simulating file input which uploads content
    fireEvent.click(getByTestId('trigger-file'))
    await waitFor(() => expect(globalThis.showToast).toHaveBeenCalled())
    const explicit = JSON.stringify({ generatedWidth: 800, generatedHeight: 600, randomSeed: 42 })
    // call the exposed test hook
    const result = globalThis.__test_buildNortContentRequest({ explicitNortContent: explicit })
    expect(result).toBeTruthy()
    expect(result.requestOptions).toBeTruthy()
    expect(typeof result.baseName).toBe('string')
    expect(result.requestOptions.body).toContain('generatedWidth')
  })

  it('handleRandomMap calls fetchResolvedNort and generates map', async () => {
    // mock fetch for /generate-settings
    const fakeNort = JSON.stringify({ generatedWidth: 300, generatedHeight: 200 })
    globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => fakeNort }))
    const { getByTestId } = render(<GenerateForm uiLanguage="en" />)
    await waitFor(() => getByTestId('trigger-random'))
    fireEvent.click(getByTestId('trigger-random'))
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    // cleanup
    delete globalThis.fetch
  })

  it('buildNortContentRequest works when merged settings present', async () => {
    const { getByTestId } = render(<GenerateForm uiLanguage="en" />)
    // set currentSource (and mergedSettingsRef) by simulating file input
    await waitFor(() => getByTestId('trigger-file'))
    fireEvent.click(getByTestId('trigger-file'))
    await waitFor(() => expect(globalThis.showToast).toHaveBeenCalled())
    const result = globalThis.__test_buildNortContentRequest()
    expect(result).toBeTruthy()
    expect(result.requestOptions).toBeTruthy()
  })
})
import * as GenerateFormModule from '../GenerateForm.jsx'

describe('GenerateForm module', () => {
  it('imports without throwing and exports something', () => {
    expect(GenerateFormModule).toBeTruthy()
  })
})
