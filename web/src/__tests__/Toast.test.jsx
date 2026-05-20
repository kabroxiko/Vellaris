import React from 'react'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import ToastContainer from '../Toast.jsx'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'

describe('ToastContainer', () => {
  beforeEach(() => {
    // reset labels
    globalThis.__localizedFrontendLabels = {}
  })

  afterEach(() => {
    cleanup()
    // cleanup globals
    delete globalThis.__localizedFrontendLabels
    delete globalThis.showToast
    delete globalThis.hideToast
    vi.useRealTimers()
  })

  it('exposes showToast and hideToast on mount and removes them on unmount', () => {
    const { unmount } = render(<ToastContainer />)
    expect(typeof globalThis.showToast).toBe('function')
    expect(typeof globalThis.hideToast).toBe('function')
    unmount()
    expect(globalThis.showToast).toBeUndefined()
    expect(globalThis.hideToast).toBeUndefined()
  })

  it('shows a localized message for a string key', async () => {
    globalThis.__localizedFrontendLabels = { 'toast.hello': 'Hello World' }
    render(<ToastContainer />)
    const id = globalThis.showToast('toast.hello')
    expect(id).toBeTruthy()
    await screen.findByText('Hello World')
  })

  it('resolves parameterized messages', async () => {
    globalThis.__localizedFrontendLabels = { 'toast.greet': 'Hi {name}!' }
    render(<ToastContainer />)
    globalThis.showToast({ key: 'toast.greet', params: { name: 'Alice' } })
    await screen.findByText('Hi Alice!')
  })

  it('returns null and warns when localized label is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<ToastContainer />)
    const res = globalThis.showToast('missing.key')
    expect(res).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
    expect(screen.queryByText('missing.key')).toBeNull()
    warnSpy.mockRestore()
  })

  it('hideToast removes a toast', async () => {
    globalThis.__localizedFrontendLabels = { 'toast.rm': 'Remove me' }
    render(<ToastContainer />)
    const id = globalThis.showToast('toast.rm')
    await screen.findByText('Remove me')
    globalThis.hideToast(id)
    await waitFor(() => expect(screen.queryByText('Remove me')).toBeNull())
  })

  it('automatically removes toast after duration using timers', async () => {
    globalThis.__localizedFrontendLabels = { 'toast.temp': 'Temporary' }
    // use real timers here so React state updates flush naturally
    render(<ToastContainer />)
    globalThis.showToast('toast.temp', 100)
    await screen.findByText('Temporary')
    await waitFor(() => expect(screen.queryByText('Temporary')).toBeNull(), { timeout: 2000 })
  })
})
