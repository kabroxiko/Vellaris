import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// Mock useGenerate hook
const runGenerateMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../hooks/useGenerate', () => ({ default: () => runGenerateMock }))

// Mock helpers.fetchJson
vi.mock('../helpers', async () => {
  const actual = await vi.importActual('../helpers')
  return {
    ...actual,
    fetchJson: vi.fn(() => Promise.resolve({
      labels: { 'ui.button.downloadSettings': 'Download settings', 'ui.button.regenerate': 'Regenerate' },
      books: [], artPacks: [], textures: [], borderTypes: [], options: {}, defaults: {},
    })),
  }
})

vi.mock('../i18n/webLabels', () => ({ getFrontendLabels: async () => ({ 'ui.loading': 'Loading', 'ui.button.downloadSettings': 'Download settings', 'ui.button.regenerate': 'Regenerate' }) }))

import GenerateForm from '../GenerateForm'

// Ensure global fetch handles relative URLs used by the app (node fetch needs absolute URLs)
const originalFetch = globalThis.fetch
beforeAll(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, opts) => {
    const s = String(url)
    if (s.includes('/generate-settings') || s.includes('/ui-options')) {
      return { ok: true, text: async () => JSON.stringify({}), json: async () => ({}) }
    }
    if (s.includes('/background-base') || s.endsWith('.png')) {
      return { ok: true, blob: async () => new Blob([''], { type: 'image/png' }) }
    }
    return { ok: true, text: async () => '', json: async () => ({}) }
  })
})

afterAll(() => {
  if (originalFetch) globalThis.fetch = originalFetch
})

describe('GenerateForm error handling', () => {
  beforeEach(() => {
    runGenerateMock.mockClear()
    globalThis.showToast = vi.fn()
  })

  it('clicking Download settings with invalid .nort shows warning toast', async () => {
    render(<GenerateForm uiLanguage="en" />)

    const downloadLabel = await screen.findByText('Download settings')
    expect(downloadLabel).toBeTruthy()

    const file = new File(['not json content'], 'bad.nort', { type: 'application/json' })
    const input = document.getElementById('nort-file-input')
    fireEvent.change(input, { target: { files: [file] } })

    // Click Download settings and expect a warning toast
    const downloadBtn = screen.getByText('Download settings')
    fireEvent.click(downloadBtn)
    await waitFor(() => expect(globalThis.showToast).toHaveBeenCalled())
  })

  it('clicking Regenerate with invalid .nort shows error toast', async () => {
    render(<GenerateForm uiLanguage="en" />)

    const regenBtn = await screen.findByText('Regenerate')
    expect(regenBtn).toBeTruthy()

    const file = new File(['not json content'], 'bad2.nort', { type: 'application/json' })
    const input = document.getElementById('nort-file-input')
    fireEvent.change(input, { target: { files: [file] } })

    // Click Regenerate and expect an error toast
    fireEvent.click(regenBtn)
    await waitFor(() => expect(globalThis.showToast).toHaveBeenCalled())
  })
})
