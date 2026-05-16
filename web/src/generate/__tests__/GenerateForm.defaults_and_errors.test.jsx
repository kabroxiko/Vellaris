import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { vi, test, beforeEach } from 'vitest'
import { expect } from 'chai'

// Test applyServerDefaults side-effects via persisted localStorage
const uiOptsWithDefaults = {
  books: [],
  artPacks: ['p1'],
  textures: [],
  borderTypes: [],
  defaults: { coastlineWidth: 12, generatedWidth: 200 },
  labels: {},
  options: { backgroundTypes: [{ value: 'MyBg' }], finalLandColoringMethods: [{ value: 'L1' }], lineStyles: [{ value: 'ls' }] },
}

vi.mock('../helpers', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, fetchJson: vi.fn(() => Promise.resolve(uiOptsWithDefaults)) }
})

vi.mock('../../i18n/webLabels', async (importOriginal) => ({
  constActual: await importOriginal(),
  getFrontendLabels: () => Promise.resolve({}),
}))

vi.mock('../hooks/useGenerate', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, default: () => vi.fn() }
})

import GenerateForm from '../GenerateForm'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

test('mounting GenerateForm with defaults persists customized overrides', async () => {
  render(<GenerateForm uiLanguage="en" />)
  // Wait for component to finish loading UI
  await waitFor(() => {
    const raw = localStorage.getItem('vellaris-customize-overrides')
    if (!raw) throw new Error('localStorage not populated yet')
    const parsed = JSON.parse(raw)
    // defaults from uiOpts should be applied into persisted payload; check numeric default
    if (Number(parsed.coastlineWidth) !== 12) throw new Error('coastlineWidth not set')
  })
  const raw = localStorage.getItem('vellaris-customize-overrides')
  const parsed = JSON.parse(raw)
  expect(Number(parsed.coastlineWidth)).to.equal(12)
  // options-based defaults should be reflected where possible
  expect(parsed.finalLandColoringMethod).to.equal('L1')
})

import { loadUiOptions } from '../GenerateForm'

test('loadUiOptions propagates fetchJson errors', async () => {
  // arrange: mock fetchJson to reject
  const helpers = await import('../helpers')
  helpers.fetchJson.mockImplementationOnce(() => Promise.reject(new Error('network fail')))
  let threw = false
  try {
    // use a fresh language key to avoid cache hits
    await loadUiOptions('lang-error')
  } catch (e) {
    threw = true
    expect(e.message).to.match(/network fail/)
  }
  if (!threw) throw new Error('expected loadUiOptions to throw')
})
