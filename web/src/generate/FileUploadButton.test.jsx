import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import FileUploadButton from './FileUploadButton'
import { describe, it, expect, vi } from 'vitest'

describe('FileUploadButton', () => {
  it('calls onFileSelect when input changes', () => {
    const onFileSelect = vi.fn()
    const { container } = render(<FileUploadButton onFileSelect={onFileSelect} ariaLabel="upload" />)
    const input = container.querySelector('#nort-file-input')
    const file = new File(['x'], 'f.nort', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFileSelect).toHaveBeenCalled()
  })

  it('calls onDrop handler when dropped', () => {
    const onFileSelect = vi.fn()
    const { getByRole } = render(<FileUploadButton onFileSelect={onFileSelect} ariaLabel="upload" />)
    const btn = getByRole('button')
    const file = new File(['x'], 'f.nort', { type: 'text/plain' })
    const data = {
      dataTransfer: {
        files: [file],
      },
    }
    fireEvent.drop(btn, data)
    expect(onFileSelect).toHaveBeenCalled()
  })
})
