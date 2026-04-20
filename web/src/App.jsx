import React, { useState, useEffect } from 'react'
import GenerateForm from './GenerateForm'
import Modal from './Modal'
import ToastContainer from './Toast'

export default function App() {
  const [modal, setModal] = useState(null)

  useEffect(() => {
    globalThis.openModal = (url, filename) => setModal({ url, filename })
    globalThis.closeModal = () => setModal(null)
    return () => {
      globalThis.openModal = undefined
      globalThis.closeModal = undefined
    }
  }, [])

  return (
    <div className="app-root">
      <header>
        <div className="branding">
          <h1>Vellaris — Online Map Generator</h1>
        </div>
        <p>Upload a map settings file, or drag-and-drop — then click Generate.</p>
      </header>
      <main>
        <div className="content-card">
          <GenerateForm />
        </div>
      </main>
      <footer />
      <Modal open={!!modal} onClose={() => setModal(null)}>
        {modal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="zoom-container" style={{ borderRadius: 6 }}>
              <img
                className="zoom-pan"
                src={modal.url}
                alt="preview"
                data-filename={modal.filename}
                style={{ display: 'block' }}
              />
            </div>
          </div>
        )}
      </Modal>
      <ToastContainer />
    </div>
  )
}
