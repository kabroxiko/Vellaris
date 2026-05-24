import { describe, it, expect } from 'vitest'
import { createSettingsAppliers } from '../settingsAppliers.js'

describe('settingsAppliers - color applier helpers', () => {
  it('applies color hex and booleans via setters', () => {
    const captured = {}
    const setters = {
      setOceanColor: (v) => (captured.oceanColor = v),
      setLandColor: (v) => (captured.landColor = v),
      setRegionBoundaryColor: (v) => (captured.regionBoundaryColor = v),
      setDrawBorder: (v) => (captured.drawBorder = v),
      setDrawGridOverlay: (v) => (captured.drawGridOverlay = v),
      setLandColoringMethod: (v) => (captured.landColoringMethod = v),
    }
    const appliers = createSettingsAppliers(setters, {})
    appliers.applyColorAndBoundarySettings({
      oceanColor: '#112233',
      landColor: '17,34,51',
      regionBoundaryColor: '#000000',
      drawBorder: true,
      drawGridOverlay: false,
      drawRegionColors: true,
    })
    expect(captured.oceanColor).toBe('#112233ff')
    expect(captured.landColor).toBe('#112233ff')
    expect(captured.regionBoundaryColor).toBe('#000000ff')
    expect(captured.drawBorder).toBe(true)
    expect(captured.drawGridOverlay).toBe(false)
    expect(captured.landColoringMethod).toBe('ColorPoliticalRegions')
  })
})
