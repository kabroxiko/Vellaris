import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyResourcesAndTopLevelHoisted,
  applyGridAndColoringHoisted,
  applyBordersFrayedAndGrungeHoisted,
  applyCoastOceanAndWavesHoisted,
  applyRoadsAndScalesHoisted,
  applyTextAndBackgroundHoisted,
} from '../GenerateForm.appliers'
import { scaleSliderValue } from '../GenerateForm.helpers'

describe('GenerateForm applier helpers', () => {
  beforeEach(() => {
    // ensure clean environment
    globalThis.localStorage?.clear?.()
  })

  it('applyResourcesAndTopLevelHoisted sets top-level fields and books', () => {
    const parsed = {}
    const ctx = {
      setResourceFromRef: (ps, key, ref) => {
        if (ref) ps[key] = { parsedRef: ref }
      },
      borderRef: 'pack|border',
      textureRef: null,
      backgroundSeed: '42',
      artPack: 'apack',
      worldSize: '2',
      landShape: 'island',
      regionCount: '7',
      randomSeed: '99',
      selectedBooks: new Set(['b', 'a']),
    }
    applyResourcesAndTopLevelHoisted(parsed, ctx)
    expect(parsed.backgroundRandomSeed).toBe(42)
    expect(parsed.artPack).toBe('apack')
    expect(parsed.worldSize).toBe(2)
    expect(parsed.regionCount).toBe(7)
    expect(parsed.randomSeed).toBe(99)
    expect(parsed.borderResource).toEqual({ parsedRef: 'pack|border' })
    expect(Array.isArray(parsed.books)).toBe(true)
    expect(parsed.books).toEqual(['a', 'b'])
  })

  it('applyGridAndColoringHoisted sets region boundary and grid overlay values', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'dashed',
      regionBoundaryWidth: '2',
      regionBoundaryColor: '#010101',
      drawRegionBoundaries: true,
      colorizeLand: true,
      colorizeOcean: false,
      oceanColor: '#020202',
      landColor: '#030303',
      drawGridOverlay: true,
      gridOverlayShape: 'hex',
      gridOverlayRowOrColCount: '4',
      gridOverlayColor: null,
      gridOverlayXOffset: '1',
      gridOverlayYOffset: '2',
      gridOverlayLineWidth: '3',
      gridOverlayLayer: 'top',
      drawVoronoiGridOverlayOnlyOnLand: true,
      landColoringMethod: 'ColorPoliticalRegions',
      mergeColor: (ps, key, hex) => {
        if (hex) ps[key] = `MERGED:${hex}`
      },
      getGridOverlayAlpha: () => 128,
    }
    applyGridAndColoringHoisted(parsed, ctx)
    expect(parsed.regionBoundaryStyle).toBeDefined()
    expect(parsed.regionBoundaryStyle.type).toBe('dashed')
    expect(parsed.regionBoundaryStyle.width).toBe(2)
    expect(parsed.regionBoundaryColor).toBe('MERGED:#010101')
    expect(parsed.drawRegionBoundaries).toBe(true)
    expect(parsed.drawGridOverlay).toBe(true)
    expect(parsed.gridOverlayShape).toBe('hex')
    expect(parsed.gridOverlayRowOrColCount).toBe(4)
    expect(parsed.gridOverlayXOffset).toBe('1')
    expect(parsed.gridOverlayYOffset).toBe('2')
    expect(parsed.gridOverlayLineWidth).toBe(3)
    expect(parsed.gridOverlayLayer).toBe('top')
    expect(parsed.drawVoronoiGridOverlayOnlyOnLand).toBe(true)
    expect(parsed.drawRegionColors).toBe(true)
  })

  it('applyBordersFrayedAndGrungeHoisted sets border and frayed options', () => {
    const parsed = {}
    const ctx = {
      borderWidth: '5',
      borderPosition: 'inside',
      borderColorOption: 'auto',
      borderColor: '#111111',
      frayedBorder: true,
      frayedBorderBlurLevel: '2',
      frayedBorderSize: '3',
      frayedBorderSeed: '7',
      drawGrunge: true,
      grungeWidth: '4',
      frayedBorderColor: '#222222',
      mergeColor: (ps, key, hex) => {
        if (hex) ps[key] = `MERGED:${hex}`
      },
    }
    applyBordersFrayedAndGrungeHoisted(parsed, ctx)
    expect(parsed.borderWidth).toBe(5)
    expect(parsed.borderPosition).toBe('inside')
    expect(parsed.borderColorOption).toBe('auto')
    expect(parsed.borderColor).toBe('MERGED:#111111')
    expect(parsed.frayedBorder).toBe(true)
    expect(parsed.frayedBorderBlurLevel).toBe(2)
    expect(parsed.frayedBorderSize).toBe(3)
    expect(parsed.frayedBorderSeed).toBe(7)
    expect(parsed.drawGrunge).toBe(true)
    expect(parsed.grungeWidth).toBe(4)
    expect(parsed.frayedBorderColor).toBe('MERGED:#222222')
  })

  it('applyCoastOceanAndWavesHoisted sets coastal and ocean properties', () => {
    const parsed = {}
    const ctx = {
      lineStyle: 'solid',
      coastlineWidth: '1',
      coastlineColor: '#010101',
      coastShadingLevel: '2',
      coastShadingColor: '#020202',
      oceanShadingLevel: '3',
      oceanShadingColor: '#030303',
      oceanWavesType: 'ripple',
      oceanWavesLevel: '2',
      getConcentricWaveCount: () => 7,
      fadeConcentricWaves: true,
      jitterToConcentricWaves: false,
      brokenLinesForConcentricWaves: true,
      mergeColor: (ps, key, hex, percent, useFormatter) => {
        if (hex) ps[key] = `MERGED:${hex}:${percent}:${useFormatter}`
      },
      oceanWavesColor: null,
      drawOceanEffectsInLakes: true,
      riverColor: '#050505',
      parseBooleanWithDefault: Boolean,
      mergedSettingsRef: { current: {} },
    }
    applyCoastOceanAndWavesHoisted(parsed, ctx)
    expect(parsed.lineStyle).toBe('solid')
    expect(parsed.coastlineWidth).toBe(1)
    expect(parsed.coastlineColor).toBe('MERGED:#010101:undefined:undefined')
    expect(parsed.coastShadingLevel).toBe(2)
    expect(parsed.oceanShadingLevel).toBe(3)
    expect(parsed.oceanEffect).toBe('ripple')
    expect(parsed.oceanWavesLevel).toBe(2)
    expect(parsed.concentricWaveCount).toBe(7)
    expect(parsed.fadeConcentricWaves).toBe(true)
    expect(parsed.brokenLinesForConcentricWaves).toBe(true)
    expect(parsed.drawOceanEffectsInLakes).toBe(true)
    expect(parsed.riverColor).toBe('MERGED:#050505:undefined:undefined')
  })

  it('applyRoadsAndScalesHoisted and applyTextAndBackgroundHoisted set road and text values', () => {
    const parsed = {}
    const ctxRoads = {
      drawRoads: true,
      roadStyle: 'dotted',
      roadWidth: '2',
      mergeColor: (ps, key, hex) => {
        if (hex) ps[key] = `MERGED:${hex}`
      },
      roadColor: '#060606',
      mountainSize: '5',
      hillSize: '6',
      duneSize: '7',
      treeHeight: '8',
      citySize: '9',
      scaleSliderValue: (v) => `SCALED:${v}`,
    }
    applyRoadsAndScalesHoisted(parsed, ctxRoads)
    expect(parsed.drawRoads).toBe(true)
    expect(parsed.roadStyle).toBeDefined()
    expect(parsed.roadStyle.type).toBe('dotted')
    expect(parsed.roadStyle.width).toBe(2)
    expect(parsed.roadColor).toBe('MERGED:#060606')
    expect(parsed.mountainScale).toBe('SCALED:5')
    expect(parsed.hillScale).toBe('SCALED:6')
    expect(parsed.duneScale).toBe('SCALED:7')
    expect(parsed.treeHeightScale).toBeCloseTo(0.1 + Number(8) * 0.05)
    expect(parsed.cityScale).toBe('SCALED:9')

    const ctxText = {
      drawText: true,
      textColor: '#070707',
      drawBoldBackground: true,
      boldBackgroundColor: '#080808',
      mergeColor: (ps, key, hex) => {
        if (hex) ps[key] = `MERGED:${hex}`
      },
    }
    applyTextAndBackgroundHoisted(parsed, ctxText)
    expect(parsed.drawText).toBe(true)
    expect(parsed.textColor).toBe('MERGED:#070707')
    expect(parsed.drawBoldBackground).toBe(true)
    expect(parsed.boldBackgroundColor).toBe('MERGED:#080808')
  })
})

