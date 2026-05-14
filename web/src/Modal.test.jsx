import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from './Modal.jsx'

describe('Modal component', () => {
  it('renders when open and calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <div>content</div>
      </Modal>
    )

    // close button overlay should be present
    const dismiss = screen.getByLabelText('Close modal')
    expect(dismiss).toBeTruthy()

    // simulate Escape key
    fireEvent.keyDown(globalThis, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
