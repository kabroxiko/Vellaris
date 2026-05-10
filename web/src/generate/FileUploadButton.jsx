import React, { useRef } from 'react'
import PropTypes from 'prop-types'

export default function FileUploadButton({
  onFileSelect,
  onDrop,
  ariaLabel,
  chooseLabel = 'Choose file',
  fileName = null,
  loadedPrefix = 'Loaded',
  uploadHint = 'or drag and drop a settings file here',
  disabled = false,
}) {
  const fileInputRef = useRef(null)

  const handleFileChange = (event) => {
    if (disabled) return
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
      // Clear the input value so selecting the same file again fires change
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDropEvent = (event) => {
    if (disabled) return
    if (onDrop) {
      onDrop(event)
    } else {
      event.preventDefault()
      event.stopPropagation()
      const file = event.dataTransfer?.files?.[0]
      if (file) {
        onFileSelect(file)
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        id="nort-file-input"
        type="file"
        accept=".json,.txt,.nort,text/plain,application/json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="dropzone"
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDropEvent}
        onDragOver={(e) => e.preventDefault()}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span className="file-choose-btn">{chooseLabel}</span>
        <span className="dropzone-hint">
          {fileName ? `${loadedPrefix} ${fileName}` : uploadHint}
        </span>
      </button>
    </>
  )
}

FileUploadButton.propTypes = {
  onFileSelect: PropTypes.func.isRequired,
  onDrop: PropTypes.func,
  ariaLabel: PropTypes.string,
  chooseLabel: PropTypes.string,
  fileName: PropTypes.string,
  loadedPrefix: PropTypes.string,
  uploadHint: PropTypes.string,
  disabled: PropTypes.bool,
}
