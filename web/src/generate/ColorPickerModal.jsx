import React from 'react'
import PropTypes from 'prop-types'
import { modalBackdropStyle, modalContentStyle } from './customizeHelpers'

export default function ColorPickerModal({ open, onClose, children }) {
  const innerRef = React.useRef(null)
  React.useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const onMouseDown = (e) => {
      if (innerRef.current && !innerRef.current.contains?.(e.target)) onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    if (innerRef.current) {
      const btn = innerRef.current.querySelector('button, [tabindex], input, [role="button"]')
      if (btn && typeof btn.focus === 'function') btn.focus()
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <dialog
      ref={innerRef}
      style={modalBackdropStyle}
      open
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div style={modalContentStyle}>{children}</div>
    </dialog>
  )
}

ColorPickerModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  children: PropTypes.node,
}
