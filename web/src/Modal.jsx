import React, { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

export default function Modal({ open, onClose, children }) {
  const dismissRef = useRef(null)
  const modalRef = useRef(null)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') onClose?.()
    }

    if (open) {
      if (dismissRef.current) dismissRef.current.focus()
      globalThis.addEventListener('keydown', handleKey)

      // If the browser supports <dialog>, show it as a modal for proper accessibility
      const tryShow = () => {
        try {
          const d = modalRef.current
          if (typeof d?.showModal === 'function' && !d?.open) d.showModal()
        } catch (error) {
          if (error instanceof DOMException && error?.name === 'InvalidStateError') {
            return
          }
          throw error
        }
      }
      tryShow()

      const modalEl = modalRef.current
      let rafId = 0
      const setupModalImageHandlers = () => {
        const img = modalEl?.querySelector('.zoom-pan')
        const container = modalEl?.querySelector('.zoom-container')
        if (!img || !container) return

        let scale = 0
        let naturalW = img.naturalWidth || 0
        let naturalH = img.naturalHeight || 0
        let dragging = false
        let lastX = 0
        let lastY = 0
        let panOffsetX = 0
        let panOffsetY = 0
        const pointers = new Map()
        let initialPinchDist = 0
        let initialPinchScale = 1

        container.style.overflow = 'auto'
        container.style.cursor = 'grab'
        // Ensure pointer events for touch devices (iPad) go to our handlers
        container.style.touchAction = 'none'
        img.style.userSelect = 'none'
        img.style.touchAction = 'none'
        // Prevent iOS Safari image dragging
        img.style.webkitUserDrag = 'none'
        // Prevent native image dragging which interferes with pointer-drag panning
        const onDragStart = (ev) => ev.preventDefault()
        img.addEventListener('dragstart', onDragStart)

        const updateImageWidth = (w) => {
          img.style.width = `${w}px`
          img.style.height = 'auto'
        }

        const parsePx = (value) => Number.parseFloat(value || '0') || 0

        const getModalImageBounds = () => {
          const modalBody = modalEl.querySelector('.modal-body')
          const header = modalEl.querySelector('.modal-header')
          const modalStyles = globalThis.getComputedStyle(modalEl)
          const bodyStyles = modalBody ? globalThis.getComputedStyle(modalBody) : null

          const horizontalChrome =
            parsePx(modalStyles.borderLeftWidth) +
            parsePx(modalStyles.borderRightWidth) +
            parsePx(modalStyles.paddingLeft) +
            parsePx(modalStyles.paddingRight) +
            parsePx(bodyStyles?.paddingLeft) +
            parsePx(bodyStyles?.paddingRight)

          const verticalChrome =
            parsePx(modalStyles.borderTopWidth) +
            parsePx(modalStyles.borderBottomWidth) +
            parsePx(modalStyles.paddingTop) +
            parsePx(modalStyles.paddingBottom) +
            (header?.offsetHeight || 0) +
            parsePx(bodyStyles?.paddingTop) +
            parsePx(bodyStyles?.paddingBottom)

          // Keep this in sync with CSS `calc(100vw - 48px)` / `calc(100vh - 48px)`.
          const viewportInset = 48
          const maxImageW = Math.max(80, globalThis.innerWidth - viewportInset - horizontalChrome)
          const maxImageH = Math.max(80, globalThis.innerHeight - viewportInset - verticalChrome)

          return { maxImageW, maxImageH, horizontalChrome }
        }

        const getFitScale = () => {
          if (!naturalW || !naturalH) return 1
          const { maxImageW, maxImageH } = getModalImageBounds()
          return Math.min(1, maxImageW / naturalW, maxImageH / naturalH)
        }

        const applyModalSizing = (imgW, imgH) => {
          const { maxImageW, maxImageH, horizontalChrome } = getModalImageBounds()
          const finalImgH = Math.min(maxImageH, imgH)
          try {
            container.style.height = `${Math.round(finalImgH)}px`
          } catch (e) {
            console.warn('Modal: failed to set container height', e)
          }

          const finalModalWidth = Math.min(maxImageW, imgW) + horizontalChrome
          try {
            modalEl.style.width = `${Math.round(finalModalWidth)}px`
          } catch (e) {
            console.warn('Modal: failed to set modal width', e)
          }
        }

        const ensureNatural = () => {
          naturalW = img.naturalWidth || naturalW
          naturalH = img.naturalHeight || naturalH
          if (naturalW > 0 && naturalH > 0) {
            // Start fully zoomed out so the entire map is visible in the image area.
            scale = getFitScale()
            const newWidth = Math.round(naturalW * scale)
            const newHeight = Math.round(naturalH * scale)
            updateImageWidth(newWidth)
            applyModalSizing(newWidth, newHeight)
            // center image in container
            container.scrollLeft = Math.max(0, Math.round((newWidth - container.clientWidth) / 2))
            container.scrollTop = Math.max(0, Math.round((newHeight - container.clientHeight) / 2))
          }
        }

        // clear any forced maxHeight; we size container to the image aspect in ensureNatural
        try {
          container.style.maxHeight = ''
        } catch (e) {
          console.warn('Modal: failed to clear container maxHeight', e)
        }

        if (img.complete) ensureNatural()
        else img.addEventListener('load', ensureNatural, { once: true })

        const onWheel = (e) => {
          // Use wheel to zoom (desktop). Prevent default scrolling inside the container.
          e.preventDefault()
          const delta = -e.deltaY * 0.001
          if (!naturalW) return
          const fitScale = getFitScale()
          const maxScale = 8
          const newScale = Math.max(fitScale, Math.min(maxScale, scale * (1 + delta)))

          // cursor coords relative to container
          const rect = container.getBoundingClientRect()
          const cx = e.clientX - rect.left
          const cy = e.clientY - rect.top

          // image-space coord before scale
          const imgSpaceX = (container.scrollLeft + cx) / scale
          const imgSpaceY = (container.scrollTop + cy) / scale

          // apply new scale and keep cursor point stable
          scale = newScale
          const newWidth = Math.round(naturalW * scale)
          const newHeight = Math.round(naturalH * scale)
          updateImageWidth(newWidth)
          applyModalSizing(newWidth, newHeight)
          container.scrollLeft = Math.max(0, Math.round(imgSpaceX * scale - cx))
          container.scrollTop = Math.max(0, Math.round(imgSpaceY * scale - cy))
          // after zoom, reset any transform-based pan offsets so scroll takes over when possible
          panOffsetX = 0
          panOffsetY = 0
          img.style.transform = ''
        }

        const onPointerDown = (e) => {
          // preventDefault avoids native drag/selection and allows pointer capture
          e.preventDefault()
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
          try {
            container.setPointerCapture?.(e.pointerId)
          } catch (error) {
            if (
              error instanceof DOMException &&
              (error?.name === 'InvalidStateError' || error?.name === 'NotFoundError')
            ) {
              return
            }
            throw error
          }

          if (pointers.size === 1) {
            // start single-pointer pan
            dragging = true
            lastX = e.clientX
            lastY = e.clientY
            container.style.cursor = 'grabbing'
            globalThis.addEventListener('pointermove', onPointerMove)
            globalThis.addEventListener('pointerup', onPointerUp)
          } else if (pointers.size === 2) {
            // start pinch
            const pts = Array.from(pointers.values())
            const dx = pts[0].x - pts[1].x
            const dy = pts[0].y - pts[1].y
            initialPinchDist = Math.hypot(dx, dy)
            initialPinchScale = scale
          }
        }

        const onPointerMove = (e) => {
          if (pointers.has(e.pointerId)) {
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
          }

          if (pointers.size >= 2) {
            // pinch-to-zoom
            const pts = Array.from(pointers.values())
            const dx = pts[0].x - pts[1].x
            const dy = pts[0].y - pts[1].y
            const dist = Math.hypot(dx, dy)
            if (initialPinchDist > 0) {
              const factor = dist / initialPinchDist
              const fitScale = getFitScale()
              const newScale = Math.max(fitScale, Math.min(8, initialPinchScale * factor))
              // compute center point between the two fingers
              const cx = (pts[0].x + pts[1].x) / 2
              const cy = (pts[0].y + pts[1].y) / 2
              const rect = container.getBoundingClientRect()
              const localX = cx - rect.left
              const localY = cy - rect.top
              const imgSpaceX = (container.scrollLeft + localX) / scale
              const imgSpaceY = (container.scrollTop + localY) / scale
              scale = newScale
              const newWidth = Math.round(naturalW * scale)
              const newHeight = Math.round(naturalH * scale)
              updateImageWidth(newWidth)
              applyModalSizing(newWidth, newHeight)
              container.scrollLeft = Math.max(0, Math.round(imgSpaceX * scale - localX))
              container.scrollTop = Math.max(0, Math.round(imgSpaceY * scale - localY))
            }
            return
          }

          if (!dragging) return
          const dx = e.clientX - lastX
          const dy = e.clientY - lastY
          lastX = e.clientX
          lastY = e.clientY

          // horizontal: prefer native scroll when possible, otherwise apply transform
          if (container.scrollWidth > container.clientWidth) {
            container.scrollLeft = Math.max(0, container.scrollLeft - dx)
          } else {
            panOffsetX += dx
          }

          // vertical: prefer native scroll when possible, otherwise apply transform
          if (container.scrollHeight > container.clientHeight) {
            container.scrollTop = Math.max(0, container.scrollTop - dy)
          } else {
            panOffsetY += dy
          }

          if (panOffsetX !== 0 || panOffsetY !== 0) {
            img.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px)`
          }
        }

        const onPointerUp = (e) => {
          try {
            ;(e.target || container).releasePointerCapture?.(e.pointerId)
          } catch (error) {
            if (
              error instanceof DOMException &&
              (error?.name === 'InvalidStateError' || error?.name === 'NotFoundError')
            ) {
              return
            }
            throw error
          }
          pointers.delete(e.pointerId)
          if (pointers.size === 0) {
            dragging = false
            container.style.cursor = 'default'
            globalThis.removeEventListener('pointermove', onPointerMove)
            globalThis.removeEventListener('pointerup', onPointerUp)
            initialPinchDist = 0
            initialPinchScale = scale
          } else if (pointers.size === 1) {
            const remaining = Array.from(pointers.values())[0]
            lastX = remaining.x
            lastY = remaining.y
          }
        }

        container.addEventListener('wheel', onWheel, { passive: false })
        container.addEventListener('pointerdown', onPointerDown)
        container.addEventListener('pointercancel', onPointerUp)
        img.addEventListener('pointerdown', onPointerDown)
        img.addEventListener('pointercancel', onPointerUp)

        const onResize = () => {
          if (naturalW > 0 && naturalH > 0) {
            const fitScale = getFitScale()
            if (scale < fitScale) scale = fitScale
            const newW = Math.round(naturalW * scale)
            const newH = Math.round(naturalH * scale)
            updateImageWidth(newW)
            applyModalSizing(newW, newH)
          } else {
            updateImageWidth(container.clientWidth)
          }
        }
        globalThis.addEventListener('resize', onResize)

        const cleanupImg = () => {
          container.removeEventListener('wheel', onWheel)
          container.removeEventListener('pointerdown', onPointerDown)
          container.removeEventListener('pointercancel', onPointerUp)
          img.removeEventListener('pointerdown', onPointerDown)
          img.removeEventListener('pointercancel', onPointerUp)
          img.removeEventListener('dragstart', onDragStart)
          globalThis.removeEventListener('pointermove', onPointerMove)
          globalThis.removeEventListener('pointerup', onPointerUp)
          globalThis.removeEventListener('resize', onResize)
          cancelAnimationFrame(rafId)
          // restore styles
          modalEl.style.width = ''
          container.style.height = ''
        }

        modalEl.__cleanupImg = cleanupImg
      }

      // Run setup synchronously so tests that fire events immediately see handlers,
      // and schedule a RAF-optimized run as well.
      const safeSetupModalImageHandlers = () => {
        try {
          setupModalImageHandlers()
        } catch (e) {
          console.error('Error setting up modal image handlers:', e)
        }
      }

      safeSetupModalImageHandlers()
      rafId = requestAnimationFrame(safeSetupModalImageHandlers)

      return () => cancelAnimationFrame(rafId)
    }

    return () => {
      globalThis.removeEventListener('keydown', handleKey)
      const modalEl = modalRef.current
      if (modalEl?.__cleanupImg) {
        modalEl.__cleanupImg()
        delete modalEl.__cleanupImg
      }
      // close the native dialog if open
      if (typeof modalEl?.close === 'function' && modalEl?.open) modalEl.close()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay">
      {/* Full-area native button used to receive clicks and keyboard activation */}
      <button
        ref={dismissRef}
        onClick={onClose}
        aria-label="Close modal"
        className="modal-overlay-dismiss"
        style={{
          position: 'absolute',
          inset: 0,
          border: 0,
          padding: 0,
          margin: 0,
          background: 'transparent',
        }}
      />
      <dialog className="modal" aria-modal="true" ref={modalRef}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path
              d="M3 3 L15 15 M15 3 L3 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="modal-header">
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-primary download"
              onClick={() => {
                const modalEl = modalRef.current
                const img = modalEl?.querySelector('.zoom-pan')
                if (!img?.src) return
                const link = document.createElement('a')
                link.href = img.src
                const filename = img.dataset?.filename || 'nortantis-map.png'
                link.download = filename
                document.body.appendChild(link)
                link.click()
                link.remove()
              }}
              aria-label="Download PNG"
            >
              Download PNG
            </button>

            <button
              type="button"
              className="btn btn-ghost open"
              onClick={() => {
                const modalEl = modalRef.current
                const img = modalEl?.querySelector('.zoom-pan')
                if (!img?.src) return
                try {
                  globalThis.open(img.src, '_blank', 'noopener')
                } catch (error) {
                  console.warn('Modal: failed to open image in new tab', error)
                  // fallback: create link
                  const a = document.createElement('a')
                  a.href = img.src
                  a.target = '_blank'
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                }
              }}
              aria-label="Open image in new tab"
            >
              Open in new tab
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </dialog>
    </div>
  )
}

Modal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  children: PropTypes.node,
}

Modal.defaultProps = {
  open: false,
  onClose: () => {},
  children: null,
}
