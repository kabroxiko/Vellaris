import { describe, it, expect } from 'vitest'
import {
  applyGridAndColoringHoisted,
  applyBordersFrayedAndGrungeHoisted,
  applyRoadsAndScalesHoisted,
} from '../GenerateForm.appliers'

describe('GenerateForm additional hoisted applier tests', () => {
  it('applyGridAndColoringHoisted sets gridOverlayColor with alpha from getGridOverlayAlpha', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'thin',
      regionBoundaryWidth: '2',
      regionBoundaryColor: '#010203',
      drawRegionBoundaries: true,
      colorizeLand: true,
      colorizeOcean: false,
      oceanColor: '#112233',
      landColor: '#445566',
      drawGridOverlay: true,
      gridOverlayShape: 'hex',
      gridOverlayRowOrColCount: '8',
      gridOverlayColor: '#abcdef',
      gridOverlayXOffset: '1',
      gridOverlayYOffset: '2',
      gridOverlayLineWidth: '3',
      gridOverlayLayer: 'top',
      drawVoronoiGridOverlayOnlyOnLand: true,
      resolveLandColoringMethod: () => null,
      finalLandColoringMethod: null,
      mergeColor: (out, k, hex) => {
        if (hex) out[k] = hex
      },
      getGridOverlayAlpha: () => 128,
    }

    applyGridAndColoringHoisted(parsed, ctx)
    expect(parsed.drawGridOverlay).toBe(true)
    // '#abcdef' with alpha 128 -> '#abcdef80'
    expect(parsed.gridOverlayColor).toBe('#abcdef80')
    expect(parsed.gridOverlayRowOrColCount).toBe(8)
  })

  it('applyBordersFrayedAndGrungeHoisted handles frayed numeric parsing', () => {
    const parsed = {}
    const ctx = {
      borderWidth: '5',
      borderPosition: 'inside',
      borderColorOption: 'solid',
      borderColor: '#010203',
      frayedBorder: true,
      frayedBorderBlurLevel: '2',
      frayedBorderSize: '6',
      frayedBorderSeed: '11',
      drawGrunge: true,
      grungeWidth: '4',
      frayedBorderColor: '#112233',
      mergeColor: (out, k, hex) => {
        if (hex) out[k] = hex
      },
    }

    applyBordersFrayedAndGrungeHoisted(parsed, ctx)
    expect(parsed.borderWidth).toBe(5)
    expect(parsed.frayedBorder).toBe(true)
    expect(parsed.frayedBorderBlurLevel).toBe(2)
    expect(parsed.frayedBorderSize).toBe(6)
    expect(parsed.frayedBorderSeed).toBe(11)
    expect(parsed.drawGrunge).toBe(true)
    expect(parsed.grungeWidth).toBe(4)
    expect(parsed.frayedBorderColor).toBe('#112233')
  })

  it('applyRoadsAndScalesHoisted converts treeHeight and citySize to scales', () => {
    const parsed = {}
    const ctx = {
      drawRoads: true,
      roadStyle: null,
      roadWidth: null,
      mergeColor: (out, k, hex) => {
        if (hex) out[k] = hex
      },
      roadColor: '#010101',
      mountainSize: '3',
      hillSize: '4',
      duneSize: '5',
      treeHeight: '2',
      citySize: '6',
      scaleSliderValue: (v) => Number(v) * 0.1,
    }

    applyRoadsAndScalesHoisted(parsed, ctx)
    expect(parsed.drawRoads).toBe(true)
    expect(parsed.roadColor).toBe('#010101')
    expect(parsed.treeHeightScale).toBeCloseTo(0.1 + 2 * 0.05)
    expect(parsed.cityScale).toBeCloseTo(6 * 0.1)
  })
})
