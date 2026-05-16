import { beforeEach, describe, expect, it } from 'vitest'
import {
  scaleSliderValue,
  parseBooleanWithDefault,
  computeGridOverlayAlpha,
  computeConcentricWaveCount,
  setResourceFromRef,
  buildCustomizePayload,
  persistCustomizeOverrides,
  loadCustomizeOverrides,
  loadRandomOverrides,
} from '../GenerateForm'

describe('GenerateForm helpers (focused)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('scaleSliderValue handles invalid and boundary values', () => {
    expect(scaleSliderValue('foo')).toBeUndefined()
    expect(scaleSliderValue(5)).toBeCloseTo(1)
    expect(scaleSliderValue(1)).toBeCloseTo(0.5)
    expect(scaleSliderValue(15)).toBeCloseTo(3)
  })

  it('parseBooleanWithDefault respects prior boolean when uiValue is false', () => {
    const mergedRef = { current: { prior: true } }
    expect(parseBooleanWithDefault(false, mergedRef, 'prior', false)).toBe(true)
    // when no mergedRef exists, return boolean of value
    expect(parseBooleanWithDefault(false, null, 'prior', false)).toBe(false)
  })

  it('computeGridOverlayAlpha preserves prior alpha when color matches', () => {
    // origColor channels -> hex #010203, alpha 55
    expect(computeGridOverlayAlpha(null, '#010203')).toBe(255)
    expect(computeGridOverlayAlpha('1,2,3,55', '#010203')).toBe(55)
    // different ui color -> default 255
    expect(computeGridOverlayAlpha('1,2,3,55', '#010204')).toBe(255)
  })

  it('computeConcentricWaveCount uses orig or ui values correctly', () => {
    expect(computeConcentricWaveCount(5, '')).toBe(5)
    expect(computeConcentricWaveCount(5, '0')).toBe(5)
    expect(computeConcentricWaveCount(undefined, '2')).toBe(2)
    expect(computeConcentricWaveCount(undefined, 'abc')).toBeUndefined()
  })

  it('setResourceFromRef parses pack|name refs', () => {
    const parsed = {}
    setResourceFromRef(parsed, 'borderResource', 'mypack|myname')
    expect(parsed.borderResource).toEqual({ artPack: 'mypack', name: 'myname' })
  })

  it('buildCustomizePayload and persist/load customize overrides via localStorage', () => {
    const values = { backgroundType: 'SolidColor', drawGridOverlay: true, oceanColorHex: '#112233' }
    persistCustomizeOverrides(values)
    const raw = localStorage.getItem('vellaris-customize-overrides')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw)
    expect(parsed.backgroundType).toBe('SolidColor')
    expect(buildCustomizePayload(values).oceanColorHex).toBe(values.oceanColorHex)
    const loaded = loadCustomizeOverrides()
    expect(loaded.oceanColorHex).toBe(values.oceanColorHex)
  })

  it('loadRandomOverrides returns empty object when none set and parses stored value', () => {
    expect(loadRandomOverrides()).toEqual({})
    const v = { mapLanguage: 'en', artPack: 'nortantis' }
    localStorage.setItem('vellaris-random-manual-overrides', JSON.stringify(v))
    expect(loadRandomOverrides()).toEqual(v)
  })
})
