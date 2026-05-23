import { expect } from 'chai'

import {
  applyGridAndColoringHoisted,
  applyBordersFrayedAndGrungeHoisted,
  applyCoastOceanAndWavesHoisted,
} from '../GenerateForm.appliers'

describe('GenerateForm appliers (grid, borders, coast/ocean)', () => {
  it('applyGridAndColoringHoisted sets region boundary and grid values', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'dashed',
      regionBoundaryWidth: '2',
      regionBoundaryColor: '#010203',
      drawRegionBoundaries: true,
      colorizeLand: true,
      colorizeOcean: false,
      oceanColor: '#020304',
      landColor: '#030405',
      drawGridOverlay: true,
      gridOverlayShape: 'hex',
      gridOverlayRowOrColCount: '10',
      gridOverlayColor: '#0a0b0c',
      gridOverlayXOffset: 'left',
      gridOverlayYOffset: 'top',
      gridOverlayLineWidth: '5',
      gridOverlayLayer: 'main',
      drawVoronoiGridOverlayOnlyOnLand: true,
      resolveLandColoringMethod: () => 'ColorPoliticalRegions',
      finalLandColoringMethod: undefined,
      mergeColor: (p, k, hex) => {
        p[k] = `merged:${hex}`
      },
      getGridOverlayAlpha: () => 77,
    }

    applyGridAndColoringHoisted(parsed, ctx)

    expect(parsed.regionBoundaryStyle.type).to.equal('dashed')
    expect(parsed.regionBoundaryStyle.width).to.equal(2)
    expect(parsed.regionBoundaryColor).to.equal('merged:#010203')
    expect(parsed.drawRegionBoundaries).to.equal(true)
    expect(parsed.colorizeLand).to.equal(true)
    expect(parsed.colorizeOcean).to.equal(false)
    expect(parsed.drawGridOverlay).to.equal(true)
    expect(parsed.gridOverlayShape).to.equal('hex')
    expect(parsed.gridOverlayRowOrColCount).to.equal(10)
    // gridOverlayColor should be r,g,b,alpha string
    expect(typeof parsed.gridOverlayColor).to.equal('string')
    expect(parsed.gridOverlayLayer).to.equal('main')
    expect(parsed.drawVoronoiGridOverlayOnlyOnLand).to.equal(true)
    expect(parsed.drawRegionColors).to.equal(true)
  })

  it('applyBordersFrayedAndGrungeHoisted sets border and frayed values', () => {
    const parsed = {}
    const ctx = {
      borderWidth: '4',
      borderPosition: 'inside',
      borderColorOption: 'solid',
      borderColor: '#0f0f0f',
      frayedBorder: true,
      frayedBorderBlurLevel: '2',
      frayedBorderSize: '3',
      frayedBorderSeed: '99',
      drawGrunge: true,
      grungeWidth: '6',
      frayedBorderColor: '#101010',
      mergeColor: (p, k, hex) => {
        p[k] = `merged:${hex}`
      },
    }

    applyBordersFrayedAndGrungeHoisted(parsed, ctx)

    expect(parsed.borderWidth).to.equal(4)
    expect(parsed.borderPosition).to.equal('inside')
    expect(parsed.borderColorOption).to.equal('solid')
    expect(parsed.borderColor).to.equal('merged:#0f0f0f')
    expect(parsed.frayedBorder).to.equal(true)
    expect(parsed.frayedBorderBlurLevel).to.equal(2)
    expect(parsed.frayedBorderSize).to.equal(3)
    expect(parsed.frayedBorderSeed).to.equal(99)
    expect(parsed.drawGrunge).to.equal(true)
    expect(parsed.grungeWidth).to.equal(6)
    expect(parsed.frayedBorderColor).to.equal('merged:#101010')
  })

  it('applyCoastOceanAndWavesHoisted sets coast, ocean and wave values', () => {
    const parsed = {}
    const ctx = {
      lineStyle: 'solid',
      coastlineWidth: '3',
      coastlineColor: '#111213',
      coastShadingLevel: '7',
      coastShadingColor: '#141516',
      oceanShadingLevel: '8',
      oceanShadingColor: '#171819',
      oceanWavesType: 'ripple',
      oceanWavesLevel: '2',
      getConcentricWaveCount: () => 9,
      fadeConcentricWaves: true,
      jitterToConcentricWaves: false,
      brokenLinesForConcentricWaves: true,
      mergeColor: (p, k, hex) => {
        p[k] = `merged:${hex}`
      },
      oceanWavesColor: '#1a1b1c',
      drawOceanEffectsInLakes: true,
      riverColor: '#1d1e1f',
      parseBooleanWithDefault: Boolean,
      mergedSettingsRef: { current: {} },
    }

    applyCoastOceanAndWavesHoisted(parsed, ctx)

    expect(parsed.lineStyle).to.equal('solid')
    expect(parsed.coastlineWidth).to.equal(3)
    expect(parsed.coastlineColor).to.equal('merged:#111213')
    expect(parsed.coastShadingLevel).to.equal(7)
    expect(parsed.oceanShadingLevel).to.equal(8)
    expect(parsed.oceanEffect).to.equal('ripple')
    expect(parsed.oceanWavesLevel).to.equal(2)
    expect(parsed.concentricWaveCount).to.equal(9)
    expect(parsed.fadeConcentricWaves).to.equal(true)
    expect(parsed.brokenLinesForConcentricWaves).to.equal(true)
    expect(parsed.oceanWavesColor).to.equal('merged:#1a1b1c')
    expect(parsed.drawOceanEffectsInLakes).to.equal(true)
    expect(parsed.riverColor).to.equal('merged:#1d1e1f')
  })
})
