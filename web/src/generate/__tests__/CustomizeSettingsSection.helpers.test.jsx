import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { vi, expect, it, beforeEach, afterEach, describe } from 'vitest'
import backgroundBaseCache from '../backgroundBaseCache'
import CustomizeSettingsSection from '../CustomizeSettingsSection.jsx'
import {
  drawBackgroundAndInset,
  drawIslandShape,
  composeMiniIslandFromBlobModule,
} from '../CustomizePreviewHelpers'
import ColorPickerModal from '../ColorPickerModal'

// Mock backgroundBaseCache to observe preload calls (exported as default)
vi.mock('../backgroundBaseCache', () => ({
  default: { preload: vi.fn() },
}))

// Mock tab components to keep tests focused and lightweight
vi.mock('../tabs/BackgroundTab', () => ({
  default: (props) => React.createElement('div', {}, 'BackgroundTab:' + (props.backgroundType || '')),
}))
vi.mock('../tabs/BorderTab', () => ({ default: () => React.createElement('div', {}, 'BorderTab') }))
vi.mock('../tabs/EffectsTab', () => ({ default: () => React.createElement('div', {}, 'EffectsTab') }))
vi.mock('../tabs/FontsTab', () => ({ default: () => React.createElement('div', {}, 'FontsTab') }))

