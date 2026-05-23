import { describe, it, expect, vi } from 'vitest'
import { applyBackgroundFlagsHoisted } from '../GenerateForm.appliers'
import {
  setResourceFromRef,
  parseBooleanWithDefault,
  scaleSliderValue,
  buildCustomizePayload,
  persistCustomizeOverrides,
  serializeNortObject,
  loadRandomOverrides,
  loadCustomizeOverrides,
} from '../GenerateForm.helpers'
import { loadUiOptions } from '../hooks/useUiOptions'

describe('GenerateForm pure helpers', () => {
  it('applyBackgroundFlagsHoisted sets flags for SolidColor', () => {
    const p = {}
    applyBackgroundFlagsHoisted(p, 'SolidColor')
    expect(p.solidColorBackground).toBe(true)
    expect(p.generateBackgroundFromTexture).toBe(false)
    expect(p.generateBackground).toBe(false)
  })

  it('applyBackgroundFlagsHoisted sets flags for GeneratedFromTexture', () => {
    const p = {}
    applyBackgroundFlagsHoisted(p, 'GeneratedFromTexture')
    expect(p.solidColorBackground).toBe(false)
    expect(p.generateBackgroundFromTexture).toBe(true)
    expect(p.generateBackground).toBe(false)
  })

  it('setResourceFromRef parses artPack|name and ignores falsy refs', () => {
    const p = {}
    setResourceFromRef(p, 'borderResource', 'packA|theName')
    expect(p.borderResource).toEqual({ artPack: 'packA', name: 'theName' })
    const p2 = {}
    setResourceFromRef(p2, 'foo', null)
    expect(p2.foo).toBeUndefined()
  })

  it('parseBooleanWithDefault prefers mergedRef when appropriate', () => {
    const merged = { current: { priorKey: true } }
    expect(parseBooleanWithDefault(false, merged, 'priorKey', false)).toBe(true)
    // when no merged value, returns boolean of provided value
    expect(parseBooleanWithDefault('x', null, 'k', 'x')).toBe(true)
    expect(parseBooleanWithDefault(false, null, 'k', false)).toBe(false)
  })

  it('scaleSliderValue maps slider values to scale correctly', () => {
    // v=1 -> close to 0.5
    expect(scaleSliderValue(1)).toBeCloseTo(0.5, 6)
    // v=5 -> exactly 1
    expect(scaleSliderValue(5)).toBeCloseTo(1, 6)
    // v=15 -> exactly 3
    expect(scaleSliderValue(15)).toBeCloseTo(3, 6)
    // non-numeric returns undefined
    expect(scaleSliderValue('not-a-number')).toBeUndefined()
  })

  it('buildCustomizePayload copies expected keys', () => {
    const vals = { backgroundType: 'SolidColor', oceanColor: '#aabbcc', drawRoads: true }
    const p = buildCustomizePayload(vals)
    expect(p.backgroundType).toBe('SolidColor')
    expect(p.oceanColor).toBe('#aabbcc')
    expect(p.drawRoads).toBe(true)
  })
})

describe('GenerateForm helpers', () => {
  beforeEach(() => {
    // ensure clean localStorage
    localStorage.clear()
  })

  it('serializeNortObject sorts object keys recursively', () => {
    const obj = { b: 1, a: { d: 2, c: 3 } }
    const s = serializeNortObject(obj)
    expect(s).toContain('"a":')
    // exact formatted JSON with sorted keys
    expect(s).toBe(JSON.stringify({ a: { c: 3, d: 2 }, b: 1 }, null, 2))
  })

  it('scaleSliderValue returns number within expected bounds', () => {
    const v1 = scaleSliderValue(5)
    const v2 = scaleSliderValue(1)
    const v3 = scaleSliderValue(15)
    expect(typeof v1).toBe('number')
    expect(v1).toBeGreaterThanOrEqual(0.5)
    expect(v1).toBeLessThanOrEqual(3)
    expect(v2).toBeGreaterThanOrEqual(0.5)
    expect(v3).toBeGreaterThanOrEqual(0.5)
  })

  it('loadRandomOverrides/loadCustomizeOverrides parse localStorage values safely', () => {
    localStorage.setItem('vellaris-random-manual-overrides', JSON.stringify({ foo: 'bar' }))
    localStorage.setItem('vellaris-customize-overrides', JSON.stringify({ baz: 1 }))
    const r = loadRandomOverrides()
    const c = loadCustomizeOverrides()
    expect(r?.foo).toBe('bar')
    expect(c?.baz).toBe(1)
  })

  it('loadUiOptions calls fetchJson and caches result', async () => {
    const mock = vi.fn().mockResolvedValue({ options: { ok: true } })
    // patch helpers.fetchJson by mocking module import via dynamic import
    const helpers = await import('../helpers')
    vi.spyOn(helpers, 'fetchJson').mockImplementation(mock)

    const a = await loadUiOptions('en')
    const b = await loadUiOptions('en')
    expect(mock).toHaveBeenCalled()
    expect(a).toEqual(b)
    helpers.fetchJson.mockRestore()
  })

  it('persistCustomizeOverrides stores serialized payload in localStorage', () => {
    const vals = { backgroundType: 'SolidColor', oceanColor: '#abcdef', drawRoads: false }
    // ensure no previous value
    localStorage.removeItem('vellaris-customize-overrides')
    persistCustomizeOverrides(vals)
    const raw = localStorage.getItem('vellaris-customize-overrides')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw)
    expect(parsed.backgroundType).toBe('SolidColor')
    expect(parsed.oceanColor).toBe('#abcdef')
  })

  it('loadRandomOverrides returns empty object for invalid JSON', () => {
    localStorage.setItem('vellaris-random-manual-overrides', 'not-json')
    const r = loadRandomOverrides()
    expect(r).toEqual({})
  })

  it('loadCustomizeOverrides returns empty object when stored value is not an object', () => {
    localStorage.setItem('vellaris-customize-overrides', JSON.stringify('just-a-string'))
    const c = loadCustomizeOverrides()
    expect(c).toEqual({})
  })
})
