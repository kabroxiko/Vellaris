import React, { useState, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function handleResponseError(res) {
  const headersObj = Object.fromEntries(res.headers.entries())
  let txt = await res.text()
  try {
    const j = JSON.parse(txt)
    txt = j.message || txt
  } catch (e) {
    console.warn('Failed to parse error response as JSON', e)
  }
  console.error('API /generate error:', {
    status: res.status,
    headers: headersObj,
    bodyPreview: txt.slice(0, 200),
  })
  throw new Error(`Server returned ${res.status}: ${txt}`)
}

export default function GenerateForm() {
  const [nortText, setNortText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileObj, setFileObj] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [width, setWidth] = useState(2000)
  const [height, setHeight] = useState(1200)
  const [seed, setSeed] = useState('')
  const [saveNort, setSaveNort] = useState(false)
  const dropRef = useRef(null)

  const handleFile = useCallback((f) => {
    if (!f) return
    setFileName(f.name)
    setFileObj(f)
    // clear any previously pasted text (paste UI was removed)
    setNortText('')
  }, [])

  function handleFileInput(e) {
    handleFile(e.target.files?.[0])
  }

  // Drag & drop
  function onDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  function buildRequest() {
    if (fileObj) {
      const fd = new FormData()
      fd.append('nortFile', fileObj, fileObj.name)
      if (width) fd.append('width', String(width))
      if (height) fd.append('height', String(height))
      if (seed) fd.append('seed', String(seed))
      if (saveNort) fd.append('saveNort', 'true')
      fd.append('returnImageBytes', 'true')
      return { method: 'POST', body: fd }
    }
    const payload = {
      nortContent: nortText?.trim().length > 0 ? nortText : undefined,
      width: width || undefined,
      height: height || undefined,
      seed: seed ? Number(seed) : undefined,
      saveNort: saveNort || undefined,
      returnImageBytes: true,
    }
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  }

  function handleSuccess(blob) {
    const url = URL.createObjectURL(blob)
    try {
      const dlName = fileName ? `${fileName.replace(/\.[^.]+$/, '')}.png` : 'vellaris-map.png'
      globalThis.openModal?.(url, dlName)
    } catch (e) {
      console.warn('openModal failed', e)
    }
    try {
      globalThis.showToast?.('Map generated', 'success', 3000)
    } catch (e) {
      console.warn('showToast failed', e)
    }
  }

  async function handleSubmit(evt) {
    evt.preventDefault()
    setError(null)
    setLoading(true)
    let persistentToastId = null
    try {
      persistentToastId =
        globalThis.showToast?.('Generating map — this may take a minute…', 'info', 0) ?? null
    } catch (e) {
      console.warn('showToast failed', e)
    }
    try {
      const requestOptions = buildRequest()
      const res = await fetch(`${API_BASE}/generate`, requestOptions)

      if (!res.ok) {
        await handleResponseError(res)
      }

      const blob = await res.blob()
      handleSuccess(blob)
    } catch (err) {
      setError(err.message)
      try {
        globalThis.showToast?.(err.message, 'error', 6000)
      } catch (e) {
        console.warn('showToast failed', e)
      }
    } finally {
      setLoading(false)
      try {
        if (persistentToastId) globalThis.hideToast?.(persistentToastId)
      } catch (e) {
        console.warn('hideToast failed', e)
      }
    }
  }

  return (
    <form className="generate-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="input-column">
          <div className="upload-group">
            <label htmlFor="nort-file-input">Upload map settings file</label>
            <input
              id="nort-file-input"
              type="file"
              accept=".nort,text/plain"
              onChange={handleFileInput}
            />
            <button
              ref={dropRef}
              type="button"
              className="dropzone"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('nort-file-input')?.click()}
              aria-label="Upload or drop map settings file"
            >
              {fileName ? (
                <span>Loaded: {fileName}</span>
              ) : (
                <span>Drag & drop a map settings file here</span>
              )}
            </button>
          </div>

          {/* Paste area removed per request; only file upload / drag-and-drop supported */}
        </div>

        <aside className="controls-column">
          <h3>Options</h3>
          <label htmlFor="width-input">Width</label>
          <input
            id="width-input"
            type="number"
            min={200}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
          <label htmlFor="height-input">Height</label>
          <input
            id="height-input"
            type="number"
            min={200}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
          <label htmlFor="seed-input">Seed (optional)</label>
          <input
            id="seed-input"
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="e.g. 12345"
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={saveNort}
              onChange={(e) => setSaveNort(e.target.checked)}
            />{' '}
            Save the map settings file alongside image
          </label>
          <div className="actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </aside>
      </div>

      {/* Toaster shows persistent generating message while request runs */}
      {error && <div className="error">{error}</div>}

      {/* result is shown inside modal — open modal on successful generation */}
    </form>
  )
}
