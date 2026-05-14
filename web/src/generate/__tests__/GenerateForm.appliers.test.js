import { describe, it, expect } from 'vitest'
import {
  applyResourcesAndTopLevelHoisted,
  applyGridAndColoringHoisted,
  applyRoadsAndScalesHoisted,
  scaleSliderValue,
} from '../GenerateForm'

describe('GenerateForm appliers', () => {
  it('applyResourcesAndTopLevelHoisted sets parsedSettings fields from ctx', () => {
    const parsed = {}
    const ctx = {
      setResourceFromRef: (ps, key, ref) => { if (ref) ps[key] = { artPack: ref.split('|')[0], name: ref.split('|')[1] } },
      borderRef: 'packA|border1',
      textureRef: 'packB|tex1',
      backgroundSeed: '42',
      artPack: 'apack',
      worldSize: '2',
      landShape: 'island',
      regionCount: '5',
      randomSeed: '7',
      selectedBooks: new Set(['alpha','beta']),
    }

    applyResourcesAndTopLevelHoisted(parsed, ctx)
    expect(parsed.borderResource).toEqual({ artPack: 'packA', name: 'border1' })
    expect(parsed.backgroundTextureResource).toEqual({ artPack: 'packB', name: 'tex1' })
    expect(parsed.backgroundRandomSeed).toBe(42)
    expect(parsed.artPack).toBe('apack')
    expect(parsed.worldSize).toBe(2)
    expect(parsed.landShape).toBe('island')
    expect(parsed.regionCount).toBe(5)
    expect(parsed.randomSeed).toBe(7)
    expect(parsed.books).toEqual(['alpha','beta'])
  })

  it('applyGridAndColoringHoisted sets gridOverlayColor using getGridOverlayAlpha', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'Dashed',
      regionBoundaryWidth: '3',
      regionBoundaryColorHex: '#112233',
      drawRegionBoundaries: true,
      colorizeLand: true,
      colorizeOcean: false,
      oceanColorHex: '#aabbcc',
      landColorHex: '#ddeeff',
      drawGridOverlay: true,
      gridOverlayShape: 'hex',
      gridOverlayRowOrColCount: '8',
      gridOverlayColorHex: '#010203',
      gridOverlayXOffset: '10',
      gridOverlayYOffset: '20',
      gridOverlayLineWidth: '2',
      gridOverlayLayer: 'top',
      drawVoronoiGridOverlayOnlyOnLand: true,
      resolveLandColoringMethod: () => (v) => (v || 'SingleColor'),
      finalLandColoringMethod: 'ColorPoliticalRegions',
      mergeColor: (ps, k, v) => { if (v) ps[k] = v },
      getGridOverlayAlpha: () => 128,
    }

    applyGridAndColoringHoisted(parsed, ctx)
    // hexToRgbaString returns 'r,g,b,alpha' for '#010203' -> 1,2,3,128
    expect(parsed.gridOverlayColor).toBe('1,2,3,128')
    expect(parsed.drawRegionBoundaries).toBe(true)
    expect(parsed.drawVoronoiGridOverlayOnlyOnLand).toBe(true)
  })

  it('applyRoadsAndScalesHoisted sets scales and color/road style', () => {
    const parsed = {}
    const ctx = {
      drawRoads: true,
      roadStyle: 'highway',
      roadWidth: '4',
      mergeColor: (ps, k, v) => { if (v) ps[k] = v },
      roadColorHex: '#0a0b0c',
      mountainSize: '5',
      hillSize: '3',
      duneSize: '2',
      treeHeight: '6',
      citySize: '9',
      scaleSliderValue,
    }

    applyRoadsAndScalesHoisted(parsed, ctx)
    expect(parsed.drawRoads).toBe(true)
    expect(parsed.roadStyle).toBeDefined()
    expect(parsed.roadStyle.width || parsed.roadStyle.type).toBeTruthy()
    // treeHeightScale = 0.1 + Number(treeHeight) * 0.05 -> 0.1 + 6*0.05 = 0.4
    expect(parsed.treeHeightScale).toBeCloseTo(0.4, 6)
    expect(parsed.cityScale).toBeCloseTo(scaleSliderValue(9), 6)
  })
})
