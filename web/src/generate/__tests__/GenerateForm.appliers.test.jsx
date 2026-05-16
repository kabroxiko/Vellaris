import { expect } from 'chai'

import {
  applyResourcesAndTopLevelHoisted,
  applyGridAndColoringHoisted,
  applyBordersFrayedAndGrungeHoisted,
  applyCoastOceanAndWavesHoisted,
  applyRoadsAndScalesHoisted,
  applyTextAndBackgroundHoisted,
  setResourceFromRef,
} from '../GenerateForm'

test('applyResourcesAndTopLevelHoisted sets numeric and book values', () => {
  const parsed = {}
  const ctx = {
    setResourceFromRef,
    borderRef: 'pack|b',
    textureRef: 'pack|t',
    backgroundSeed: '123',
    artPack: 'ap',
    worldSize: '42',
    landShape: 'island',
    regionCount: '5',
    randomSeed: '7',
    selectedBooks: new Set(['z', 'a']),
  }
  applyResourcesAndTopLevelHoisted(parsed, ctx)
  expect(parsed.borderResource).to.deep.equal({ artPack: 'pack', name: 'b' })
  expect(parsed.backgroundTextureResource).to.deep.equal({ artPack: 'pack', name: 't' })
  expect(parsed.backgroundRandomSeed).to.equal(123)
  expect(parsed.artPack).to.equal('ap')
  expect(parsed.worldSize).to.equal(42)
  expect(parsed.regionCount).to.equal(5)
  expect(parsed.randomSeed).to.equal(7)
  expect(parsed.books).to.deep.equal(['a', 'z'])
})

test('applyGridAndColoringHoisted applies grid and colors and resolves land method', () => {
  const parsed = {}
  const mergeColor = (ps, key, hex) => { ps[key] = hex }
  const ctx = {
    regionBoundaryStyle: 'dashed',
    regionBoundaryWidth: '3',
    regionBoundaryColorHex: '#112233',
    drawRegionBoundaries: true,
    colorizeLand: true,
    colorizeOcean: false,
    oceanColorHex: '#aabbcc',
    landColorHex: '#ddeeff',
    drawGridOverlay: true,
    gridOverlayShape: 'square',
    gridOverlayRowOrColCount: '4',
    gridOverlayColorHex: '#010203',
    gridOverlayXOffset: '5',
    gridOverlayYOffset: '6',
    gridOverlayLineWidth: '2',
    gridOverlayLayer: 'above',
    drawVoronoiGridOverlayOnlyOnLand: true,
    resolveLandColoringMethod: (m) => (m === 'ColorPoliticalRegions' ? 'ColorPoliticalRegions' : null),
    finalLandColoringMethod: 'ColorPoliticalRegions',
    mergeColor,
    getGridOverlayAlpha: () => 128,
  }
  applyGridAndColoringHoisted(parsed, ctx)
  expect(parsed.regionBoundaryStyle.type).to.equal('dashed')
  expect(parsed.regionBoundaryStyle.width).to.equal(3)
  expect(parsed.regionBoundaryColor).to.equal('#112233')
  expect(parsed.drawRegionBoundaries).to.equal(true)
  expect(parsed.colorizeLand).to.equal(true)
  expect(parsed.gridOverlayShape).to.equal('square')
  expect(parsed.gridOverlayRowOrColCount).to.equal(4)
  // gridOverlayColor is produced via hexToRgbaString; verify alpha included
  expect(String(parsed.gridOverlayColor)).to.include('128')
  expect(parsed.gridOverlayLineWidth).to.equal(2)
  expect(parsed.drawVoronoiGridOverlayOnlyOnLand).to.equal(true)
  expect(parsed.drawRegionColors).to.equal(true)
})

