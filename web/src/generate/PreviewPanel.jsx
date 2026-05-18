import React from 'react'
import PropTypes from 'prop-types'
import FileUploadButton from './FileUploadButton'

export default function PreviewPanel({
  preview,
  handleFileInput,
  onDrop,
  openPreviewModal,
  handleDownloadMap,
  dropRef,
  fileName,
  loading,
}) {
  return (
    <div className="preview-panel">
      <div className="upload-group">
        <FileUploadButton
          onFileSelect={(file) => handleFileInput?.({ target: { files: [file] } })}
          onDrop={onDrop}
          ariaLabel="Upload settings file"
          chooseLabel="Choose file"
          fileName={fileName}
          loadedPrefix="Loaded"
          uploadHint="or drag and drop a settings file here"
          disabled={loading}
        />
      </div>

      <div className="preview-actions">
        {preview?.url ? (
          <div className="preview-thumb">
            <img src={preview.url} alt={preview.filename || 'Preview'} />
            <div className="preview-meta">
              <div className="preview-filename">{preview.filename}</div>
              <div className="preview-buttons">
                <button type="button" onClick={openPreviewModal} disabled={!preview?.url}>
                  Open
                </button>
                <button type="button" onClick={handleDownloadMap} disabled={!preview?.url}>
                  Download
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-preview">No preview available</div>
        )}
      </div>
    </div>
  )
}

PreviewPanel.propTypes = {
  preview: PropTypes.object,
  handleFileInput: PropTypes.func,
  onDrop: PropTypes.func,
  openPreviewModal: PropTypes.func,
  handleDownloadMap: PropTypes.func,
  dropRef: PropTypes.object,
  fileName: PropTypes.string,
  loading: PropTypes.bool,
}
