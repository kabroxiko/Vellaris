import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, beforeEach, test } from 'vitest'
import { expect } from 'chai'

// Minimal UI options fixture so component mounts
const uiOpts = {
  books: [],
  artPacks: ['pack1'],
  textures: [],
  borderTypes: [],
  defaults: {},
  // include generate label used by RandomSettingsSection
  labels: { 'ui.button.regenerate': 'Regenerate', 'ui.generate': 'Generate' },
  options: {},
}

// Mock helpers and side-effecting modules before importing GenerateForm
vi.mock('../helpers', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchJson: vi.fn(() => Promise.resolve(uiOpts)),
    makeProgressToastController: () => ({ show: vi.fn(), hide: vi.fn() }),
  }
})

vi.mock('../../i18n/webLabels', async (importOriginal) => ({
  constActual: await importOriginal(),
  getFrontendLabels: () => Promise.resolve({ 'ui.button.regenerate': 'Regenerate' }),
}))

// stub useGenerate to avoid network; expose a spy we can assert on
const runGenerateMock = vi.fn(() => Promise.resolve())
vi.mock('../hooks/useGenerate', async (importOriginal) => ({
  constActual: await importOriginal(),
  default: () => runGenerateMock,
}))

import GenerateForm from '../GenerateForm'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

test('generateFromNortContent is invoked when Regenerate clicked (calls runGenerate)', async () => {
  // stub globalThis.fetch used by fetchResolvedNort to return a resolved .nort
  globalThis.fetch = vi.fn((url) => {
    if (String(url).includes('/generate-settings')) {
      return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') })
    }
    // For other fetches (image/blob), return a Response-like object with blob()
    return Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob([''], { type: 'image/png' })),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      headers: { get: () => 'image/png' },
    })
  })

  render(<GenerateForm uiLanguage="en" />)

  // Wait for UI loaded (Generate button appears)
  const btn = await screen.findByRole('button', { name: /^Generate$/i })
  expect(btn).to.be.ok

  // Click Generate to trigger doRandomMap -> generateFromNortContent
  fireEvent.click(btn)

  await waitFor(() => {
    if (runGenerateMock.mock.calls.length === 0) throw new Error('runGenerate not called')
  })

  // Validate runGenerate call shape
  const calls = runGenerateMock.mock.calls
  const firstCall = calls[0]
  expect(firstCall).to.have.length.greaterThan(1)
  const requestOptions = firstCall[0]
  expect(requestOptions).to.be.an('object')
  if (!requestOptions) throw new Error('requestOptions is null or undefined')
  expect(requestOptions.method).to.equal('POST')
  expect(firstCall[1]).to.equal('random-map')

  // cleanup fetch mock
  globalThis.fetch.mockRestore?.()
})
