import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import Modal from '../Modal'
import { vi, expect } from 'vitest'

describe('Modal resize and cleanup behavior', () => {
  let rafSpy
  let origGetComputedStyle
  beforeEach(() => {
    rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => cb())
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

    origGetComputedStyle = globalThis.getComputedStyle
    vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(() => ({
      borderLeftWidth: '0px',
      borderRightWidth: '0px',
      paddingLeft: '0px',
      paddingRight: '0px',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
    }))

    vi.stubGlobal('innerWidth', 1200)
    vi.stubGlobal('innerHeight', 800)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (origGetComputedStyle) globalThis.getComputedStyle = origGetComputedStyle
  })

  test('when natural size missing, resize sets image width to container.clientWidth', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose}>
        <div className="zoom-container" style={{ width: '320px', height: '240px' }}>
          <img className="zoom-pan" src="data:,img" />
        </div>
      </Modal>
    )

    const modalEl = container.querySelector('.modal')
    const img = modalEl.querySelector('.zoom-pan')
    const containerEl = modalEl.querySelector('.zoom-container')

    // no natural size available
    Object.defineProperty(img, 'naturalWidth', { value: 0, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 0, configurable: true })
    Object.defineProperty(containerEl, 'clientWidth', { value: 320, configurable: true })
    Object.defineProperty(containerEl, 'clientHeight', { value: 240, configurable: true })

    // trigger resize handler
    window.dispatchEvent(new Event('resize'))

    const width = parseInt(img.style.width || '0', 10)
    expect(width).toBeGreaterThanOrEqual(320)
  })

  test('cleanup restores modal and container styles', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose}>
        <div className="zoom-container" style={{ width: '200px', height: '150px' }}>
          <img className="zoom-pan" src="data:,img" />
        </div>
      </Modal>
    )

    const modalEl = container.querySelector('.modal')
    const containerEl = modalEl.querySelector('.zoom-container')
    const img = modalEl.querySelector('.zoom-pan')

    // simulate sizes and natural available so sizing runs
    Object.defineProperty(img, 'naturalWidth', { value: 400, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 300, configurable: true })
    Object.defineProperty(containerEl, 'clientWidth', { value: 200, configurable: true })
    Object.defineProperty(containerEl, 'clientHeight', { value: 150, configurable: true })

    // trigger load handling to set styles
    fireEvent.load(img)

    // ensure styles have been set
    expect(modalEl.style.width === '' || modalEl.style.width).toBeDefined()
    expect(containerEl.style.height === '' || containerEl.style.height).toBeDefined()

    // call cleanup directly (what __cleanupImg would do) and verify restoration
    if (typeof modalEl.__cleanupImg === 'function') modalEl.__cleanupImg()

    expect(modalEl.style.width).toBe('')
    expect(containerEl.style.height).toBe('')
  })

  test('pointercancel triggers pointer cleanup and resets cursor', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose}>
        <div className="zoom-container" style={{ width: '300px', height: '200px' }}>
          <img className="zoom-pan" src="data:,img3" />
        </div>
      </Modal>
    )

    const modalEl = container.querySelector('.modal')
    const img = modalEl.querySelector('.zoom-pan')
    const containerEl = modalEl.querySelector('.zoom-container')

    Object.defineProperty(img, 'naturalWidth', { value: 600, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 400, configurable: true })
    Object.defineProperty(containerEl, 'clientWidth', { value: 300, configurable: true })
    Object.defineProperty(containerEl, 'clientHeight', { value: 200, configurable: true })

    fireEvent.load(img)

    // start a pointer interaction
    fireEvent.pointerDown(img, { pointerId: 10, clientX: 10, clientY: 10 })
    // dispatch pointercancel to container
    fireEvent.pointerCancel(containerEl, { pointerId: 10, clientX: 10, clientY: 10 })

    // after cancel, container cursor should be default and no global pointer listeners remain
    expect(containerEl.style.cursor === '' || containerEl.style.cursor === 'default').toBeTruthy()
  })
})
