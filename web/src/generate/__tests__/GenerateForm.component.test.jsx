import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, beforeEach, afterEach, test } from 'vitest'

// Mock helpers and side-effecting modules before importing GenerateForm
const uiOpts = {
  books: ['book1'],
  artPacks: ['pack1'],
  textures: [],
  borderTypes: [],
  defaults: { generatedWidth: 100, generatedHeight: 100 },
  labels: { 'ui.button.regenerate': 'Regenerate' },
  options: {},
}

vi.mock('../helpers', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, fetchJson: vi.fn(() => Promise.resolve(uiOpts)) }
})

vi.mock('../../i18n/webLabels', async (importOriginal) => ({
  constActual: await importOriginal(),
  getFrontendLabels: () => Promise.resolve({ 'ui.button.regenerate': 'Regenerate' }),
}))

// stub useGenerate to avoid network
const runGenerateMock = vi.fn()
vi.mock('../hooks/useGenerate', async (importOriginal) => ({
  constActual: await importOriginal(),
  default: () => runGenerateMock,
}))

import GenerateForm, { loadUiOptions } from '../GenerateForm'
import { fetchJson as mockedFetch } from '../helpers'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

afterEach(() => {
  // noop
})

test('GenerateForm loads UI options on mount (calls fetchJson)', async () => {
  render(<GenerateForm uiLanguage="zz" />)
  // Wait for UI to show regenerate button which indicates ui loaded
  const btn = await screen.findByRole('button', { name: /Regenerate/i })
  expect(btn).toBeTruthy()
  // fetchJson should have been called with uiLanguage param
  await waitFor(() => {
    const calls = mockedFetch.mock.calls
    if (!calls || calls.length === 0) throw new Error('fetchJson not called')
    const url = calls[0][0]
    if (!String(url).includes('ui-options')) throw new Error('unexpected url')
  })
})

test('loadUiOptions caches per language key', async () => {
  const fetch = mockedFetch
  const p1 = await loadUiOptions('lang-cache-1')
  const p2 = await loadUiOptions('lang-cache-1')
  // same promise/result used; fetchJson should be called only once for this key
  if (fetch.mock.calls.length === 0) throw new Error('fetch not called')
  expect(fetch.mock.calls.length).to.equal(1)
  expect(p1).to.equal(p2)
})
