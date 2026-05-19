import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ToastContainer from '../Toast'
import { describe, it, expect } from 'vitest'

describe('ToastContainer', () => {
  it('shows and hides a toast via global helpers', async () => {
    render(<ToastContainer />)
    // provide localized labels for the test keys
    globalThis.__localizedFrontendLabels = { 'test.hello': 'hello world', 'test.temp': 'temp' }
    const id = globalThis.showToast('test.hello', { duration: 0 })
    await screen.findByText('hello world')
    globalThis.hideToast(id)
    await waitFor(() => expect(screen.queryByText('hello world')).toBeNull())
  })

  it('renders progress element with correct duration', async () => {
    render(<ToastContainer />)
    globalThis.showToast('test.temp', { duration: 123 })
    await screen.findByText('temp')
    const progress = document.querySelector('.toast-progress')
    expect(progress).toBeTruthy()
    expect(progress.style.animationDuration).toBe('123ms')
  })
})
