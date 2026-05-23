import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock tab components to keep tests focused and lightweight
vi.mock('../tabs/BackgroundTab', () => ({
  default: (props) => React.createElement('div', {}, 'BackgroundTab:' + (props.backgroundType || '')),
}))
vi.mock('../tabs/BorderTab', () => ({
  default: () => React.createElement('div', {}, 'BorderTab'),
}))
vi.mock('../tabs/EffectsTab', () => ({
  default: () => React.createElement('div', {}, 'EffectsTab'),
}))
vi.mock('../tabs/FontsTab', () => ({
  default: () => React.createElement('div', {}, 'FontsTab'),
}))

import CustomizeSettingsSection from '../CustomizeSettingsSection'

describe('CustomizeSettingsSection', () => {
  let handlers
  beforeEach(() => {
    handlers = {
      setOceanWavesColor: vi.fn(),
      setConcentricWaveCount: vi.fn(),
      setFadeConcentricWaves: vi.fn(),
      setJitterToConcentricWaves: vi.fn(),
      setBrokenLinesForConcentricWaves: vi.fn(),
      setDrawOceanEffectsInLakes: vi.fn(),
      setRiverColor: vi.fn(),
      setDrawRoads: vi.fn(),
      setDrawText: vi.fn(),
      setTitleFontFamily: vi.fn(),
      setRegionFontFamily: vi.fn(),
      setMountainRangeFontFamily: vi.fn(),
      setOtherMountainsFontFamily: vi.fn(),
      setCitiesFontFamily: vi.fn(),
      setRiverFontFamily: vi.fn(),
      setTextColor: vi.fn(),
      setDrawBoldBackground: vi.fn(),
      setBoldBackgroundColor: vi.fn(),
      notifyManualChange: vi.fn(),
      handleGenerateFromSettings: vi.fn(),
      handleGenerateAndSaveNort: vi.fn(),
      openPreviewModal: vi.fn(),
      handleDownloadMap: vi.fn(),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders section title, tabs and preview empty when no preview', () => {
    const values = { preview: null, fileObj: null, currentSource: null }
    const options = {
      i18n: { labels: { 'ui.title.customize': 'Customize', 'ui.preview.empty': 'No preview', 'theme.tab.background': 'BG', 'theme.tab.border': 'BR', 'theme.tab.effects': 'EF', 'theme.tab.fonts': 'FN' }, options: { fonts: [], gridOverlayShapes: [], gridOverlayOffsets: [], gridOverlayLayers: [], backgroundTypes: [], strokeTypes: [], borderPositions: [], borderColorOptions: [], lineStyles: [], oceanWaveTypes: [] } },
      textures: [],
    }
    const ui = { loading: false, customizationDirty: false, hasGeneratedOnce: false }
    render(<CustomizeSettingsSection values={values} handlers={handlers} options={options} ui={ui} />)
    expect(screen.getByText('Customize')).toBeTruthy()
    // tabs should render labels from i18n
    expect(screen.getByText('BG')).toBeTruthy()
    expect(screen.getByText('BR')).toBeTruthy()
    expect(screen.getByText('EF')).toBeTruthy()
    expect(screen.getByText('FN')).toBeTruthy()
    // preview empty text
    expect(screen.getByText('No preview')).toBeTruthy()
  })

  it('shows preview image and opens modal on click, and enables download when generated', () => {
    const values = { preview: { url: 'blob://u3', filename: 'map.png' }, fileObj: null, currentSource: null }
    const options = {
      i18n: { labels: { 'ui.title.customize': 'Customize', 'ui.preview.empty': 'No preview', 'ui.preview.open': 'Open', 'ui.button.downloadMap': 'Download Map', 'ui.button.downloadSettings': 'Download Settings', 'ui.button.regenerate': 'Regenerate', 'ui.generating': 'Generating' }, options: { fonts: [], gridOverlayShapes: [], gridOverlayOffsets: [], gridOverlayLayers: [], backgroundTypes: [], strokeTypes: [], borderPositions: [], borderColorOptions: [], lineStyles: [], oceanWaveTypes: [] } },
      textures: [],
    }
    const ui = { loading: false, customizationDirty: false, hasGeneratedOnce: true }
    render(<CustomizeSettingsSection values={values} handlers={handlers} options={options} ui={ui} />)
    // preview image is present
    const img = screen.getByRole('img')
    expect(img).toBeTruthy()
    // clicking preview opens modal via handlers.openPreviewModal (wired to handlers.openPreviewModal prop)
    const btn = screen.getByRole('button', { name: /Open/i })
    fireEvent.click(btn)
    expect(handlers.openPreviewModal).toHaveBeenCalled()
    // download map button should be enabled when preview exists and hasGeneratedOnce true
    const downloadBtn = screen.getByText('Download Map').closest('button')
    expect(downloadBtn.disabled).toBe(false)
    fireEvent.click(downloadBtn)
    expect(handlers.handleDownloadMap).toHaveBeenCalled()
  })

  it('disables regenerate while loading and shows generating label', () => {
    const values = { preview: null, fileObj: null, currentSource: null }
    const options = { i18n: { labels: { 'ui.generating': 'Generating', 'ui.title.customize': 'Customize', 'ui.preview.empty': 'No preview', 'theme.tab.background': 'BG', 'theme.tab.border': 'BR', 'theme.tab.effects': 'EF', 'theme.tab.fonts': 'FN' }, options: { fonts: [], gridOverlayShapes: [], gridOverlayOffsets: [], gridOverlayLayers: [], backgroundTypes: [], strokeTypes: [], borderPositions: [], borderColorOptions: [], lineStyles: [], oceanWaveTypes: [] } }, textures: [] }
    const ui = { loading: true, customizationDirty: false, hasGeneratedOnce: false }
    render(<CustomizeSettingsSection values={values} handlers={handlers} options={options} ui={ui} />)
    const submitBtn = screen.getByRole('button', { name: /Generating/i })
    expect(submitBtn.disabled).toBe(true)
  })
})
