import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseBooleanWithDefault,
  scaleSliderValue,
  computeGridOverlayAlpha,
  computeConcentricWaveCount,
  buildCustomizePayload,
  persistCustomizeOverrides,
  loadRandomOverrides,
} from '../GenerateForm'

describe('GenerateForm pure helpers', () => {
  beforeEach(() => {
    if (globalThis.localStorage?.clear) globalThis.localStorage.clear()
  })

  it('parseBooleanWithDefault returns original merged boolean when uiValue is false', () => {
    const mergedRef = { current: { myFlag: true } }
    const res = parseBooleanWithDefault(false, mergedRef, 'myFlag', false)
    expect(res).toBe(true)
  })

  it('parseBooleanWithDefault coerces value when no mergedRef', () => {
    expect(parseBooleanWithDefault('truthy', null, 'x', true)).toBe(true)
    expect(parseBooleanWithDefault('', null, 'x', false)).toBe(false)
  })

  it('scaleSliderValue maps slider to expected scale endpoints', () => {
    // defaults: sliderValueFor1Scale=5, scaleMin=0.5, scaleMax=3
    expect(scaleSliderValue(1)).toBeCloseTo(0.5)
    expect(scaleSliderValue(5)).toBeCloseTo(1)
    expect(scaleSliderValue(15)).toBeCloseTo(3)
    expect(scaleSliderValue('not-a-number')).toBeUndefined()
  })

  it('computeGridOverlayAlpha returns 255 for falsy origColor', () => {
    expect(computeGridOverlayAlpha(null, '#000000')).toBe(255)
  })

  it('computeGridOverlayAlpha returns alpha when colors match', () => {
    const orig = { r: 10, g: 20, b: 30, a: 128 }
    // hex produced by colorToHex for this should match below
    expect(computeGridOverlayAlpha(orig, '#0a141e')).toBe(128)
  })

  it('computeConcentricWaveCount prefers origCount when ui value is 0 or not finite', () => {
    expect(computeConcentricWaveCount(7, 0)).toBe(7)
    expect(computeConcentricWaveCount(7, undefined)).toBe(7)
    expect(computeConcentricWaveCount(undefined, 3)).toBe(3)
  })

  it('buildCustomizePayload copies expected keys', () => {
    const values = { backgroundType: 'paper', oceanColorHex: '#ffffff', drawGridOverlay: true }
    const payload = buildCustomizePayload(values)
    expect(payload.backgroundType).toBe('paper')
    expect(payload.oceanColorHex).toBe('#ffffff')
    expect(payload.drawGridOverlay).toBe(true)
  })

  it('persistCustomizeOverrides writes payload to localStorage and loadRandomOverrides reads overrides', () => {
    const values = { backgroundType: 'foo', oceanColorHex: '#010203' }
    persistCustomizeOverrides(values)
    const stored = JSON.parse(localStorage.getItem('vellaris-customize-overrides'))
    expect(stored.backgroundType).toBe('foo')

    // random overrides: empty when missing
    expect(loadRandomOverrides()).toEqual({})
    localStorage.setItem('vellaris-random-manual-overrides', JSON.stringify({ a: 1 }))
    expect(loadRandomOverrides()).toEqual({ a: 1 })
  })
})
