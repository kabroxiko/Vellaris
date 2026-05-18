import { expect } from 'chai'

import {
  applyBackgroundFlagsHoisted,
  applyResourcesAndTopLevelHoisted,
  applyRoadsAndScalesHoisted,
  applyTextAndBackgroundHoisted,
  loadCityIconTypes,
  setResourceFromRef,
  scaleSliderValue,
} from '../GenerateForm.jsx'

describe('GenerateForm hoisted helpers (additional)', () => {
  it('applyBackgroundFlagsHoisted sets flags for SolidColor', () => {
    const parsed = {}
    applyBackgroundFlagsHoisted(parsed, 'SolidColor')
    expect(parsed.solidColorBackground).to.equal(true)
    expect(parsed.generateBackgroundFromTexture).to.equal(false)
    expect(parsed.generateBackground).to.equal(false)
  })

  it('applyBackgroundFlagsHoisted sets texture flags for GeneratedFromTexture', () => {
    const parsed = {}
    applyBackgroundFlagsHoisted(parsed, 'GeneratedFromTexture')
    expect(parsed.solidColorBackground).to.equal(false)
    expect(parsed.generateBackgroundFromTexture).to.equal(true)
  })

  it('applyResourcesAndTopLevelHoisted parses resource refs and numeric fields', () => {
    const parsed = {}
    const ctx = {
      setResourceFromRef: setResourceFromRef,
      borderRef: 'packA|b.png',
      textureRef: 'packB|t.png',
      backgroundSeed: '42',
      artPack: 'ap1',
      worldSize: '3',
      landShape: 'island',
      regionCount: '2',
      randomSeed: '9',
      selectedBooks: new Set(['z', 'a']),
    }
    applyResourcesAndTopLevelHoisted(parsed, ctx)
    expect(parsed.borderResource).to.deep.equal({ artPack: 'packA', name: 'b.png' })
    expect(parsed.backgroundTextureResource).to.deep.equal({ artPack: 'packB', name: 't.png' })
    expect(parsed.backgroundRandomSeed).to.equal(42)
    expect(parsed.artPack).to.equal('ap1')
    expect(parsed.worldSize).to.equal(3)
    expect(parsed.landShape).to.equal('island')
    expect(parsed.regionCount).to.equal(2)
    expect(parsed.randomSeed).to.equal(9)
    expect(Array.isArray(parsed.books)).to.equal(true)
    expect(parsed.books[0]).to.equal('a')
  })

  it('applyTextAndBackgroundHoisted merges text and bold background color', () => {
    const parsed = {}
    const ctx = {
      drawText: true,
      textColorHex: '#112233',
      drawBoldBackground: true,
      boldBackgroundColorHex: '#445566',
      mergeColor: (parsedSettings, key, hex) => {
        parsedSettings[key] = `merged:${hex}`
      },
    }
    applyTextAndBackgroundHoisted(parsed, ctx)
    expect(parsed.drawText).to.equal(true)
    expect(parsed.textColor).to.equal('merged:#112233')
    expect(parsed.drawBoldBackground).to.equal(true)
    expect(parsed.boldBackgroundColor).to.equal('merged:#445566')
  })

  it('applyRoadsAndScalesHoisted sets road and scale values', () => {
    const parsed = {}
    const recorded = {}
    const ctx = {
      drawRoads: true,
      roadStyle: 'dashed',
      roadWidth: '4',
      mergeColor: (parsedSettings, key, hex) => {
        parsedSettings[key] = `merged:${hex}`
      },
      roadColorHex: '#010203',
      mountainSize: '5',
      hillSize: '2',
      duneSize: '1',
      treeHeight: '4',
      citySize: '6',
      scaleSliderValue: scaleSliderValue,
    }
    applyRoadsAndScalesHoisted(parsed, ctx)
    expect(parsed.drawRoads).to.equal(true)
    expect(parsed.roadStyle.type).to.equal('dashed')
    expect(parsed.roadStyle.width).to.equal(4)
    expect(parsed.roadColor).to.equal('merged:#010203')
    expect(typeof parsed.mountainScale).to.equal('number')
    expect(typeof parsed.hillScale).to.equal('number')
    // treeHeightScale = 0.1 + treeHeight * 0.05 -> 0.1 + 4*0.05 = 0.3
    expect(parsed.treeHeightScale).to.be.closeTo(0.3, 0.0001)
  })
})
import { expect, vi } from 'vitest'
import {
  buildCustomizePayload,
  persistCustomizeOverrides,
  applyBackgroundFlagsHoisted,
  setResourceFromRef,
  parseBooleanWithDefault,
} from '../GenerateForm.jsx'

describe('GenerateForm additional helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('buildCustomizePayload returns expected subset', () => {
    const values = {
      backgroundType: 'SolidColor',
      textureRef: 'p|t',
      backgroundSeed: 's1',
      drawRegionBoundaries: true,
      colorizeLand: false,
      oceanColorHex: '#010203',
      landColorHex: '#040506',
      regionBoundaryStyle: { type: 'thin' },
      regionBoundaryWidth: 2,
      regionBoundaryColorHex: '#000000',
      drawBorder: true,
      drawGridOverlay: false,
      finalLandColoringMethod: 'ColorPoliticalRegions',
      borderRef: 'pack|b',
      borderWidth: 3,
      borderPosition: 'inside',
      borderColorOption: 'auto',
      borderColorHex: '#111111',
      frayedBorder: true,
      frayedBorderBlurLevel: 1,
      frayedBorderSize: 2,
      frayedBorderSeed: 'fs',
      drawGrunge: false,
      grungeWidth: 4,
      frayedBorderColorHex: '#222222',
    }
    const out = buildCustomizePayload(values)
    expect(out.backgroundType).toBe('SolidColor')
    expect(out.borderRef).toBe('pack|b')
    expect(out.frayedBorderSize).toBe(2)
  })

  it('persistCustomizeOverrides writes to localStorage', () => {
    const values = { a: 1 }
    const expected = buildCustomizePayload(values)
    persistCustomizeOverrides(values)
    const raw = localStorage.getItem('vellaris-customize-overrides')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw)).toEqual(expected)
  })

  it('applyBackgroundFlagsHoisted sets flags correctly', () => {
    const parsed = {}
    applyBackgroundFlagsHoisted(parsed, 'SolidColor')
    expect(parsed.solidColorBackground).toBe(true)
    applyBackgroundFlagsHoisted(parsed, 'GeneratedFromTexture')
    expect(parsed.generateBackgroundFromTexture).toBe(true)
  })

  it('setResourceFromRef parses pack|name', () => {
    const parsed = {}
    setResourceFromRef(parsed, 'borderResource', 'myPack|resName')
    expect(parsed.borderResource).toEqual({ artPack: 'myPack', name: 'resName' })
    // non-matching ref leaves no key
    const parsed2 = {}
    setResourceFromRef(parsed2, 'x', null)
    expect(parsed2.x).toBeUndefined()
  })

  it('parseBooleanWithDefault returns merged boolean when appropriate', () => {
    const mergedRef = { current: { prior: true } }
    const res = parseBooleanWithDefault(false, mergedRef, 'prior', false)
    expect(res).toBe(true)
    // when no mergedRef, just coerce
    expect(parseBooleanWithDefault('x', null, 'p', false)).toBe(true)
  })
})
