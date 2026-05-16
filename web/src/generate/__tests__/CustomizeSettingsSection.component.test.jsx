import React from 'react'
import { vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'

import CustomizeSettingsSection from '../CustomizeSettingsSection.jsx'
import backgroundBaseCache from '../backgroundBaseCache'

describe('CustomizeSettingsSection component interactions', () => {
  beforeEach(() => {
    // Stub network/cache interactions to keep tests deterministic
    vi.spyOn(backgroundBaseCache, 'preload').mockImplementation(() => {})
    vi.spyOn(backgroundBaseCache, 'get').mockResolvedValue(new Blob(['ok']))
    // stub createImageBitmap used by preview composition
    globalThis.createImageBitmap = async (b) => ({ width: 20, height: 20 })
    // provide a prefetched blob so the component doesn't attempt composition
    globalThis.__prefetchedBackgroundPreviewBlob = new Blob(['prefetched'])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    try { delete globalThis.createImageBitmap } catch (e) {}
    try { delete globalThis.__prefetchedBackgroundPreviewBlob } catch (e) {}
  })

  it('clicking a font option calls the corresponding handler', async () => {
    const handlers = {
      setTitleFontFamily: vi.fn(),
      setRegionFontFamily: vi.fn(),
      setMountainRangeFontFamily: vi.fn(),
      setOtherMountainsFontFamily: vi.fn(),
      setCitiesFontFamily: vi.fn(),
      setRiverFontFamily: vi.fn(),
      handleGenerateFromSettings: vi.fn(),
      handleGenerateAndSaveNort: vi.fn(),
      handleDownloadMap: vi.fn(),
      openPreviewModal: vi.fn(),
      setTextureRef: vi.fn(),
      setBackgroundType: vi.fn(),
    }

    const values = { drawText: true }
    const options = {
      textures: [],
      i18n: { labels: { 'ui.title.customize': 'Customize', 'ui.subtitle.customize': 'desc', 'ui.preview.empty': 'Empty', 'ui.preview.open': 'Open preview', 'theme.titleFont.label': 'Title Font' }, options: { tabs: [{ id: 'background', label: 'Background' }, { id: 'fonts', label: 'Fonts' }], fonts: ['Arial', 'Times'] } },
      cityIconTypesByPack: {},
    }
    const ui = { loading: false, customizationDirty: false, hasGeneratedOnce: false }

    const { container } = render(
      <CustomizeSettingsSection values={values} handlers={handlers} options={options} ui={ui} />
    )

    // Activate the Fonts tab
    const tabs = container.querySelectorAll('[role="tab"]')
    const fontsTab = Array.from(tabs).find((b) => /Fonts/i.test(b.textContent))
    fireEvent.click(fontsTab)

    // Open the font combo for the first field
    const trigger = container.querySelector('.font-combo-trigger')
    expect(trigger).toBeTruthy()
    fireEvent.click(trigger)

    // Click the first font option
    await waitFor(() => {
      const opt = container.querySelector('.font-combo-option')
      expect(opt).toBeTruthy()
      fireEvent.click(opt)
    })

    expect(handlers.setTitleFontFamily).toHaveBeenCalled()
    // Ensure the selected family was passed
    expect(handlers.setTitleFontFamily.mock.calls[0][0]).toBe('Arial')
  })

  it('opens and closes the color picker modal from a color control', async () => {
    const handlers = {
      handleGenerateFromSettings: vi.fn(),
      handleGenerateAndSaveNort: vi.fn(),
      handleDownloadMap: vi.fn(),
      openPreviewModal: vi.fn(),
      setLandColorHex: vi.fn(),
      setOceanColorHex: vi.fn(),
    }
    const values = { colorizeLand: true, landColorHex: '#010203', colorizeOcean: true, oceanColorHex: '#040506' }
    const options = {
      textures: [],
      i18n: { labels: { 'ui.title.customize': 'Customize', 'ui.subtitle.customize': 'desc', 'ui.preview.empty': 'Empty', 'ui.preview.open': 'Open preview', 'theme.landColor.label': 'Land Color' }, options: { tabs: [{ id: 'background', label: 'Background' }], fonts: [] } },
      cityIconTypesByPack: {},
    }
    const ui = { loading: false, customizationDirty: false, hasGeneratedOnce: false }

    const { container } = render(
      <CustomizeSettingsSection values={values} handlers={handlers} options={options} ui={ui} />
    )

    // Find the land color picker opener by aria-label
    const opener = container.querySelector('button[aria-label^="Open Land Color"]')
    expect(opener).toBeTruthy()
    fireEvent.click(opener)

    // Dialog should open
    await waitFor(() => {
      const dlg = document.querySelector('dialog')
      expect(dlg).toBeTruthy()
    })

    // Click the Close button inside the modal
    const closeBtn = screen.getByText('Close')
    fireEvent.click(closeBtn)

    // Dialog should be removed
    await waitFor(() => {
      const dlg = document.querySelector('dialog')
      expect(dlg).toBeNull()
    })
  })
})
