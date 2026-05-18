import React, { useState, useEffect } from 'react'

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '').slice(0, 8)
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(6)
    crypto.getRandomValues(arr)
    return Array.from(arr, (b) => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 8)
  }
  throw new Error('crypto unavailable: makeId requires crypto.randomUUID or crypto.getRandomValues')
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const removeToastById = (id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }

  const addToast = (toast) => {
    setToasts((t) => [...t, toast])
  }

  useEffect(() => {
    // expose simple global helpers for compatibility
    globalThis.showToast = (message, opts = {}) => {
      // signature: showToast(message, typeOrOptions?, duration?)
      let type = 'info'
      let duration = 4000
      let dismissible = true
      let working = false
      if (typeof opts === 'string') {
        type = opts
      } else if (typeof opts === 'number') {
        duration = opts
      } else if (typeof opts === 'object') {
        type = opts.type || type
        duration = opts.duration ?? duration
        dismissible = opts.dismissible ?? dismissible
        working = opts.working ?? working
      }

      const id = makeId()
      const now = Date.now()
      const toast = { id, message, type, duration, dismissible, working, createdAt: now }
      addToast(toast)

      if (duration > 0) {
        setTimeout(() => removeToastById(id), duration)
      }
      return id
    }

    globalThis.hideToast = (id) => {
      removeToastById(id)
    }

    return () => {
      globalThis.showToast = undefined
      globalThis.hideToast = undefined
    }
  }, [])

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <div className="toast-content">
            <span className="toast-leading" aria-hidden="true">
              {t.working ? <span className="toast-spinner" aria-hidden="true" /> : null}
            </span>
            <span className="toast-message" aria-live="polite" aria-atomic="true">
              {t.message}
            </span>
            <span className="toast-trailing" aria-hidden={!t.dismissible}>
              {t.dismissible && (
                <button
                  className="toast-close"
                  onClick={() => globalThis.hideToast?.(t.id)}
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </span>
          </div>
          {t.duration > 0 && (
            <div
              className="toast-progress"
              style={{ animationDuration: `${t.duration}ms` }}
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
