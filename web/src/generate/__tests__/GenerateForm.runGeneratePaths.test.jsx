import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// Mock useGenerate hook
const runGenerateMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../hooks/useGenerate', () => ({ default: () => runGenerateMock }))

// Mock helpers.fetchJson used by loadUiOptions
vi.mock('../helpers', async () => {
  const actual = await vi.importActual('../helpers')
  return {
    ...actual,
    fetchJson: vi.fn(() => Promise.resolve({ labels: { 'ui.button.regenerate': 'Regenerate' }, books: [], artPacks: [], textures: [], borderTypes: [], options: {}, defaults: {} })),
  }
})

vi.mock('../i18n/webLabels', () => ({ getFrontendLabels: async () => ({ 'ui.loading': 'Loading', 'ui.button.regenerate': 'Regenerate' }) }))

import GenerateForm from '../GenerateForm'

describe('runGenerateFromCurrentSource paths', () => {
  beforeEach(() => {
    runGenerateMock.mockClear()
    globalThis.showToast = vi.fn()
  })

  it('does nothing when Regenerate clicked with no file and no currentSource', async () => {
    render(<GenerateForm uiLanguage="en" />)
    const regen = await screen.findByText('Regenerate')
    fireEvent.click(regen)
    // runGenerate should not be called
    await waitFor(() => expect(runGenerateMock).not.toHaveBeenCalled())
  })

  it('shows toast and does not call runGenerate when uploaded file causes build to throw', async () => {
    render(<GenerateForm uiLanguage="en" />)
    const regen = await screen.findByText('Regenerate')

    // upload invalid nort to trigger buildNortContentRequest throw
    const file = new File(['not json'], 'bad.nort', { type: 'application/json' })
    const input = document.getElementById('nort-file-input')
    fireEvent.change(input, { target: { files: [file] } })

    // Click Regenerate and expect toast and no runGenerate
    fireEvent.click(regen)
    await waitFor(() => expect(globalThis.showToast).toHaveBeenCalled())
    expect(runGenerateMock).not.toHaveBeenCalled()
  })
})
