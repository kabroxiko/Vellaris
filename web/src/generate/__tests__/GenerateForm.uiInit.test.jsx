import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import GenerateForm from '../GenerateForm'

// Mock useGenerate hook
const runGenerateMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../hooks/useGenerate', () => ({ default: () => runGenerateMock }))

// Provide backend labels that override frontend labels
vi.mock('../helpers', async () => {
  const actual = await vi.importActual('../helpers')
  return {
    ...actual,
    fetchJson: vi.fn(() =>
      Promise.resolve({
        labels: { 'ui.button.downloadSettings': 'DL SETTINGS' },
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

vi.mock('../i18n/webLabels', () => ({
  getFrontendLabels: async () => ({
    'ui.loading': 'Loading',
    'ui.button.downloadSettings': 'Download settings',
  }),
}))

test('backend labels override frontend labels on initial load', async () => {
  render(<GenerateForm uiLanguage="en" />)
  // Expect the Download settings button to appear with overridden label
  const btn = await screen.findByText('DL SETTINGS')
  expect(btn).toBeTruthy()
})
