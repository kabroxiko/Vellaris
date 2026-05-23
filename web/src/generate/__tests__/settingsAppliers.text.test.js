import { describe, it, expect, vi } from 'vitest'
import { createSettingsAppliers } from '../settingsAppliers'

describe('settingsAppliers text settings', () => {
  it('applyTextSettings maps font specs to family and color hex', () => {
    const setters = {
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
    }
    const appliers = createSettingsAppliers(setters)

    const settings = {
      drawRoads: false,
      drawText: true,
      titleFont: 'TitleFam\t1\t32',
      regionFont: 'RegionFam\t0\t20',
      mountainRangeFont: 'RangeFam\t2\t18',
      otherMountainsFont: 'OtherFam\t0\t16',
      citiesFont: 'CitiesFam\t0\t14',
      riverFont: 'RiverFam\t0\t12',
      textColor: '17,34,51,255',
      drawBoldBackground: true,
      boldBackgroundColor: '#ff00ff',
    }

    appliers.applyTextSettings(settings)

    expect(setters.setDrawText).toHaveBeenCalledWith(true)
    expect(setters.setTitleFontFamily).toHaveBeenCalledWith('TitleFam')
    expect(setters.setRegionFontFamily).toHaveBeenCalledWith('RegionFam')
    expect(setters.setMountainRangeFontFamily).toHaveBeenCalledWith('RangeFam')
    expect(setters.setOtherMountainsFontFamily).toHaveBeenCalledWith('OtherFam')
    expect(setters.setCitiesFontFamily).toHaveBeenCalledWith('CitiesFam')
    expect(setters.setRiverFontFamily).toHaveBeenCalledWith('RiverFam')
    expect(setters.setTextColor).toHaveBeenCalledWith('#112233ff')
    expect(setters.setDrawBoldBackground).toHaveBeenCalledWith(true)
    expect(setters.setBoldBackgroundColor).toHaveBeenCalledWith('#ff00ffff')
  })
})
