import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import GenerateForm from '../GenerateForm'

// Mock useGenerate to avoid network during final image generate
const runGenerateMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../hooks/useGenerate', () => ({ default: () => runGenerateMock }))

// Mock helpers.fetchJson used by loadUiOptions to provide labels/options
vi.mock('../helpers', async () => {
  const actual = await vi.importActual('../helpers')
  return {
    ...actual,
    fetchJson: vi.fn(() => Promise.resolve({
      labels: { 'ui.generate': 'Generate', 'ui.button.downloadSettings': 'Download settings' },
      books: ['bookA','bookB'],
      artPacks: ['packX'],
      textures: [],
      borderTypes: [],
      options: { dimensions: [], landShapes: [], landColoringMethods: [] },
      defaults: {},
    })),
  }
})

vi.mock('../i18n/webLabels', () => ({ getFrontendLabels: async () => ({ 'ui.loading': 'Loading', 'ui.generate': 'Generate', 'ui.button.downloadSettings': 'Download settings' }) }))

// mock globalThis fetch to capture the POST body for generate-settings
function getUrlString(url) {
    if (typeof url === 'string') return url
    if (url instanceof Request) return url.url
    if (url instanceof URL) return url.href
    if (url && typeof url === 'object' && 'url' in url && typeof url.url === 'string') return url.url
    if (url && typeof url.toString === 'function' && url.toString !== Object.prototype.toString) return url.toString()
    return ''
}

describe('GenerateForm buildRandomCfg', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('sends manual overrides to /generate-settings when generate is clicked', async () => {
    // set manual overrides in localStorage so loadRandomOverrides picks them up
    localStorage.setItem('vellaris-random-manual-overrides', JSON.stringify({ mapLanguage: 'zz', artPack: 'packX', selectedBooks: ['bookB'], regionCount: 7 }))

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, opts) => {
      const urlStr = getUrlString(url)

      if (urlStr.includes('/generate-settings')) {
        return { ok: true, text: async () => JSON.stringify({}) }
      }
      // backgroundBaseCache may request images; return a blob-like response
      return { ok: true, blob: async () => new Blob([''], { type: 'image/png' }) }
    })

    render(<GenerateForm uiLanguage="en" />)

    // Wait for the Generate button to appear
    const genBtn = await screen.findByText('Generate')
    expect(genBtn).toBeTruthy()

    // Click the Generate button (form submit)
    fireEvent.click(genBtn)

    // Wait for fetch to be called with /generate-settings and inspect body
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const called = fetchMock.mock.calls.find((c) => getUrlString(c[0]).includes('/generate-settings'))
    expect(called).toBeTruthy()
    const opts = called[1]
    const body = JSON.parse(opts.body)
    // Manual overrides should appear in the config (only keys the UI maps from overrides)
    expect(body.language).to.equal('zz')
    expect(body.artPack).to.equal('packX')
    expect(body.books).to.deep.equal(['bookB'])

    fetchMock.mockRestore()
  })
})
