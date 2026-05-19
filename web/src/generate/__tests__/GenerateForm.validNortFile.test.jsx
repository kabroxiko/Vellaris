import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import GenerateForm from '../GenerateForm'
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
    fetchJson: vi.fn(() =>
      Promise.resolve({
        labels: { 'ui.button.downloadSettings': 'Download settings' },
        books: [],
        artPacks: [],
        textures: [],
        borderTypes: [],
        options: {},
        defaults: {},
      })
    ),
  }
})

// Spy on downloadNortContent
const downloadSpy = vi.fn()
vi.mock('../responseHandlers', async () => ({
  ...(await vi.importActual('../responseHandlers')),
  downloadNortContent: (...args) => downloadSpy(...args),
}))

vi.mock('../i18n/webLabels', () => ({
  getFrontendLabels: async () => ({
    'ui.loading': 'Loading',
    'ui.button.downloadSettings': 'Download settings',
  }),
}))

describe('GenerateForm valid .nort file', () => {
  beforeEach(() => {
    runGenerateMock.mockClear()
    downloadSpy.mockClear()
  })

  it('uploads a real .nort file and triggers downloadNortContent', async () => {
    render(<GenerateForm uiLanguage="en" />)

    // wait for the Download settings button to appear
    const downloadLabel = await screen.findByText('Download settings')
    expect(downloadLabel).toBeTruthy()

    // Read the bundled test .nort file from repo
    const nortPath = path.resolve(
      __dirname,
      '../../../../unit test files/map settings/simpleSmallWorld.nort'
    )
    const fileContent = readFileSync(nortPath, 'utf8')

    // simulate file selection via hidden input
    const file = new File([fileContent], 'simpleSmallWorld.nort', { type: 'application/json' })
    const input = document.getElementById('nort-file-input')
    expect(input).toBeTruthy()

    // Fire change event with the real file
    fireEvent.change(input, { target: { files: [file] } })

    // Wait for internal file handler to process and call runGenerate
    await waitFor(() => expect(runGenerateMock).toHaveBeenCalled())

    // Now click the Download settings button which should trigger downloadNortContent
    const downloadBtn = screen.getByText('Download settings')
    fireEvent.click(downloadBtn)

    await waitFor(() => expect(downloadSpy).toHaveBeenCalled())
    const args = downloadSpy.mock.calls[0]
    expect(typeof args[0]).toBe('string')
    expect(typeof args[1]).toBe('string')
  })
})