describe('GenerateForm appliers', () => {
  it('applyResourcesAndTopLevelHoisted sets parsedSettings fields from ctx', () => {
    const parsed = {}
    const ctx = {
      setResourceFromRef: (ps, key, ref) => {
        if (ref) ps[key] = { artPack: ref.split('|')[0], name: ref.split('|')[1] }
      },
      borderRef: 'packA|border1',
      textureRef: 'packB|tex1',
      backgroundSeed: '42',
      artPack: 'apack',
      worldSize: '2',
      landShape: 'island',
      regionCount: '5',
      randomSeed: '7',
      selectedBooks: new Set(['alpha', 'beta']),
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
    expect(parsed.books).toEqual(['alpha', 'beta'])
  })

  it('applyGridAndColoringHoisted sets gridOverlayColor using getGridOverlayAlpha', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'Dashed',
      regionBoundaryWidth: '3',
      regionBoundaryColor: '#112233',
      drawRegionBoundaries: true,
      colorizeLand: true,
      colorizeOcean: false,
      oceanColor: '#aabbcc',
      landColor: '#ddeeff',
      drawGridOverlay: true,
      gridOverlayShape: 'hex',
      gridOverlayRowOrColCount: '8',
      gridOverlayColor: '#010203',
      gridOverlayXOffset: '10',
      gridOverlayYOffset: '20',
      gridOverlayLineWidth: '2',
      gridOverlayLayer: 'top',
      drawVoronoiGridOverlayOnlyOnLand: true,
      // previous resolver wrapper replaced by explicit values
      landColoringMethod: undefined,
      landColoringMethod: 'ColorPoliticalRegions',
      mergeColor: (ps, k, v) => {
        if (v) ps[k] = v
      },
      getGridOverlayAlpha: () => 128,
    }

    applyGridAndColoringHoisted(parsed, ctx)
    // grid overlay color is now canonical '#RRGGBBAA' -> '#01020380'
    expect(parsed.gridOverlayColor).toBe('#01020380')
    expect(parsed.drawRegionBoundaries).toBe(true)
    expect(parsed.drawVoronoiGridOverlayOnlyOnLand).toBe(true)
  })

  it('applyRoadsAndScalesHoisted sets scales and color/road style', () => {
    const parsed = {}
    const ctx = {
      drawRoads: true,
      roadStyle: 'highway',
      roadWidth: '4',
      mergeColor: (ps, k, v) => {
        if (v) ps[k] = v
      },
      roadColor: '#0a0b0c',
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