test('applyBordersFrayedAndGrungeHoisted sets numeric fields and calls mergeColor', () => {
  const parsed = {}
  const mergeColor = (ps, key, hex) => { ps[key] = hex }
  const ctx = {
    borderWidth: '4',
    borderPosition: 'inside',
    borderColorOption: 'auto',
    borderColorHex: '#abc',
    frayedBorder: true,
    frayedBorderBlurLevel: '2',
    frayedBorderSize: '6',
    frayedBorderSeed: '9',
    drawGrunge: true,
    grungeWidth: '7',
    frayedBorderColorHex: '#def',
    mergeColor,
  }
  applyBordersFrayedAndGrungeHoisted(parsed, ctx)
  expect(parsed.borderWidth).to.equal(4)
  expect(parsed.borderPosition).to.equal('inside')
  expect(parsed.borderColor).to.equal('#abc')
  expect(parsed.frayedBorder).to.equal(true)
  expect(parsed.frayedBorderBlurLevel).to.equal(2)
  expect(parsed.frayedBorderSize).to.equal(6)
  expect(parsed.frayedBorderSeed).to.equal(9)
  expect(parsed.drawGrunge).to.equal(true)
  expect(parsed.grungeWidth).to.equal(7)
  expect(parsed.frayedBorderColor).to.equal('#def')
})

test('applyCoastOceanAndWavesHoisted sets shading and wave options and calls mergeColor', () => {
  const parsed = {}
  const mergeColor = (ps, key, hex, opacityPercent, useFormatter) => { ps[key] = { hex, opacityPercent, useFormatter } }
  const ctx = {
    lineStyle: 'solid',
    coastlineWidth: '2',
    coastlineColorHex: '#010101',
    coastShadingLevel: '3',
    coastShadingColorHex: '#020202',
    coastShadingAlpha: '10',
    oceanShadingLevel: '5',
    oceanShadingColorHex: '#030303',
    oceanShadingAlpha: '20',
    oceanWavesType: 'ripples',
    oceanWavesLevel: '4',
    getConcentricWaveCount: () => 7,
    fadeConcentricWaves: true,
    jitterToConcentricWaves: false,
    brokenLinesForConcentricWaves: true,
    oceanWavesColorHex: '#040404',
    oceanWavesAlpha: '30',
    drawOceanEffectsInLakes: true,
    riverColorHex: '#050505',
    parseBooleanWithDefault: (v) => Boolean(v),
    mergedSettingsRef: { current: {} },
    mergeColor,
  }
  applyCoastOceanAndWavesHoisted(parsed, ctx)
  expect(parsed.lineStyle).to.equal('solid')
  expect(parsed.coastlineWidth).to.equal(2)
  expect(parsed.coastlineColor.hex).to.equal('#010101')
  expect(parsed.coastShadingLevel).to.equal(3)
  expect(parsed.coastShadingColor).to.deep.equal({ hex: '#020202', opacityPercent: 90, useFormatter: true })
  expect(parsed.oceanWavesLevel).to.equal(4)
  expect(parsed.concentricWaveCount).to.equal(7)
  expect(parsed.drawOceanEffectsInLakes).to.equal(true)
  expect(parsed.riverColor.hex).to.equal('#050505')
})

test('applyRoadsAndScalesHoisted sets road style and scales', () => {
  const parsed = {}
  const mergeColor = (ps, key, hex) => { ps[key] = hex }
  const scaleSlider = (v) => v * 0.1
  const ctx = {
    drawRoads: true,
    roadStyle: null,
    roadWidth: '3',
    roadColorHex: '#111111',
    mountainSize: '2',
    hillSize: '3',
    duneSize: '4',
    treeHeight: '5',
    citySize: '6',
    scaleSliderValue: scaleSlider,
    mergeColor,
  }
  applyRoadsAndScalesHoisted(parsed, ctx)
  expect(parsed.drawRoads).to.equal(true)
  expect(parsed.roadStyle.width).to.equal(3)
  expect(parsed.roadColor).to.equal('#111111')
  expect(parsed.mountainScale).to.be.a('number')
  expect(parsed.treeHeightScale).to.be.a('number')
})

test('applyTextAndBackgroundHoisted applies text and bold background settings', () => {
  const parsed = {}
  const mergeColor = (ps, key, hex) => { ps[key] = hex }
  const ctx = { drawText: true, textColorHex: '#abc', drawBoldBackground: true, boldBackgroundColorHex: '#def', mergeColor }
  applyTextAndBackgroundHoisted(parsed, ctx)
  expect(parsed.drawText).to.equal(true)
  expect(parsed.textColor).to.equal('#abc')
  expect(parsed.drawBoldBackground).to.equal(true)
  expect(parsed.boldBackgroundColor).to.equal('#def')
})
