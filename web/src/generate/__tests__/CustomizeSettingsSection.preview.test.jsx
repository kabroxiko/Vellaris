// @vitest-environment jsdom
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock backgroundBaseCache before importing the component
vi.mock('../backgroundBaseCache', () => {
  const mget = vi.fn()
  const mpre = vi.fn()
  // expose to the test via globalThis for assertions
  globalThis.__backgroundBaseCache_get = mget
  globalThis.__backgroundBaseCache_preload = mpre
  return { __esModule: true, default: { preload: mpre, get: mget } }
})

// Mock BackgroundTab to expose recomposeUsingLastBase via a button
vi.mock('../tabs/BackgroundTab', () => ({
  default: (props) => React.createElement('div', { 'data-testid': 'bg-tab' }, React.createElement('button', { 'data-testid': 'recompose-btn', onClick: () => props.recomposeUsingLastBase && props.recomposeUsingLastBase() }, 'Recompose')),
}))
// Keep other tabs simple
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

describe('CustomizeSettingsSection preview lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches preview blob and creates object URL; recompose uses last base', async () => {
    // Arrange: mock backgroundBaseCache.get to return a raw blob object
    const RAW_BLOB = { size: 123 }
    globalThis.__backgroundBaseCache_get.mockResolvedValue(RAW_BLOB)
    globalThis.__backgroundBaseCache_preload.mockImplementation(() => {})

    // Mock URL.createObjectURL and revokeObjectURL
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('object://url1')
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    // Mock createImageBitmap to return simple bitmap
    vi.stubGlobal('createImageBitmap', async (b) => ({ width: 10, height: 6 }))

    // Provide a full fake canvas context for in-component compose
    const fakeImageData = { data: new Uint8ClampedArray(10 * 10 * 4) }
    const mockCtx = {
      save: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      drawImage: () => {},
      getImageData: () => fakeImageData,
      putImageData: () => {},
      restore: () => {},
      fillRect: () => {},
      globalCompositeOperation: 'source-over',
      createPattern: () => ({ __pattern: true }),
      fillStyle: null,
      fill: () => {},
      strokeStyle: null,
      lineWidth: 1,
      lineJoin: null,
      stroke: () => {},
    }
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return { width: 10, height: 6, getContext: () => mockCtx, toBlob: (cb) => cb('PBLOB') }
      return originalCreate(tag)
    })

    const props = makeProps()

    // Act: render the component; it should trigger the effect that fetches the preview
    render(<CustomizeSettingsSection {...props} />)

    // Wait for backgroundBaseCache.get to have been called
    await waitFor(() => expect(globalThis.__backgroundBaseCache_get).toHaveBeenCalled())
    // createObjectURL should have been called at least once
    await waitFor(() => expect(createSpy).toHaveBeenCalled())

    // Now find the recompose button inside our mocked BackgroundTab and click it
    const btn = await screen.findByTestId('recompose-btn')
    // Update createObjectURL to return a different URL on recompose
    createSpy.mockReturnValueOnce('object://url2')
    fireEvent.click(btn)

    // Expect createObjectURL called again for the recomposed blob
    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(2))
    // revokeObjectURL should be called at least once to revoke previous url
    expect(revokeSpy).toHaveBeenCalled()
  })
})
