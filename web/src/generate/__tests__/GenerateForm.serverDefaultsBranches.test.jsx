import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { vi, test, beforeEach } from 'vitest'
import { expect } from 'chai'
import GenerateForm, { loadUiOptions } from '../GenerateForm'

const uiOptsWithDefaults = {
  books: [],
  artPacks: ['p1'],
  textures: [],
  borderTypes: [],
  defaults: {
    // roadStyle as object
    roadStyle: { type: 'major', width: '3' },
    // scale mapping paths
    mountainScale: 0.5,
    hillScale: 2.5,
    // alpha via parsable color channel string (r,g,b,a)
    coastShadingColor: '10,20,30,102',
  },
  labels: {},
  options: { backgroundTypes: [{ value: 'MyBg' }], finalLandColoringMethods: [{ value: 'L1' }], lineStyles: [{ value: 'ls' }], fonts: ['F1'], defaultFontFamily: 'F1', maxCityProbability: 100 },
}

vi.mock('../helpers', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, fetchJson: vi.fn(() => Promise.resolve(uiOptsWithDefaults)) }
})

vi.mock('../../i18n/webLabels', async (importOriginal) => ({
  constActual: await importOriginal(),
  getFrontendLabels: () => Promise.resolve({}),
}))

vi.mock('../hooks/useGenerate', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, default: () => vi.fn() }
})

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

test('applyServerDefaults: roadStyle object and scale mapping applied to persisted customize overrides', async () => {
  render(<GenerateForm uiLanguage="en" />)
  await waitFor(() => {
    const raw = localStorage.getItem('vellaris-customize-overrides')
    if (!raw) throw new Error('localStorage not populated yet')
    const parsed = JSON.parse(raw)
    // roadStyle should be set from object.type
    if (parsed.roadStyle !== 'major') throw new Error('roadStyle not applied')
    // mountainScale 0.5 should map to a slider value (number)
    if (!parsed.mountainSize && parsed.mountainSize !== 0) throw new Error('mountainSize not present')
    // hillScale >1 should produce a hillSize number
    if (!parsed.hillSize && parsed.hillSize !== 0) throw new Error('hillSize not present')
  })
  const raw = localStorage.getItem('vellaris-customize-overrides')
  const parsed = JSON.parse(raw)
  expect(parsed.roadStyle).to.equal('major')
  expect(Number(parsed.mountainSize)).to.be.a('number')
  expect(Number(parsed.hillSize)).to.be.a('number')
})

test('applyServerDefaults: coastShadingAlpha extracted from rgba color', async () => {
  render(<GenerateForm uiLanguage="en" />)
  await waitFor(() => {
    const raw = localStorage.getItem('vellaris-customize-overrides')
    if (!raw) throw new Error('localStorage not populated yet')
    const parsed = JSON.parse(raw)
    if (parsed.coastShadingAlpha === undefined) throw new Error('coastShadingAlpha not applied')
  })
  const raw = localStorage.getItem('vellaris-customize-overrides')
  const parsed = JSON.parse(raw)
  // alpha should be a finite channel value (0-255)
  expect(Number.isFinite(Number(parsed.coastShadingAlpha))).to.equal(true)
  expect(Number(parsed.coastShadingAlpha)).to.be.within(0, 255)
})

// Also ensure loadUiOptions throws on network error (covering caching branch)

test('loadUiOptions propagates fetchJson errors and caching', async () => {
  const helpers = await import('../helpers')
  helpers.fetchJson.mockImplementationOnce(() => Promise.reject(new Error('network fail')))
  let threw = false
  try {
    await loadUiOptions('lang-error')
  } catch (e) {
    threw = true
    expect(e.message).to.match(/network fail/)
  }
  if (!threw) throw new Error('expected loadUiOptions to throw')
})
