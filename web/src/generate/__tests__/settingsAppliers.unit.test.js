import { describe, it, expect, vi } from 'vitest'
import { createSettingsAppliers } from '../settingsAppliers'

describe('settingsAppliers helpers', () => {
  it('applyRoadAndScaleSettings maps scales to slider values and calls setters with expected values', () => {
    const setters = {
      setDrawRoads: vi.fn(),
      setRoadStyle: vi.fn(),
      setRoadWidth: vi.fn(),
      setRoadColorHex: vi.fn(),
      setMountainSize: vi.fn(),
      setHillSize: vi.fn(),
      setDuneSize: vi.fn(),
      setTreeHeight: vi.fn(),
      setCitySize: vi.fn(),
    }
    const appliers = createSettingsAppliers(setters)

    const settings = {
      drawRoads: true,
      roadStyle: { type: 'dashed', width: 2 },
      roadWidth: 3,
      roadColor: '#112233',
      mountainScale: 1, // should map to slider 5
      hillScale: 3, // should map to slider 15
      duneScale: 0.5, // maps to >=1
      treeHeightScale: 0.35, // maps to 5
      cityScale: 3, // maps to 15
    }

    appliers.applyRoadAndScaleSettings(settings)

    expect(setters.setDrawRoads).toHaveBeenCalledWith(true)
    expect(setters.setRoadStyle).toHaveBeenCalled()
    expect(setters.setRoadWidth).toHaveBeenCalled()
    expect(setters.setRoadColorHex).toHaveBeenCalled()
    // mountainScale 1 -> slider 5
    expect(setters.setMountainSize.mock.calls[0][0]).toBe(5)
    // hillScale 3 -> slider 15
    expect(setters.setHillSize.mock.calls[0][0]).toBe(15)
    // duneScale 0.5 -> slider at least 1
    expect(typeof setters.setDuneSize.mock.calls[0][0]).toBe('number')
    // treeHeightScale 0.35 -> slider 5
    expect(setters.setTreeHeight.mock.calls[0][0]).toBe(5)
    // cityScale 3 -> slider 15
    expect(setters.setCitySize.mock.calls[0][0]).toBe(15)
  })

  it('applyGridOverlaySettings sets grid overlay fields and color hex', () => {
    const setters = {
      setDrawGridOverlay: vi.fn(),
      setGridOverlayShape: vi.fn(),
      setGridOverlayRowOrColCount: vi.fn(),
      setGridOverlayColorHex: vi.fn(),
      setGridOverlayXOffset: vi.fn(),
      setGridOverlayYOffset: vi.fn(),
      setGridOverlayLineWidth: vi.fn(),
      setGridOverlayLayer: vi.fn(),
      setDrawVoronoiGridOverlayOnlyOnLand: vi.fn(),
    }
    const appliers = createSettingsAppliers(setters)
    const settings = {
      drawGridOverlay: true,
      gridOverlayShape: 'hex',
      gridOverlayRowOrColCount: 8,
      gridOverlayColor: '#abcdef',
      gridOverlayXOffset: '2',
      gridOverlayYOffset: '3',
      gridOverlayLineWidth: 1,
      gridOverlayLayer: 'above',
      drawVoronoiGridOverlayOnlyOnLand: false,
    }

    appliers.applyGridOverlaySettings(settings)
    expect(setters.setDrawGridOverlay).toHaveBeenCalledWith(true)
    expect(setters.setGridOverlayShape).toHaveBeenCalledWith('hex')
    expect(setters.setGridOverlayRowOrColCount).toHaveBeenCalledWith(8)
    expect(setters.setGridOverlayColorHex).toHaveBeenCalled()
    expect(setters.setGridOverlayXOffset).toHaveBeenCalled()
    expect(setters.setGridOverlayYOffset).toHaveBeenCalled()
    expect(setters.setGridOverlayLineWidth).toHaveBeenCalled()
    expect(setters.setGridOverlayLayer).toHaveBeenCalledWith('above')
    expect(setters.setDrawVoronoiGridOverlayOnlyOnLand).toHaveBeenCalledWith(false)
  })
})
