// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ColorPickerModal } from '../CustomizeSettingsSection'

describe('ColorPickerModal', () => {
  it('does not render when open is false', () => {
    const onClose = vi.fn()
    const { container } = render(<ColorPickerModal open={false} onClose={onClose}>Hidden</ColorPickerModal>)
    expect(container.firstChild).toBeNull()
  })

  it('renders when open and closes on Escape key', () => {
    const onClose = vi.fn()
    render(<ColorPickerModal open={true} onClose={onClose}><button>Inside</button></ColorPickerModal>)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when clicking outside the modal', () => {
    const onClose = vi.fn()
    render(
      <div>
        <ColorPickerModal open={true} onClose={onClose}><div>inner</div></ColorPickerModal>
        <div data-testid="outside">outside</div>
      </div>
    )
    const outside = screen.getByTestId('outside')
    fireEvent.mouseDown(outside)
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onClose when clicking inside the modal', () => {
    const onClose = vi.fn()
    render(<ColorPickerModal open={true} onClose={onClose}><button data-testid="inside">inside</button></ColorPickerModal>)
    const inside = screen.getByTestId('inside')
    fireEvent.mouseDown(inside)
    expect(onClose).not.toHaveBeenCalled()
  })
})
