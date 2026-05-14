import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import PreviewPanel from './PreviewPanel'
import { describe, it, expect, vi } from 'vitest'

describe('PreviewPanel', () => {
  it('shows no preview when none provided', () => {
    const { getByText } = render(<PreviewPanel />)
    expect(getByText('No preview available')).toBeTruthy()
  })

  it('renders preview thumbnail and buttons when preview present', () => {
    const openPreviewModal = vi.fn()
    const handleDownloadMap = vi.fn()
    const handleFileInput = vi.fn()
    const preview = { url: 'data:,x', filename: 'map.png' }
    const { getByAltText, getByText } = render(
      <PreviewPanel
        preview={preview}
        openPreviewModal={openPreviewModal}
        handleDownloadMap={handleDownloadMap}
        handleFileInput={handleFileInput}
        fileName="map.png"
      />
    )
    expect(getByAltText('map.png')).toBeTruthy()
    const openBtn = getByText('Open')
    fireEvent.click(openBtn)
    expect(openPreviewModal).toHaveBeenCalled()
  })
})
