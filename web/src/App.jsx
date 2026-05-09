import React, { useState, useEffect } from 'react'
import GenerateForm from './generate/GenerateForm'
import Modal from './Modal'
import ToastContainer from './Toast'

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
]

const TEXT = {
  en: {
    title: 'Vellaris — Online Map Generator',
    description:
      'Generate a random map instantly, or upload a map settings file to render it as an image.',
    languageLabel: 'Language',
  },
  es: {
    title: 'Vellaris — Generador de mapas en linea',
    description:
      'Genera un mapa aleatorio al instante o sube un archivo de configuracion para renderizarlo como imagen.',
    languageLabel: 'Idioma',
  },
  de: {
    title: 'Vellaris — Online-Kartengenerator',
    description:
      'Erzeuge sofort eine zufallige Karte oder lade eine Einstellungsdatei hoch, um sie als Bild zu rendern.',
    languageLabel: 'Sprache',
  },
  fr: {
    title: 'Vellaris — Generateur de cartes en ligne',
    description:
      'Generez une carte aleatoire instantanement ou importez un fichier de configuration pour la rendre en image.',
    languageLabel: 'Langue',
  },
  pt: {
    title: 'Vellaris — Gerador de mapas online',
    description:
      'Gere um mapa aleatorio instantaneamente ou envie um arquivo de configuracao para renderiza-lo como imagem.',
    languageLabel: 'Idioma',
  },
  ru: {
    title: 'Vellaris — Онлайн-генератор карт',
    description:
      'Мгновенно создайте случайную карту или загрузите файл настроек, чтобы отрисовать ее как изображение.',
    languageLabel: 'Язык',
  },
  zh: {
    title: 'Vellaris — 在线地图生成器',
    description: '立即生成随机地图，或上传地图设置文件并将其渲染为图像。',
    languageLabel: '语言',
  },
}

function getInitialLanguage() {
  const stored = localStorage.getItem('vellaris-language')
  if (stored && TEXT[stored]) {
    return stored
  }

  const browserLanguage = (navigator.language || 'en').slice(0, 2).toLowerCase()
  if (TEXT[browserLanguage]) {
    return browserLanguage
  }

  return 'en'
}

export default function App() {
  const [modal, setModal] = useState(null)
  const [uiLanguage, setUiLanguage] = useState(getInitialLanguage)

  const text = TEXT[uiLanguage] || TEXT.en

  useEffect(() => {
    globalThis.openModal = (url, filename) => setModal({ url, filename })
    globalThis.closeModal = () => setModal(null)
    return () => {
      globalThis.openModal = undefined
      globalThis.closeModal = undefined
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('vellaris-language', uiLanguage)
    document.documentElement.lang = uiLanguage
  }, [uiLanguage])

  return (
    <div className="app-root">
      <header>
        <div className="header-top-row">
          <div className="branding">
            <h1>{text.title}</h1>
          </div>
          <label className="language-picker" htmlFor="language-selector">
            <span>{text.languageLabel}</span>
            <select
              id="language-selector"
              value={uiLanguage}
              onChange={(e) => setUiLanguage(e.target.value)}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>{text.description}</p>
      </header>
      <main>
        <div className="content-card">
          <GenerateForm uiLanguage={uiLanguage} />
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
