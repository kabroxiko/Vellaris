// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock child tabs to keep tests focused and fast
vi.mock('../tabs/BackgroundTab', () => ({ default: (props) => React.createElement('div', { 'data-testid': 'bg-tab' }, 'BG') }))
vi.mock('../tabs/BorderTab', () => ({ default: (props) => React.createElement('div', { 'data-testid': 'border-tab' }, 'BORDER') }))
vi.mock('../tabs/EffectsTab', () => ({ default: (props) => React.createElement('div', { 'data-testid': 'effects-tab' }, 'EFFECTS') }))
vi.mock('../tabs/FontsTab', () => ({ default: (props) => React.createElement('div', { 'data-testid': 'fonts-tab' }, 'FONTS') }))

import CustomizeSettingsSection from '../CustomizeSettingsSection'

function makeProps(overrides = {}) {
  const baseValues = {
    preview: null,
    backgroundType: 'SolidColor',
    textureRef: '',
    colorizeLand: false,
    colorizeOcean: false,
    landColorHex: '#000000',
    oceanColorHex: '#ffffff',
    backgroundSeed: '',
    finalSeed: '',
    finalWidth: 520,
    finalHeight: 170,
    fileObj: null,
    currentSource: null,
  }
  const handlers = {
    handleGenerateFromSettings: vi.fn(),
    handleGenerateAndSaveNort: vi.fn(),
    handleDownloadMap: vi.fn(),
    openPreviewModal: vi.fn(),
    notifyManualChange: vi.fn(),
  }
  const options = {
    textures: [],
    i18n: { labels: undefined, options: { tabs: [ { id: 'background', label: 'Background' }, { id: 'border', label: 'Border' }, { id: 'effects', label: 'Effects' }, { id: 'fonts', label: 'Fonts' } ], fonts: [] } },
    borderTypes: [],
  }
  const ui = { loading: false, customizationDirty: false, hasGeneratedOnce: false }
  return { values: { ...baseValues, ...overrides.values }, handlers: { ...handlers, ...(overrides.handlers || {}) }, options: { ...options, ...(overrides.options || {}) }, ui: { ...ui, ...(overrides.ui || {}) } }
}

describe('CustomizeSettingsSection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders tab buttons and shows BackgroundTab by default', () => {
    const props = makeProps()
    render(<CustomizeSettingsSection {...props} />)
    expect(screen.getAllByRole('tab', { name: 'Background' })[0]).toBeTruthy()
    expect(screen.getAllByTestId('bg-tab')[0]).toBeTruthy()
  })

  it('switches to Border tab when clicked', () => {
    const props = makeProps()
    render(<CustomizeSettingsSection {...props} />)
    const borderBtn = screen.getAllByRole('tab', { name: 'Border' })[0]
    fireEvent.click(borderBtn)
    expect(screen.getAllByTestId('border-tab')[0]).toBeTruthy()
  })

  it('submit button calls handleGenerateFromSettings', async () => {
    const props = makeProps()
    render(<CustomizeSettingsSection {...props} />)
    const { container } = render(<CustomizeSettingsSection {...props} />)
    const form = container.querySelector('form')
    fireEvent.submit(form)
    expect(props.handlers.handleGenerateFromSettings).toHaveBeenCalled()
  })

  it('form change triggers notifyManualChange', () => {
    const props = makeProps()
    const { container } = render(<CustomizeSettingsSection {...props} />)
    const form = container.querySelector('form')
    expect(form).toBeTruthy()
    fireEvent.input(form)
    expect(props.handlers.notifyManualChange).toHaveBeenCalled()
  })
})
