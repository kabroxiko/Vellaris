import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock child tabs to keep the component lightweight for testing
vi.mock('../tabs/BackgroundTab', () => ({ default: () => <div data-testid="background-tab" /> }))
vi.mock('../tabs/BorderTab', () => ({ default: () => <div data-testid="border-tab" /> }))
vi.mock('../tabs/EffectsTab', () => ({ default: () => <div data-testid="effects-tab" /> }))
vi.mock('../tabs/FontsTab', () => ({ default: () => <div data-testid="fonts-tab" /> }))

// Mock backgroundBaseCache used during preload/get to avoid network/bitmap work
vi.mock('../backgroundBaseCache', () => ({
  default: {
    preload: vi.fn(),
    get: vi.fn(() => Promise.resolve(new Blob(['x'], { type: 'image/png' }))),
  }
}))

import CustomizeSettingsSection from '../CustomizeSettingsSection'

const defaultOptions = {
  textures: [],
  borderTypes: [],
  i18n: {
    labels: {
      'ui.title.customize': 'Customize',
      'ui.subtitle.customize': 'Customize subtitle',
      'ui.noSourceHint': 'No source',
      'ui.preview.empty': 'No preview',
      'ui.preview.open': 'Open preview',
      'ui.button.regenerate': 'Regenerate',
      'ui.button.downloadSettings': 'Download Settings',
      'ui.button.downloadMap': 'Download Map',
    },
    options: {},
  },
  cityIconTypesByPack: {},
}

const noopHandlers = new Proxy({}, { get: () => () => {} })

describe('CustomizeSettingsSection (component-level)', () => {
  beforeEach(() => {
    // Provide a prefetched blob so the component's effect will use it
    globalThis.__prefetchedBackgroundPreviewBlob = new Blob(['x'], { type: 'image/png' })
  })

  afterEach(() => {
    delete globalThis.__prefetchedBackgroundPreviewBlob
    vi.resetAllMocks()
  })

  it('enables download settings when customization source present and not dirty', async () => {
    const ui = { loading: false, customizationDirty: false, hasGeneratedOnce: false }
    const values = { preview: null, fileObj: null, currentSource: {} }
    render(
      <CustomizeSettingsSection values={values} handlers={noopHandlers} options={defaultOptions} ui={ui} />
    )

    // Find the section-actions buttons (there are three action buttons).
    const actionButtons = Array.from(document.querySelectorAll('.section-actions button'))
    expect(actionButtons.length).toBeGreaterThanOrEqual(3)

    const downloadSettingsBtn = actionButtons[1]
    const downloadMapBtn = actionButtons[2]

    expect(downloadSettingsBtn.disabled).toBe(false)
    expect(downloadMapBtn.disabled).toBe(true)
  })

  it('disables downloads when customizationDirty and hasGeneratedOnce are true', async () => {
    const ui = { loading: false, customizationDirty: true, hasGeneratedOnce: true }
    const values = { preview: { url: 'blob:fake' }, fileObj: null, currentSource: {} }
    render(
      <CustomizeSettingsSection values={values} handlers={noopHandlers} options={defaultOptions} ui={ui} />
    )

    const actionButtons = Array.from(document.querySelectorAll('.section-actions button'))
    const downloadSettingsBtn = actionButtons[1]
    const downloadMapBtn = actionButtons[2]

    expect(downloadSettingsBtn.disabled).toBe(true)
    expect(downloadMapBtn.disabled).toBe(true)
  })

  it('enables map download when preview is available and not dirty', async () => {
    const ui = { loading: false, customizationDirty: false, hasGeneratedOnce: false }
    const values = { preview: { url: 'blob:preview' }, fileObj: null, currentSource: {} }
    render(
      <CustomizeSettingsSection values={values} handlers={noopHandlers} options={defaultOptions} ui={ui} />
    )

    const actionButtons = Array.from(document.querySelectorAll('.section-actions button'))
    const downloadSettingsBtn = actionButtons[1]
    const downloadMapBtn = actionButtons[2]

    expect(downloadSettingsBtn.disabled).toBe(false)
    expect(downloadMapBtn.disabled).toBe(false)
  })
})
