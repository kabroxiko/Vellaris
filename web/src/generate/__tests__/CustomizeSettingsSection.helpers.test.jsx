import React from 'react'
import { vi } from 'vitest'
import { render } from '@testing-library/react'

import {
  drawBackgroundAndInset,
  drawIslandShape,
  composeMiniIslandFromBlobModule,
  ColorPickerModal,
} from '../CustomizeSettingsSection.jsx'

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
