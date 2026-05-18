import {
  mergeColor,
  applyBackgroundFlagsHoisted,
  applyResourcesAndTopLevelHoisted,
  applyGridAndColoringHoisted,
  applyBordersFrayedAndGrungeHoisted,
  applyCoastOceanAndWavesHoisted,
  applyRoadsAndScalesHoisted,
  applyTextAndBackgroundHoisted,
} from '../GenerateForm.appliers'

describe('GenerateForm appliers', () => {
  it('mergeColor formats and sets color', () => {
    const parsed = {}
    mergeColor(parsed, 'x', '#112233', 50, true)
    expect(parsed.x).toBeDefined()
    expect(parsed.x.includes(',')).toBe(true)
  })

  it('applyBackgroundFlagsHoisted sets proper flags', () => {
    const parsed = {}
    applyBackgroundFlagsHoisted(parsed, 'SolidColor')
    expect(parsed.solidColorBackground).toBe(true)
    expect(parsed.generateBackgroundFromTexture).toBe(false)
  })

  it('applyResourcesAndTopLevelHoisted applies resources and fields', () => {
    const parsed = {}
    const setResourceFromRef = (p, key, ref) => {
      if (ref) p[key] = `ref:${ref}`
    }
    const ctx = {
      setResourceFromRef,
      borderRef: 'b1',
      textureRef: 't1',
      backgroundSeed: '42',
      artPack: 'pack',
      worldSize: '10',
      landShape: 'island',
      regionCount: '5',
      randomSeed: '7',
      selectedBooks: new Set(['b', 'a']),
    }
    applyResourcesAndTopLevelHoisted(parsed, ctx)
    expect(parsed.borderResource).toBe('ref:b1')
    expect(parsed.backgroundTextureResource).toBe('ref:t1')
    expect(parsed.backgroundRandomSeed).toBe(42)
    expect(parsed.artPack).toBe('pack')
    expect(parsed.worldSize).toBe(10)
    expect(parsed.regionCount).toBe(5)
    expect(Array.isArray(parsed.books)).toBe(true)
    expect(parsed.books[0] < parsed.books[1]).toBe(true)
  })

  it('applyGridAndColoringHoisted sets grid and coloring values', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'dashed',
      regionBoundaryWidth: '2',
      regionBoundaryColorHex: '#010203',
      drawRegionBoundaries: true,
      colorizeLand: false,
      colorizeOcean: true,
      oceanColorHex: '#0000ff',
      landColorHex: '#00ff00',
      drawGridOverlay: true,
      gridOverlayShape: 'square',
      gridOverlayRowOrColCount: '4',
      gridOverlayColorHex: '#abcdef',
      gridOverlayXOffset: '3',
      gridOverlayYOffset: '4',
      gridOverlayLineWidth: '1',
      gridOverlayLayer: 'top',
      drawVoronoiGridOverlayOnlyOnLand: true,
      resolveLandColoringMethod: () => 'SingleColor',
      finalLandColoringMethod: null,
      mergeColor,
      getGridOverlayAlpha: () => 128,
    }
    applyGridAndColoringHoisted(parsed, ctx)
    expect(parsed.regionBoundaryStyle.type).toBe('dashed')
    expect(parsed.regionBoundaryStyle.width).toBe(2)
    expect(parsed.drawRegionBoundaries).toBe(true)
    expect(parsed.gridOverlayShape).toBe('square')
    expect(parsed.gridOverlayRowOrColCount).toBe(4)
    expect(parsed.gridOverlayColor).toContain(',')
    expect(parsed.drawVoronoiGridOverlayOnlyOnLand).toBe(true)
  })

  it('applyBordersFrayedAndGrungeHoisted applies border and frayed props', () => {
    const parsed = {}
    const ctx = {
      borderWidth: '5',
      borderPosition: 'inside',
      borderColorOption: 'auto',
      borderColorHex: '#112233',
      frayedBorder: true,
      frayedBorderBlurLevel: '2',
      frayedBorderSize: '3',
      frayedBorderSeed: '9',
      drawGrunge: true,
      grungeWidth: '6',
      frayedBorderColorHex: '#ffffff',
    }
    applyBordersFrayedAndGrungeHoisted(parsed, ctx)
    expect(parsed.borderWidth).toBe(5)
    expect(parsed.borderPosition).toBe('inside')
    expect(parsed.frayedBorder).toBe(true)
    expect(parsed.frayedBorderBlurLevel).toBe(2)
    expect(parsed.frayedBorderColor).toBeDefined()
  })

  it('applyCoastOceanAndWavesHoisted computes shading and waves fields', () => {
    const parsed = {}
    const ctx = {
      lineStyle: 'solid',
      coastlineWidth: '4',
      coastlineColorHex: '#123456',
      coastShadingLevel: '2',
      coastShadingColorHex: '#112233',
      coastShadingAlpha: '10',
      oceanShadingLevel: '3',
      oceanShadingColorHex: '#223344',
      oceanShadingAlpha: '20',
      oceanWavesType: 'concentric',
      oceanWavesLevel: '7',
      oceanWavesAlpha: '5',
      getConcentricWaveCount: () => 8,
      fadeConcentricWaves: true,
      jitterToConcentricWaves: false,
      brokenLinesForConcentricWaves: true,
      oceanWavesColorHex: '#00ff00',
      drawOceanEffectsInLakes: true,
      riverColorHex: '#010101',
      parseBooleanWithDefault: Boolean,
      mergedSettingsRef: {},
    }
    applyCoastOceanAndWavesHoisted(parsed, ctx)
    expect(parsed.lineStyle).toBe('solid')
    expect(parsed.coastlineWidth).toBe(4)
    expect(parsed.coastShadingLevel).toBe(2)
    expect(parsed.oceanShadingLevel).toBe(3)
    expect(parsed.concentricWaveCount).toBe(8)
    expect(parsed.drawOceanEffectsInLakes).toBe(true)
    expect(parsed.riverColor).toBeDefined()
  })

  it('applyRoadsAndScalesHoisted applies road style and scales', () => {
    const parsed = {}
    const ctx = {
      drawRoads: true,
      roadStyle: 'major',
      roadWidth: '3',
      roadColorHex: '#010203',
      mountainSize: '2',
      hillSize: '3',
      duneSize: '4',
      treeHeight: '5',
      citySize: '6',
      scaleSliderValue: (v) => v * 10,
    }
    applyRoadsAndScalesHoisted(parsed, ctx)
    expect(parsed.drawRoads).toBe(true)
    expect(parsed.roadStyle.type).toBe('major')
    expect(parsed.roadStyle.width).toBe(3)
    expect(parsed.mountainScale).toBe(20)
    expect(parsed.treeHeightScale).toBeGreaterThan(0)
  })

  it('applyTextAndBackgroundHoisted sets text and bold background', () => {
    const parsed = {}
    const ctx = {
      drawText: true,
      textColorHex: '#abcdef',
      drawBoldBackground: true,
      boldBackgroundColorHex: '#010101',
    }
    applyTextAndBackgroundHoisted(parsed, ctx)
    expect(parsed.drawText).toBe(true)
    expect(parsed.drawBoldBackground).toBe(true)
    expect(parsed.textColor).toBeDefined()
    expect(parsed.boldBackgroundColor).toBeDefined()
  })
})
