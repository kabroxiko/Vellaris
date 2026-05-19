import React, { useEffect } from 'react'
import { render, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest'

// Mock helpers used by the hook before importing it
vi.mock('../../sharedHelpers', () => ({
  deriveNortFilenameFromContent: (c) => 'derived-name',
  sanitizeFilenameBase: (b, def) => (b || def),
}))

import usePreview from '../usePreview'

function TestComp(props) {
  const hook = usePreview(props)
  useEffect(() => {
    globalThis.__usePreview = hook
  }, [hook])
  return null
}

describe('usePreview hook', () => {
  let origURL
  let origShowToast
  beforeEach(() => {
    origURL = globalThis.URL
    origShowToast = globalThis.showToast
    globalThis.URL = {
      createObjectURL: vi.fn(() => 'blob://u1'),
      revokeObjectURL: vi.fn(),
    }
    globalThis.showToast = vi.fn()
    // ensure openModal exists for openPreviewModal test
    globalThis.openModal = vi.fn()
  })

  afterEach(() => {
    globalThis.URL = origURL
    globalThis.showToast = origShowToast
    delete globalThis.__usePreview
    delete globalThis.openModal
    vi.restoreAllMocks()
  })

  it('handleSuccess sets preview, filename, updates source and mergedSettingsRef', async () => {
    const mergedSettingsRef = { current: {} }
    const setCurrentSource = vi.fn()
    const setHasGeneratedOnce = vi.fn()
    const setCustomizationDirty = vi.fn()
    const setFileName = vi.fn()

    const { unmount } = render(
      <TestComp
        mergedSettingsRef={mergedSettingsRef}
        setCurrentSource={setCurrentSource}
        setHasGeneratedOnce={setHasGeneratedOnce}
        setCustomizationDirty={setCustomizationDirty}
        setFileName={setFileName}
      />
    )

    const blob = new Blob(['x'], { type: 'image/png' })
    const source = { type: 'nonsense', name: 'S' }
    const nortContent = JSON.stringify({ hello: 'world' })

    // call handleSuccess
    globalThis.__usePreview.handleSuccess(blob, 'baseName', source, nortContent)

    await waitFor(() => expect(globalThis.__usePreview.preview).toBeTruthy())
    expect(globalThis.__usePreview.preview.url).toBe('blob://u1')
    expect(globalThis.__usePreview.preview.filename).toBe('derived-name.png')

    // mergedSettingsRef should be parsed from nortContent
    expect(mergedSettingsRef.current).toEqual({ hello: 'world' })
    expect(setCurrentSource).toHaveBeenCalled()
    expect(globalThis.showToast).toHaveBeenCalled()
    expect(setHasGeneratedOnce).toHaveBeenCalledWith(true)
    expect(setCustomizationDirty).toHaveBeenCalledWith(false)

    // test openPreviewModal calls global openModal
    globalThis.__usePreview.openPreviewModal()
    expect(globalThis.openModal).toHaveBeenCalledWith('blob://u1', 'derived-name.png')

    // test download behavior: spy on anchor click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    globalThis.__usePreview.handleDownloadMap()
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()

    // unmount should revoke object URL
    unmount()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob://u1')
  })
})
