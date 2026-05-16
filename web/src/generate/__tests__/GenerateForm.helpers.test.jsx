import { expect } from 'chai'

import {
  serializeNortObject,
  setResourceFromRef,
  parseBooleanWithDefault,
  scaleSliderValue,
  computeConcentricWaveCount,
  computeGridOverlayAlpha,
  buildCustomizePayload,
  persistCustomizeOverrides,
  loadRandomOverrides,
  loadCustomizeOverrides,
} from '../GenerateForm.jsx'

test('serializeNortObject sorts object keys recursively', () => {
  const obj = { b: 1, a: { d: 4, c: 3 }, z: [ { y: 2, x: 1 } ] }
  const s = serializeNortObject(obj)
  // keys at top level should be in sorted order: a, b, z
  expect(s.indexOf('  "a"')).to.be.lessThan(s.indexOf('  "b"'))
  expect(s.indexOf('  "b"')).to.be.lessThan(s.indexOf('  "z"'))
})

test('setResourceFromRef parses artPack|name format', () => {
  const parsed = {}
  setResourceFromRef(parsed, 'borderResource', 'packA|file.png')
  expect(parsed.borderResource).to.deep.equal({ artPack: 'packA', name: 'file.png' })
})

test('parseBooleanWithDefault prefers mergedRef when appropriate', () => {
  const mergedRef = { current: { priorKey: true } }
  // uiValue false and orig true => returns orig (true)
  const v = parseBooleanWithDefault(false, mergedRef, 'priorKey', false)
  expect(v).to.equal(true)
  // when mergedRef absent, returns Boolean(value)
  expect(parseBooleanWithDefault('x', null, 'k', 'x')).to.equal(true)
})

test('scaleSliderValue returns undefined for non-finite', () => {
  expect(scaleSliderValue('foo')).to.equal(undefined)
})

test('scaleSliderValue returns numeric for values in ranges', () => {
  const r1 = scaleSliderValue(1)
  const r2 = scaleSliderValue(10)
  expect(typeof r1).to.equal('number')
  expect(typeof r2).to.equal('number')
})

test('computeConcentricWaveCount returns origCount when ui not set', () => {
  expect(computeConcentricWaveCount(5, '')).to.equal(5)
  expect(computeConcentricWaveCount(undefined, 3)).to.equal(3)
})

test('computeGridOverlayAlpha returns 255 when origColor missing', () => {
  expect(computeGridOverlayAlpha(null, '#000')).to.equal(255)
})

test('buildCustomizePayload maps values', () => {
  const vals = { backgroundType: 'Solid', textureRef: 'p|n', backgroundSeed: '42', drawRegionBoundaries: true }
  const out = buildCustomizePayload(vals)
  expect(out.backgroundType).to.equal('Solid')
  expect(out.textureRef).to.equal('p|n')
  expect(out.backgroundSeed).to.equal('42')
  expect(out.drawRegionBoundaries).to.equal(true)
})

test('persistCustomizeOverrides writes to localStorage', () => {
  persistCustomizeOverrides({ backgroundType: 'x' })
  const raw = globalThis.localStorage.getItem('vellaris-customize-overrides')
  expect(typeof raw).to.equal('string')
  const parsed = JSON.parse(raw)
  expect(parsed.backgroundType).to.equal('x')
})

test('loadRandom/CustomizeOverrides read from localStorage', () => {
  globalThis.localStorage.setItem('vellaris-random-manual-overrides', JSON.stringify({ a: 1 }))
  globalThis.localStorage.setItem('vellaris-customize-overrides', JSON.stringify({ b: 2 }))
  const r = loadRandomOverrides()
  const c = loadCustomizeOverrides()
  expect(r.a).to.equal(1)
  expect(c.b).to.equal(2)
})