describe('CustomizeSettingsSection helpers', () => {
  beforeEach(() => {
    // Ensure a clean DOM and restore any styles
    document.head.innerHTML = ''
    document.documentElement.style.cssText = ''
    // Provide a fonts.load mock
    if (!document.fonts) document.fonts = {}
    document.fonts.load = vi.fn(() => Promise.resolve())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('registers bundled fonts and applies brand vars', async () => {
    const options = {
      textures: [],
      borderTypes: [],
      i18n: { labels: { 'ui.section.then': 'Then' }, options: { fonts: { Cinzel: '/fonts/Cinzel-BoldItalic-700.ttf', Other: '/assets/Other.ttf' } } },
      backendOptions: { fonts: { Cinzel: '/fonts/Cinzel-BoldItalic-700.ttf', Other: '/assets/Other.ttf' } },
    }
    const values = { preview: null, fileObj: null, currentSource: null }
    const handlers = {
      setTextureRef: () => {},
      setBackgroundType: () => {},
      notifyManualChange: () => {},
      handleGenerateAndSaveNort: () => {},
      handleDownloadMap: () => {},
      openPreviewModal: () => {},
    }

    render(<CustomizeSettingsSection values={values} handlers={handlers} options={options} ui={{ loading: false }} />)

    // Style element should be created for bundled fonts
    const style = document.getElementById('nortantis-bundled-fonts')
    expect(style).toBeTruthy()
    expect(style.textContent).toContain('@font-face')
    expect(style.textContent).toContain('"Cinzel"')

    // Brand CSS variables set
    expect(document.documentElement.style.getPropertyValue('--brand-font-family')).toBe('"Cinzel"')

    // document.fonts.load should have been called for the bundled family
    expect(document.fonts.load).toHaveBeenCalled()
  })

  it('removes existing bundled style when fonts are cleared', async () => {
    const optionsA = { textures: [], borderTypes: [], i18n: { labels: { 'ui.section.then': 'Then' }, options: { fonts: { Test: '/fonts/Test.ttf' } } }, backendOptions: { fonts: { Test: '/fonts/Test.ttf' } } }
    const optionsB = { textures: [], borderTypes: [], i18n: { labels: { 'ui.section.then': 'Then' }, options: { fonts: null } }, backendOptions: { fonts: null } }
    const values = { preview: null, fileObj: null, currentSource: null }
    const handlers = { setTextureRef: () => {}, setBackgroundType: () => {}, notifyManualChange: () => {}, handleGenerateAndSaveNort: () => {}, handleDownloadMap: () => {}, openPreviewModal: () => {} }

    const { rerender } = render(<CustomizeSettingsSection values={values} handlers={handlers} options={optionsA} ui={{ loading: false }} />)
    expect(document.getElementById('nortantis-bundled-fonts')).toBeTruthy()

    // Rerender with fonts cleared
    rerender(<CustomizeSettingsSection values={values} handlers={handlers} options={optionsB} ui={{ loading: false }} />)
    expect(document.getElementById('nortantis-bundled-fonts')).toBeNull()
  })

  it('splits translated labels containing <br> into nodes', async () => {
    const options = { textures: [], borderTypes: [], i18n: { labels: { 'ui.title.customize': 'Line1<br/>Line2', 'ui.subtitle.customize': 'Sub' }, options: {} }, backendOptions: {} }
    const values = { preview: null, fileObj: null, currentSource: null }
    const handlers = { setTextureRef: () => {}, setBackgroundType: () => {}, notifyManualChange: () => {}, handleGenerateAndSaveNort: () => {}, handleDownloadMap: () => {}, openPreviewModal: () => {} }

    const { container } = render(<CustomizeSettingsSection values={values} handlers={handlers} options={options} ui={{ loading: false }} />)
    // The header should contain a <br> element between the lines
    const header = container.querySelector('h3')
    expect(header).toBeTruthy()
    // should have two child nodes (text + br + text) -> length >= 2
    expect(header.childNodes.length).toBeGreaterThanOrEqual(2)
  })

  it('preloads background bases including fractal type', async () => {
    backgroundBaseCache.preload.mockClear()
    const textures = [{ artPack: 'ap', name: 't1' }, { artPack: 'ap', name: 't2' }]
    const backgroundTypes = [{ value: 'SomeFractal' }, { value: 'Other' }]
    const options = { textures, borderTypes: [], i18n: { labels: { 'ui.section.then': 'Then' }, options: { backgroundTypes } }, backendOptions: { backgroundTypes } }
    const values = { preview: null, fileObj: null, currentSource: null }
    const handlers = { setTextureRef: () => {}, setBackgroundType: () => {}, notifyManualChange: () => {}, handleGenerateAndSaveNort: () => {}, handleDownloadMap: () => {}, openPreviewModal: () => {} }

    render(<CustomizeSettingsSection values={values} handlers={handlers} options={options} ui={{ loading: false }} />)
    // backgroundBaseCache.preload should be called for candidates
    expect(backgroundBaseCache.preload).toHaveBeenCalled()
    const calls = backgroundBaseCache.preload.mock.calls.flat()
    expect(calls.some((p) => p.type && /Fractal/i.test(p.type))).toBeTruthy()
  })
})

test('drawBackgroundAndInset calls expected ctx methods', () => {
  const calls = {}
  const ctx = {
    save: () => {
      calls.saved = true
    },
    drawImage: () => {
      calls.drawn = true
    },
    fillRect: () => {
      calls.filled = true
    },
    restore: () => {
      calls.restored = true
    },
  }
  drawBackgroundAndInset({ ctx, img: {}, w: 10, h: 10, x: 1, y: 1, boxW: 4, boxH: 4 })
  expect(calls.saved).to.equal(true)
  expect(calls.drawn).to.equal(true)
  expect(calls.filled).to.equal(true)
  expect(calls.restored).to.equal(true)
})

test('drawIslandShape fills when no pattern available', () => {
  const called = {}
  const ctx = {
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => {
      called.filled = true
    },
    createPattern: () => null,
  }
  const rng = () => 0.5
  drawIslandShape({
    ctx,
    rng,
    cx: 10,
    cy: 10,
    baseRadius: 8,
    xRadius: 8,
    yRadius: 8,
    boxW: 10,
    boxH: 10,
    x: 0,
    y: 0,
  })
  expect(called.filled).to.equal(true)
})

test('drawIslandShape draws pattern and strokes when pattern present', () => {
  const calls = {}
  const ctx = {
    beginPath: () => {
      calls.begin = true
    },
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    save: () => {
      calls.saved = true
    },
    clip: () => {
      calls.clipped = true
    },
    fillRect: () => {
      calls.fillRect = true
    },
    restore: () => {
      calls.restored = true
    },
    stroke: () => {
      calls.stroked = true
    },
    createPattern: () => 'pattern',
    set fillStyle(v) {
      calls.fillStyle = v
    },
    set globalCompositeOperation(v) {
      calls.gco = v
    },
  }
  const rng = () => 0.5
  drawIslandShape({
    ctx,
    rng,
    cx: 10,
    cy: 10,
    baseRadius: 8,
    xRadius: 8,
    yRadius: 8,
    boxW: 10,
    boxH: 10,
    x: 0,
    y: 0,
    coastlineWidth: 2,
  })
  expect(calls.saved).to.equal(true)
  expect(calls.clipped).to.equal(true)
  expect(calls.fillRect).to.equal(true)
  expect(calls.stroked).to.equal(true)
})

test('composeMiniIslandFromBlobModule returns a Blob using overrides', async () => {
  // stub createImageBitmap
  globalThis.createImageBitmap = async (b) => ({ width: 20, height: 20 })

  const fakeCanvas = {
    toBlob(cb) {
      cb(new Blob(['ok']))
    },
  }
  const makeCanvas = () => ({ canvas: fakeCanvas, ctx: {}, w: 20, h: 20 })
  const prepare = async () => ({ displayBitmap: {}, landBitmap: {} })
  const blob = await composeMiniIslandFromBlobModule(
    new Blob(['x']),
    {},
    {},
    {},
    {
      makeCanvasForBitmap: makeCanvas,
      prepareBitmaps: prepare,
      drawBackgroundAndInset: () => {},
      drawIslandShape: () => {},
    }
  )
  expect(blob instanceof Blob).to.equal(true)
})

test('ColorPickerModal renders children when open and closes on Escape and outside click', () => {
  const onClose = vi.fn()
  render(
    <ColorPickerModal open={true} onClose={onClose}>
      <div>inner</div>
    </ColorPickerModal>
  )
  // simulate Escape
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  // simulate mousedown outside by dispatching on document (not inside element)
  document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

  expect(onClose.mock.calls.length).to.be.at.least(1)
})
