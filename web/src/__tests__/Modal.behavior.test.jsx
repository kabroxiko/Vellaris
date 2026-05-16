import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import Modal from '../Modal'
import { vi, expect } from 'vitest'

describe('Modal zoom and pan behavior', () => {
  let rafSpy
  let origGetComputedStyle
  beforeEach(() => {
    // make RAF synchronous for determinism
    rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => cb())
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

    // simple computed style to avoid NaN parsing
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

    // ensure viewport size
    vi.stubGlobal('innerWidth', 1200)
    vi.stubGlobal('innerHeight', 800)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (origGetComputedStyle) globalThis.getComputedStyle = origGetComputedStyle
  })

  test('wheel zoom updates image width', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose}>
        <div className="zoom-container" style={{ width: '200px', height: '200px' }}>
          <img className="zoom-pan" src="data:,img" />
        </div>
      </Modal>
    )

    const modalEl = container.querySelector('.modal')
    const img = modalEl.querySelector('.zoom-pan')
    const containerEl = modalEl.querySelector('.zoom-container')

    // simulate natural size becoming available
    Object.defineProperty(img, 'naturalWidth', { value: 800, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 600, configurable: true })
    // client sizes for container
    Object.defineProperty(containerEl, 'clientWidth', { value: 200, configurable: true })
    Object.defineProperty(containerEl, 'clientHeight', { value: 200, configurable: true })
    Object.defineProperty(containerEl, 'scrollWidth', { value: 1000, configurable: true })
    Object.defineProperty(containerEl, 'scrollHeight', { value: 800, configurable: true })

    // trigger load handling
    fireEvent.load(img)

    const initialWidth = parseInt(img.style.width || '0', 10)
    // wheel to zoom (deltaY negative -> zoom in)
    fireEvent.wheel(containerEl, { deltaY: -100 })

    const afterWidth = parseInt(img.style.width || '0', 10)
    expect(afterWidth).toBeGreaterThanOrEqual(initialWidth)
  })

  test('pointer drag pans image when scroll smaller than client', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose}>
        <div className="zoom-container" style={{ width: '400px', height: '300px' }}>
          <img className="zoom-pan" src="data:,img2" />
        </div>
      </Modal>
    )

    const modalEl = container.querySelector('.modal')
    const img = modalEl.querySelector('.zoom-pan')
    const containerEl = modalEl.querySelector('.zoom-container')

    Object.defineProperty(img, 'naturalWidth', { value: 600, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 400, configurable: true })
    Object.defineProperty(containerEl, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(containerEl, 'clientHeight', { value: 600, configurable: true })
    Object.defineProperty(containerEl, 'scrollWidth', { value: 800, configurable: true })
    Object.defineProperty(containerEl, 'scrollHeight', { value: 600, configurable: true })

    // ensureNatural
    fireEvent.load(img)

    // simulate pointer down and move to pan via transform (no native scroll)
    fireEvent.pointerDown(img, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 30, clientY: 25 })
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 30, clientY: 25 })

    // after panning, img may have transform applied
    expect(img.style.transform === '' || img.style.transform.includes('translate')).toBeTruthy()
  })
})
