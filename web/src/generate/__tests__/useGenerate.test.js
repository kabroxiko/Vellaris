import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock sharedHelpers imported by the hook
vi.mock('../sharedHelpers', () => ({
  readResponseBytesWithProgress: vi.fn(),
  makeProgressToastController: () => ({ show: vi.fn(), hide: vi.fn() }),
}))

import useGenerate from '../hooks/useGenerate.js'
import PropTypes from 'prop-types'

function TestHarness({ deps, call }) {
  const runGenerate = useGenerate(deps)
  React.useEffect(() => {
    call(runGenerate)
  }, [runGenerate])
  return null
}

TestHarness.propTypes = {
  deps: PropTypes.object,
  call: PropTypes.func,
}

describe('useGenerate runGenerate branches', () => {
  it('calls handleSuccess for non-JSON image response', async () => {
    const { readResponseBytesWithProgress } = await import('../sharedHelpers')
    readResponseBytesWithProgress.mockResolvedValueOnce(new Uint8Array([1, 2, 3]))

    globalThis.fetch = vi.fn(async () => ({ ok: true, headers: { get: () => 'image/png' } }))

    const handleSuccessRef = { current: vi.fn() }
    const deps = {
      apiBase: '/api',
      handleResponseError: vi.fn(),
      base64ToBlob: vi.fn(),
      downloadNortContent: vi.fn(),
      tryParse: (s) => JSON.parse(s),
      serializeNortObject: (o) => JSON.stringify(o),
      handleSuccessRef,
      setError: vi.fn(),
      setLoading: vi.fn(),
    }

    let callRun
    render(React.createElement(TestHarness, { deps, call: (r) => (callRun = r) }))
    await callRun({ body: null }, 'name', null, 'preview')
    expect(handleSuccessRef.current).toHaveBeenCalled()
  })

  it('handles JSON imageBase64 response and calls base64ToBlob', async () => {
    const { readResponseBytesWithProgress } = await import('../sharedHelpers')
    const payload = { imageBase64: 'QQ==', nortContent: '{}' }
    readResponseBytesWithProgress.mockResolvedValueOnce(
      new TextEncoder().encode(JSON.stringify(payload))
    )

    globalThis.fetch = vi.fn(async () => ({ ok: true, headers: { get: () => 'application/json' } }))

    const handleSuccessRef = { current: vi.fn() }
    const base64ToBlob = vi.fn(() => new Blob(['x']))
    const deps = {
      apiBase: '/api',
      handleResponseError: vi.fn(),
      base64ToBlob,
      downloadNortContent: vi.fn(),
      tryParse: (s) => JSON.parse(s),
      serializeNortObject: (o) => JSON.stringify(o),
      handleSuccessRef,
      setError: vi.fn(),
      setLoading: vi.fn(),
    }

    let callRun
    render(React.createElement(TestHarness, { deps, call: (r) => (callRun = r) }))
    await callRun({ body: null }, 'bname', null, 'preview')
    expect(base64ToBlob).toHaveBeenCalled()
    expect(handleSuccessRef.current).toHaveBeenCalled()
  })

  it('appends returnSettings for nort-only FormData body', async () => {
    const { readResponseBytesWithProgress } = await import('../sharedHelpers')
    readResponseBytesWithProgress.mockResolvedValueOnce(new Uint8Array([1]))

    globalThis.fetch = vi.fn(async () => ({ ok: true, headers: { get: () => 'image/png' } }))

    const handleSuccessRef = { current: vi.fn() }
    const deps = {
      apiBase: '/api',
      handleResponseError: vi.fn(),
      base64ToBlob: vi.fn(),
      downloadNortContent: vi.fn(),
      tryParse: (s) => JSON.parse(s),
      serializeNortObject: (o) => JSON.stringify(o),
      handleSuccessRef,
      setError: vi.fn(),
      setLoading: vi.fn(),
    }

    const body = new FormData()
    let callRun
    render(React.createElement(TestHarness, { deps, call: (r) => (callRun = r) }))
    await callRun({ body }, 'bn', null, 'nort-only')
    // FormData should contain returnSettings field
    expect([...body.keys()]).toContain('returnSettings')
  })

  it('handles fetch non-ok by calling handleResponseError and setting error', async () => {
    const { readResponseBytesWithProgress } = await import('../sharedHelpers')
    readResponseBytesWithProgress.mockResolvedValueOnce(new Uint8Array([1]))

    const handleResponseError = vi.fn(async () => {
      throw new Error('failed')
    })
    globalThis.fetch = vi.fn(async () => ({ ok: false }))

    const setError = vi.fn()
    const deps = {
      apiBase: '/api',
      handleResponseError,
      base64ToBlob: vi.fn(),
      downloadNortContent: vi.fn(),
      tryParse: (s) => JSON.parse(s),
      serializeNortObject: (o) => JSON.stringify(o),
      handleSuccessRef: { current: vi.fn() },
      setError,
      setLoading: vi.fn(),
    }

    let callRun
    render(React.createElement(TestHarness, { deps, call: (r) => (callRun = r) }))
    await callRun({ body: null }, 'bn', null, 'preview')
    expect(handleResponseError).toHaveBeenCalled()
    expect(setError).toHaveBeenCalled()
  })
})
