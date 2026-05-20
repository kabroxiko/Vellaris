import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock tab components similar to other CustomizeSettingsSection tests
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

describe('CustomizeSettingsSection tabs', () => {
  let handlers
  beforeEach(() => {
    handlers = {
      handleGenerateFromSettings: vi.fn(),
      handleGenerateAndSaveNort: vi.fn(),
      openPreviewModal: vi.fn(),
      handleDownloadMap: vi.fn(),
      notifyManualChange: vi.fn(),
      setTitleFontFamily: vi.fn(),
      setRegionFontFamily: vi.fn(),
      setMountainRangeFontFamily: vi.fn(),
      setOtherMountainsFontFamily: vi.fn(),
      setCitiesFontFamily: vi.fn(),
      setRiverFontFamily: vi.fn(),
      setTextColorHex: vi.fn(),
      setDrawBoldBackground: vi.fn(),
      setBoldBackgroundColorHex: vi.fn(),
    }
  })

  afterEach(() => vi.restoreAllMocks())

  it('renders the correct tab panel when tab clicked', () => {
    const values = { preview: null, fileObj: null, currentSource: null }
    const options = {
      i18n: {
        labels: {
          'ui.title.customize': 'Customize',
          'theme.tab.background': 'BG',
          'theme.tab.border': 'BR',
          'theme.tab.effects': 'EF',
          'theme.tab.fonts': 'FN',
        },
        options: { fonts: [], gridOverlayShapes: [], gridOverlayOffsets: [], gridOverlayLayers: [], backgroundTypes: [], strokeTypes: [], borderPositions: [], borderColorOptions: [], lineStyles: [], oceanWaveTypes: [] },
      },
      textures: [],
    }
    const ui = { loading: false, customizationDirty: false, hasGeneratedOnce: false }

    render(<CustomizeSettingsSection values={values} handlers={handlers} options={options} ui={ui} />)

    // By default first tab (background) should be active and show BackgroundTab mock
    expect(screen.getByText(/^BackgroundTab/)).toBeTruthy()

    // Click Effects tab and expect EffectsTab panel
    const effectsBtn = screen.getByRole('tab', { name: 'EF' })
    fireEvent.click(effectsBtn)
    expect(screen.getByText('EffectsTab')).toBeTruthy()

    // Click Border tab
    const borderBtn = screen.getByRole('tab', { name: 'BR' })
    fireEvent.click(borderBtn)
    expect(screen.getByText('BorderTab')).toBeTruthy()

    // Click Fonts tab
    const fontsBtn = screen.getByRole('tab', { name: 'FN' })
    fireEvent.click(fontsBtn)
    expect(screen.getByText('FontsTab')).toBeTruthy()
  })
})
