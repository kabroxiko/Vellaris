import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import Modal from '../Modal'

describe('Modal component behavior', () => {
  it('renders null when closed', () => {
    const { container } = render(<Modal open={false}>hi</Modal>)
    expect(container.firstChild).toBeNull()
  })

  it('calls onClose when Escape pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <div />
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('download button does nothing when image has no src, and triggers click when src present', () => {
    const onClose = vi.fn()
    // spy on anchor click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')

    const { getByLabelText, rerender } = render(
      <Modal open={true} onClose={onClose}>
        <img className="zoom-pan" alt="map preview" />
      </Modal>
    )

    const downloadBtn = getByLabelText('Download PNG')
    fireEvent.click(downloadBtn)
    // no src -> no click
    expect(clickSpy).not.toHaveBeenCalled()

    // now supply image with src and filename
    rerender(
      <Modal open={true} onClose={onClose}>
        <img className="zoom-pan" src="/img.png" data-filename="map.png" alt="map preview" />
      </Modal>
    )

    fireEvent.click(getByLabelText('Download PNG'))
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })
})
