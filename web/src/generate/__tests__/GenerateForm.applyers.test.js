import { describe, it, expect } from 'vitest'
import {
  applyGridAndColoringHoisted,
  applyRoadsAndScalesHoisted,
  applyResourcesAndTopLevelHoisted,
} from '../GenerateForm.jsx'

describe('GenerateForm additional hoisted appliers', () => {
  // Note: `mergeColor` is internal to the module and exercised via the
  // applier functions by passing a `mergeColor` implementation on the ctx.

  it('applyGridAndColoringHoisted sets expected fields and calls mergeColor/getGridOverlayAlpha', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'dashed',
      regionBoundaryWidth: '2',
      regionBoundaryColorHex: '#112233',
      drawRegionBoundaries: true,
      colorizeLand: true,
      colorizeOcean: false,
      oceanColorHex: '#ffffff',
      landColorHex: '#000000',
      drawGridOverlay: true,
      gridOverlayShape: 'hex',
      gridOverlayRowOrColCount: '8',
      gridOverlayColorHex: '#123456',
      gridOverlayXOffset: '10',
      gridOverlayYOffset: '20',
      gridOverlayLineWidth: '1',
      gridOverlayLayer: 'above',
      drawVoronoiGridOverlayOnlyOnLand: true,
      resolveLandColoringMethod: () => 'ColorPoliticalRegions',
      finalLandColoringMethod: 'whatever',
      mergeColor: (ps, k, hex) => {
        ps[k] = 'M:' + hex
      },
      getGridOverlayAlpha: () => 128,
    }
    applyGridAndColoringHoisted(parsed, ctx)
    expect(parsed.regionBoundaryStyle).toBeDefined()
    expect(parsed.regionBoundaryStyle.type).toBe('dashed')
    expect(parsed.regionBoundaryStyle.width).toBe(2)
    expect(parsed.gridOverlayShape).toBe('hex')
    expect(parsed.gridOverlayRowOrColCount).toBe(8)
    expect(parsed.gridOverlayColor).toBeDefined()
    expect(parsed.drawRegionColors).toBe(true)
  })

  it('applyRoadsAndScalesHoisted maps numeric fields and uses provided scaleSliderValue', () => {
    const parsed = {}
    const ctx = {
      drawRoads: true,
      roadStyle: null,
      roadWidth: '3',
      mergeColor: (ps, k, hex) => {
        ps[k] = hex || 'no'
      },
      roadColorHex: '#fff',
      mountainSize: '2',
      hillSize: '3',
      duneSize: '4',
      treeHeight: '4',
      citySize: '5',
      scaleSliderValue: (v) => Number(v) * 0.5,
    }
    applyRoadsAndScalesHoisted(parsed, ctx)
    expect(parsed.drawRoads).toBe(true)
    expect(parsed.roadStyle.width).toBe(3)
    expect(parsed.mountainScale).toBeCloseTo(1)
    expect(parsed.hillScale).toBeCloseTo(1.5)
    expect(parsed.treeHeightScale).toBeCloseTo(0.1 + 4 * 0.05)
  })

  it('applyResourcesAndTopLevelHoisted parses resources and numeric fields and books set', () => {
    const parsed = {}
    const ctx = {
      setResourceFromRef: (ps, key, ref) => {
        if (ref) ps[key] = ref
      },
      borderRef: 'pack|border',
      textureRef: 'pack|tex',
      backgroundSeed: '42',
      artPack: 'ap',
      worldSize: '3',
      landShape: 'island',
      regionCount: '5',
      randomSeed: '100',
      selectedBooks: new Set(['z', 'a']),
    }
    applyResourcesAndTopLevelHoisted(parsed, ctx)
    expect(parsed.backgroundRandomSeed).toBe(42)
    expect(parsed.artPack).toBe('ap')
    expect(parsed.worldSize).toBe(3)
    expect(parsed.regionCount).toBe(5)
    expect(Array.isArray(parsed.books)).toBe(true)
    expect(parsed.books[0] < parsed.books[1]).toBe(true)
  })

  // Note: populateCityIconTypes/loadCityIconTypes are module-internal and not exported;
  // they are exercised indirectly via UI-loading code and not unit-tested here.
})
