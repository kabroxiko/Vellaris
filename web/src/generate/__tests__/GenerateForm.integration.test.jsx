import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Prepare a deterministic UI options payload returned by the backend
const uiOpts = {
  books: ['a'],
  artPacks: ['nortantis'],
  textures: [],
  borderTypes: [],
  defaults: { generatedWidth: 640, generatedHeight: 480 },
  labels: { 'ui.button.regenerate': 'Regenerate', 'ui.generating': 'Generating', 'ui.button.downloadSettings': 'Download Settings' },
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
  getFrontendLabels: () => Promise.resolve({ 'ui.button.regenerate': 'Regenerate', 'ui.generating': 'Generating' }),
}))

// runGenerate stub captured here
const runGenerateMock = vi.fn(async () => {})
vi.mock('../hooks/useGenerate', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, default: () => runGenerateMock }
})

import GenerateForm from '../GenerateForm'

describe('GenerateForm integration (file upload -> generate)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('uploads a .nort file and triggers runGenerate', async () => {
    const { container } = render(<GenerateForm uiLanguage="en" />)

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
