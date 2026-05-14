import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Modal from '../Modal'

describe('Modal component basic interactions', () => {
  it('renders children and calls onClose when overlay and close clicked', async () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <div>Content</div>
      </Modal>
    )

    // children visible
    expect(screen.getByText('Content')).toBeTruthy()

    // overlay dismiss button (full-area) exists and clicking it triggers onClose
    const overlayBtn = document.querySelector('.modal-overlay-dismiss')
    expect(overlayBtn).toBeTruthy()
    fireEvent.click(overlayBtn)
    await waitFor(() => expect(onClose).toHaveBeenCalled())

    // clicking the explicit close button
    const closeBtn = document.querySelector('.modal-close')
    expect(closeBtn).toBeTruthy()
    fireEvent.click(closeBtn)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2))
  })

  it('download button creates link when image present', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <img alt="zoom-pan" className="zoom-pan" src="data:image/png;base64,iVB" data-filename="map.png" />
      </Modal>
    )

    const downloadBtn = document.querySelector('.download')
    expect(downloadBtn).toBeTruthy()
    // spy on createElement and click to ensure link is created and clicked
    const appended = []
    const origCreate = document.createElement
    document.createElement = (name) => {
      const el = origCreate.call(document, name)
      if (name === 'a') {
        el.click = () => { appended.push('clicked') }
        el.remove = () => {}
      }
      return el
    }
    fireEvent.click(downloadBtn)
    document.createElement = origCreate
    expect(appended.length).toBe(1)
  })
})
