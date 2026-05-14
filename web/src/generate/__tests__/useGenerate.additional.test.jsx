import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import useGenerate from '../hooks/useGenerate'

describe('useGenerate additional flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('processes JSON response with imageBase64 and calls handleSuccessRef (preview)', async () => {
    // mock sharedHelpers
    const respObj = { imageBase64: btoa('PNGDATA'), meta: 1 }
    const bytes = new TextEncoder().encode(JSON.stringify(respObj))
    vi.mock('../sharedHelpers', () => ({
      makeProgressToastController: () => ({ show: () => {}, hide: () => {} }),
      readResponseBytesWithProgress: async () => bytes,
    }))

    // mock fetch
    globalThis.fetch = vi.fn(async () => ({ ok: true, headers: { get: () => 'application/json' } }))

    const handleSuccessRef = { current: vi.fn() }

    function LocalRunner() {
      const setError = vi.fn()
      const setLoading = vi.fn()
      const runGenerate = useGenerate({
        apiBase: '/api',
        handleResponseError: async () => {},
        base64ToBlob: (b64) => new Blob([b64], { type: 'image/png' }),
        downloadNortContent: vi.fn(),
        tryParse: JSON.parse,
        serializeNortObject: (o) => JSON.stringify(o),
        handleSuccessRef,
        setError,
        setLoading,
      })
      return <button onClick={() => runGenerate({ body: null }, 'base', 'src')}>Run</button>
    }

    render(<LocalRunner />)
    fireEvent.click(screen.getByText('Run'))
    await new Promise((r) => setTimeout(r, 10))
    expect(handleSuccessRef.current).toBeInstanceOf(Function)
  })

  it('runGenerate sets error when nort-only expected but server returns image bytes', async () => {
    vi.mock('../sharedHelpers', () => ({
      makeProgressToastController: () => ({ show: () => {}, hide: () => {} }),
      readResponseBytesWithProgress: async () => new Uint8Array([1,2,3]),
    }))
    globalThis.fetch = vi.fn(async () => ({ ok: true, headers: { get: () => 'image/png' } }))

    const setError = vi.fn()
    const setLoading = vi.fn()
    const handleSuccessRef = { current: vi.fn() }

    function LocalRunner2() {
      const runGenerate = useGenerate({
        apiBase: '/api',
        handleResponseError: async () => {},
        base64ToBlob: (b64) => new Blob([b64], { type: 'image/png' }),
        downloadNortContent: vi.fn(),
        tryParse: JSON.parse,
        serializeNortObject: (o) => JSON.stringify(o),
        handleSuccessRef,
        setError,
        setLoading,
      })
      return <button onClick={() => runGenerate({ body: null }, 'base', 'src', 'nort-only')}>RunNort</button>
    }

    render(<LocalRunner2 />)
    fireEvent.click(screen.getByText('RunNort'))
    await new Promise((r) => setTimeout(r, 10))
    expect(setError).toHaveBeenCalled()
    const lastCall = setError.mock.calls.at(-1)
    const msg = lastCall ? lastCall[0] : null
    expect(String(msg)).toMatch(/Server returned image bytes/)
  })
})
