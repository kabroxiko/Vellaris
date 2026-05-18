import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect } from 'vitest'

// Mock helpers.fetchJson to avoid network calls
vi.mock('../helpers', async () => {
  const actual = await vi.importActual('../helpers')
  return {
    ...actual,
    fetchJson: vi.fn(() =>
      Promise.resolve({
        labels: {
          'ui.button.downloadSettings': 'Download settings',
          'ui.button.regenerate': 'Regenerate',
        },
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

// Mock useGenerate hook
const runGenerateMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../hooks/useGenerate', () => ({ default: () => runGenerateMock }))

import GenerateForm from '../GenerateForm'

describe('buildNortContentRequest unit', () => {
  beforeEach(() => {
    // render component to initialize globals
    // keep container in DOM for queries
    const r = render(<GenerateForm uiLanguage="en" />)
    globalThis.__test_render_container = r.container
  })

  it('throws for invalid explicitNortContent', () => {
    expect(() =>
      globalThis.__test_buildNortContentRequest({ explicitNortContent: 'not json' })
    ).toThrow()
  })

  it('returns requestOptions for valid explicitNortContent', async () => {
    // upload a small valid .nort to set currentSource so build uses it for source
    const container = globalThis.__test_render_container
    await waitFor(() => expect(container.querySelector('#nort-file-input')).toBeTruthy())
    const input = container.querySelector('#nort-file-input')
    const file = new File(['{}'], 'good.nort', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(runGenerateMock).toHaveBeenCalled())

    const res = globalThis.__test_buildNortContentRequest({ explicitNortContent: '{}' })
    expect(res).toBeTruthy()
    expect(res.requestOptions).toBeTruthy()
    expect(typeof res.requestOptions.body).toBe('string')
    const parsed = JSON.parse(res.requestOptions.body)
    expect(parsed).toBeTruthy()
  })
})
