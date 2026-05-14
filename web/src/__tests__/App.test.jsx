import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock heavy subcomponents to keep test deterministic and fast
vi.mock('../generate/GenerateForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'mock-generate-form' }, 'GenerateForm')
}))
vi.mock('../Toast', () => ({ default: () => React.createElement('div', { 'data-testid': 'mock-toast' }, 'Toast') }))

import App from '../App'

describe('App shell', () => {
  it('renders header, language selector, and modal controls', async () => {
    // Ensure localStorage default is clean
    localStorage.removeItem('vellaris-language')

    render(<App />)

    // title from TEXT.en should be visible
    expect(screen.getByText(/Vellaris — Online Map Generator/i)).toBeTruthy()

    // mock-generate-form present
    expect(screen.getByTestId('mock-generate-form')).toBeTruthy()

    // language selector exists and can change
    const select = screen.getByLabelText(/Language/i)
    expect(select).toBeTruthy()
    fireEvent.change(select, { target: { value: 'de' } })
    expect(localStorage.getItem('vellaris-language')).toBe('de')

    // wait for global helper to be registered by the component effect
    await waitFor(() => expect(typeof globalThis.openModal).toBe('function'))
    // open modal via global helper and verify modal image appears
    const url = 'https://example.com/map.png'
    globalThis.openModal(url, 'map.png')
    await waitFor(() => expect(document.querySelector('.zoom-pan')).toBeTruthy())
    expect(document.querySelector('.zoom-pan').getAttribute('src')).toBe(url)
  })
})
