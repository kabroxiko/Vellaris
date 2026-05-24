import { describe, it, expect } from 'vitest'
import {
  applyGridAndColoringHoisted,
  applyBordersFrayedAndGrungeHoisted,
  applyRoadsAndScalesHoisted,
} from '../GenerateForm.appliers'

describe('GenerateForm hoisted appliers', () => {
  it('applyGridAndColoringHoisted sets grid and color fields', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'solid',
      regionBoundaryWidth: '3',
      regionBoundaryColor: '#112233',
      drawRegionBoundaries: true,
      colorizeLand: true,
      colorizeOcean: false,
      oceanColor: '#000000',
      landColor: '#ffffff',
      drawGridOverlay: true,
      gridOverlayShape: 'hex',
      gridOverlayRowOrColCount: '7',
      gridOverlayColor: '#123456',
      gridOverlayXOffset: '10',
      gridOverlayYOffset: '20',
      gridOverlayLineWidth: '2',
      gridOverlayLayer: 'top',
      drawVoronoiGridOverlayOnlyOnLand: true,
      landColoringMethod: 'ColorPoliticalRegions',
      landColoringMethod: 'ColorPoliticalRegions',
      mergeColor: (out, key, hex) => {
        if (hex) out[key] = hex
      },
      getGridOverlayAlpha: () => 128,
    }

    applyGridAndColoringHoisted(parsed, ctx)
    expect(parsed.regionBoundaryStyle).toBeDefined()
    expect(parsed.regionBoundaryStyle.width).toBe(3)
    // gridOverlayColor is produced as canonical '#RRGGBBAA'
    expect(typeof parsed.gridOverlayColor).toBe('string')
    expect(parsed.gridOverlayColor).toBe('#12345680')
    expect(parsed.drawRegionColors).toBe(true)
  })

  it('applyBordersFrayedAndGrungeHoisted converts numeric fields and merges colors', () => {
    const parsed = {}
    const ctx = {
      borderWidth: '12',
      borderPosition: 'inside',
      borderColorOption: 'Choose_color',
      borderColor: '#010203',
      frayedBorder: true,
      frayedBorderBlurLevel: '5',
      frayedBorderSize: '4',
      frayedBorderSeed: '42',
      drawGrunge: true,
      grungeWidth: '33',
      frayedBorderColor: '#abcdef',
      mergeColor: (out, key, hex) => {
        if (hex) out[key] = hex
      },
    }
    applyBordersFrayedAndGrungeHoisted(parsed, ctx)
    expect(parsed.borderWidth).toBe(12)
    expect(parsed.frayedBorder).toBe(true)
    expect(parsed.frayedBorderBlurLevel).toBe(5)
    expect(parsed.grungeWidth).toBe(33)
    expect(parsed.frayedBorderColor).toBe('#abcdef')
  })

  it('applyRoadsAndScalesHoisted sets road style and scales', () => {
    const parsed = {}
    const ctx = {
      drawRoads: true,
      roadStyle: 'dashed',
      roadWidth: '2',
      roadColor: '#123123',
      mountainSize: '5',
      hillSize: '6',
      duneSize: '7',
      treeHeight: '4',
      citySize: '3',
      mergeColor: (out, key, hex) => {
        if (hex) out[key] = hex
      },
      scaleSliderValue: (v) => Number(v) * 0.1,
    }
    applyRoadsAndScalesHoisted(parsed, ctx)
    expect(parsed.drawRoads).toBe(true)
    expect(parsed.roadStyle.type).toBe('dashed')
    expect(parsed.roadStyle.width).toBe(2)
    expect(parsed.mountainScale).toBeCloseTo(0.5)
    expect(parsed.treeHeightScale).toBeCloseTo(0.1 + 4 * 0.05)
  })
})
