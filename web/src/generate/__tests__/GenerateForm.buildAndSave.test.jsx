import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Mock useGenerate hook to avoid real network
const runGenerateMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../hooks/useGenerate', () => ({ default: () => runGenerateMock }))

// Mock helpers.fetchJson used by loadUiOptions
vi.mock('../helpers', async () => {
  const actual = await vi.importActual('../helpers')
  return {
    ...actual,
    fetchJson: vi.fn(() => Promise.resolve({ labels: { 'ui.button.downloadSettings': 'Download settings', 'ui.button.regenerate': 'Regenerate' }, books: [], artPacks: [], textures: [], borderTypes: [], options: {}, defaults: {} })),
  }
})

// Spy on downloadNortContent
const downloadSpy = vi.fn()
vi.mock('../responseHandlers', async () => ({ ...(await vi.importActual('../responseHandlers')), downloadNortContent: (...args) => downloadSpy(...args) }))

vi.mock('../i18n/webLabels', () => ({ getFrontendLabels: async () => ({ 'ui.loading': 'Loading', 'ui.button.downloadSettings': 'Download settings', 'ui.button.regenerate': 'Regenerate' }) }))

import GenerateForm from '../GenerateForm'

describe('GenerateForm build and save flows', () => {
  beforeEach(() => {
    runGenerateMock.mockClear()
    downloadSpy.mockClear()
  })

  it('buildNortContentRequest uses uploaded currentSource when no explicit provided', async () => {
    const r = render(<GenerateForm uiLanguage="en" />)
    const container = r.container

    // wait for controls
    const downloadLabel = await screen.findByText('Download settings')
    expect(downloadLabel).toBeTruthy()

    // Read real .nort file
    const nortPath = path.resolve(__dirname, '../../../../unit test files/map settings/simpleSmallWorld.nort')
    const fileContent = readFileSync(nortPath, 'utf8')
    const file = new File([fileContent], 'simpleSmallWorld.nort', { type: 'application/json' })

    const input = container.querySelector('#nort-file-input')
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { files: [file] } })

    // Wait for internal file handler to process and call runGenerate
    await waitFor(() => expect(runGenerateMock).toHaveBeenCalled())

    // Call the exposed buildNortContentRequest without explicit content
    const res = globalThis.__test_buildNortContentRequest()
    expect(res).toBeTruthy()
    expect(res.source).toBeTruthy()
    expect(res.source.nortContent).toContain('generatedWidth')
  })

  it('handleGenerateAndSaveNort triggers download on valid settings', async () => {
    render(<GenerateForm uiLanguage="en" />)

    const downloadLabel = await screen.findByText('Download settings')
    expect(downloadLabel).toBeTruthy()

    // upload a minimal valid .nort
    const file = new File([JSON.stringify({ name: 't', language: 'en' })], 'min.nort', { type: 'application/json' })
    const input = document.getElementById('nort-file-input')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(runGenerateMock).toHaveBeenCalled())

    // Call the exposed handler directly (simulate click event)
    await globalThis.__test_handleGenerateAndSaveNort({ preventDefault: () => {} })

    await waitFor(() => expect(downloadSpy).toHaveBeenCalled())
  })
})
