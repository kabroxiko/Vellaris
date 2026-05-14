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
