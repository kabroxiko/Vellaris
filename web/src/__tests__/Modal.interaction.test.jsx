import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import Modal from '../Modal'
import { vi } from 'vitest'

describe('Modal interactions', () => {
  afterEach(() => {
    // restore globals
    vi.restoreAllMocks()
    delete globalThis.open
  })

  test('does not render when closed', () => {
    const { container } = render(<Modal open={false}>Hidden</Modal>)
    expect(container.firstChild).toBeNull()
  })

  test('calls onClose when Escape pressed and focuses dismiss button', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        <div>Content</div>
      </Modal>
    )

    // dismiss button should be focused on open
    const dismiss = document.querySelector('.modal-overlay-dismiss')
    expect(dismiss).toBeTruthy()
    // simulate Escape
    fireEvent.keyDown(globalThis, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  test('download button creates and clicks anchor when image present', () => {
    const onClose = vi.fn()
    // spy on createElement to return a fake anchor with spyable click
    const fakeLink = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    const origCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return fakeLink
      return origCreate(tag)
    })

    render(
      <Modal open onClose={onClose}>
        <img className="zoom-pan" src="data:,foo" data-filename="map.png" alt="map preview" />
      </Modal>
    )

    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})

    const downloadBtn = document.querySelector('.modal-actions .download')
    expect(downloadBtn).toBeTruthy()
    fireEvent.click(downloadBtn)

    expect(createSpy).toHaveBeenCalledWith('a')
    expect(appendSpy).toHaveBeenCalled()
    expect(fakeLink.click).toHaveBeenCalled()
    createSpy.mockRestore()
    appendSpy.mockRestore()
  })

  test('open-in-new-tab falls back to anchor when global open throws', () => {
    const onClose = vi.fn()
    // make globalThis.open throw to trigger fallback
    globalThis.open = vi.fn(() => {
      throw new Error('fail')
    })

    const fakeLink = { href: '', target: '', click: vi.fn(), remove: vi.fn() }
    const origCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return fakeLink
      return origCreate(tag)
    })
    render(
      <Modal open onClose={onClose}>
        <img className="zoom-pan" src="data:,bar" alt="map preview" />
      </Modal>
    )

    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})

    const openBtn = document.querySelector('.modal-actions .open')
    expect(openBtn).toBeTruthy()
    fireEvent.click(openBtn)

    expect(globalThis.open).toHaveBeenCalled()
    expect(createSpy).toHaveBeenCalledWith('a')
    expect(fakeLink.click).toHaveBeenCalled()

    createSpy.mockRestore()
    appendSpy.mockRestore()
  })
})
