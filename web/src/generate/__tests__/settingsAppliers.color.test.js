import { describe, it, expect } from 'vitest'
import { createSettingsAppliers } from '../settingsAppliers.js'

describe('settingsAppliers - color applier helpers', () => {
  it('applies color hex and booleans via setters', () => {
    const captured = {}
    const setters = {
      setOceanColorHex: (v) => (captured.oceanColorHex = v),
      setLandColorHex: (v) => (captured.landColorHex = v),
      setRegionBoundaryColorHex: (v) => (captured.regionBoundaryColorHex = v),
      setDrawBorder: (v) => (captured.drawBorder = v),
      setDrawGridOverlay: (v) => (captured.drawGridOverlay = v),
      setLandColoringMethod: (v) => (captured.landColoringMethod = v),
      setFinalLandColoringMethod: (v) => (captured.finalLandColoringMethod = v),
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
    expect(captured.oceanColorHex).toBe('#112233')
    expect(captured.landColorHex).toBe('#112233')
    expect(captured.regionBoundaryColorHex).toBe('#000000')
    expect(captured.drawBorder).toBe(true)
    expect(captured.drawGridOverlay).toBe(false)
    expect(captured.landColoringMethod).toBe('ColorPoliticalRegions')
    expect(captured.finalLandColoringMethod).toBe('ColorPoliticalRegions')
  })
})
