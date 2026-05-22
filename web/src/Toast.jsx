import React, { useState, useEffect } from 'react'
import { makeId } from './generate/utils'

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
    // showToast now expects an i18n key (string) or an object { key, params }
    // It resolves the message using `globalThis.__localizedFrontendLabels` and
    // will NOT fallback to English when a localized key is missing.
    const parseToastOptions = (opts) => {
      let type = 'info'
      let duration = 4000
      let dismissible = true
      let working = false
      if (typeof opts === 'string') {
        type = opts
      } else if (typeof opts === 'number') {
        duration = opts
      } else if (typeof opts === 'object' && opts !== null) {
        type = opts.type || type
        duration = opts.duration ?? duration
        dismissible = opts.dismissible ?? dismissible
        working = opts.working ?? working
      }
      return { type, duration, dismissible, working }
    }

    const resolveLocalizedMessage = (messageOrKey) => {
      try {
        const localized = (typeof globalThis !== 'undefined' && globalThis.__localizedFrontendLabels) || {}
        if (typeof messageOrKey === 'string') {
          return localized[messageOrKey] || null
        }
        if (messageOrKey && typeof messageOrKey === 'object' && messageOrKey.key) {
          let resolved = localized[messageOrKey.key] || null
          if (resolved && messageOrKey.params) {
            for (const [k, v] of Object.entries(messageOrKey.params)) {
              resolved = resolved.replaceAll(`{${k}}`, String(v))
            }
          }
          return resolved
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('i18n resolution failed for toast', e)
      }
      return null
    }

    const scheduleRemoval = (id, duration) => {
      if (duration > 0) {
        setTimeout(() => removeToastById(id), duration)
      }
    }

    globalThis.showToast = (messageOrKey, opts = {}) => {
      const { type, duration, dismissible, working } = parseToastOptions(opts)
      const resolvedMessage = resolveLocalizedMessage(messageOrKey)
      if (!resolvedMessage) {
        // Enforce no-fallback: do not display a toast when localized key missing
        // eslint-disable-next-line no-console
        console.warn('showToast: localized label missing for', messageOrKey)
        return null
      }

      const id = makeId()
      const now = Date.now()
      const toast = { id, message: resolvedMessage, type, duration, dismissible, working, createdAt: now }
      addToast(toast)
      scheduleRemoval(id, duration)
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
