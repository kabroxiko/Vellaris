import React, { useEffect } from 'react'
import { render, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest'

// repeat the same mock for sharedHelpers used by the hook
vi.mock('../../sharedHelpers', () => ({
  deriveNortFilenameFromContent: (c) => null,
  sanitizeFilenameBase: (b, def) => b || def,
}))

import usePreview from '../usePreview'

function TestComp(props) {
  const hook = usePreview(props)
  useEffect(() => {
    globalThis.__usePreview = hook
  }, [hook])
  return null
}

describe('usePreview additional branches', () => {
  let origURL
  beforeEach(() => {
    origURL = globalThis.URL
    globalThis.URL = {
      createObjectURL: vi.fn(() => 'blob://u2'),
      revokeObjectURL: vi.fn(),
    }
    globalThis.showToast = vi.fn()
    globalThis.openModal = vi.fn()
  })

  afterEach(() => {
    globalThis.URL = origURL
    delete globalThis.__usePreview
    delete globalThis.showToast
    delete globalThis.openModal
    vi.restoreAllMocks()
  })

  it('setCurrentSource functional updater respects prev when source is random', async () => {
    const mergedSettingsRef = { current: {} }
    const setCurrentSource = vi.fn()
    const setHasGeneratedOnce = vi.fn()
    const setCustomizationDirty = vi.fn()
    const setFileName = vi.fn()

    render(
      <TestComp
        mergedSettingsRef={mergedSettingsRef}
        setCurrentSource={setCurrentSource}
        setHasGeneratedOnce={setHasGeneratedOnce}
        setCustomizationDirty={setCustomizationDirty}
        setFileName={setFileName}
      />
    )

    // call handleSuccess with no nortContent but a random source
    const source = { type: 'random', name: 'R' }
    const blob = new Blob(['x'], { type: 'image/png' })
    globalThis.__usePreview.handleSuccess(blob, 'base', source, null)

    await waitFor(() => expect(globalThis.__usePreview.preview).toBeTruthy())

    // setCurrentSource should have been called with a function (updater)
    expect(setCurrentSource).toHaveBeenCalled()
    const arg = setCurrentSource.mock.calls[0][0]
    expect(typeof arg).toBe('function')

    // when prev has nortContent, the updater should return prev (no change)
    const prev = { nortContent: 'x', name: 'old' }
    const out = arg(prev)
    expect(out).toBe(prev)

    // when prev has no nortContent, updater should return the source
    const out2 = arg({})
    expect(out2).toEqual(source)
  })

  it('openPreviewModal and handleDownloadMap are no-ops when no preview', async () => {
    const mergedSettingsRef = { current: {} }
    const setCurrentSource = vi.fn()
    const setHasGeneratedOnce = vi.fn()
    const setCustomizationDirty = vi.fn()
    const setFileName = vi.fn()

    render(
      <TestComp
        mergedSettingsRef={mergedSettingsRef}
        setCurrentSource={setCurrentSource}
        setHasGeneratedOnce={setHasGeneratedOnce}
        setCustomizationDirty={setCustomizationDirty}
        setFileName={setFileName}
      />
    )

    // preview initially null
    expect(globalThis.__usePreview.preview).toBeNull()

    // should not throw or call global handlers
    globalThis.__usePreview.openPreviewModal()
    globalThis.__usePreview.handleDownloadMap()
    expect(globalThis.openModal).not.toHaveBeenCalled()
    expect(globalThis.showToast).not.toHaveBeenCalled()
  })
})
