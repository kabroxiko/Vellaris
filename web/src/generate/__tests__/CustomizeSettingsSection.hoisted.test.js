// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  makeCanvasForBitmap,
  drawBackgroundAndInset,
  drawIslandShape,
} from '../CustomizeSettingsSection'

describe('CustomizeSettingsSection hoisted helpers', () => {
  it('makeCanvasForBitmap returns canvas and dimensions', () => {
    const fakeImg = { width: 16, height: 8 }
    const { canvas, w, h } = makeCanvasForBitmap(fakeImg)
    expect(w).toBe(16)
    expect(h).toBe(8)
    expect(canvas.width).toBe(16)
    expect(canvas.height).toBe(8)
  })

  it('drawBackgroundAndInset calls drawImage and fillRect', () => {
    const calls = []
    const mockCtx = {
      save: () => calls.push('save'),
      drawImage: (img, x, y, w, h) => calls.push(['drawImage', img, x, y, w, h]),
      fillRect: (x, y, w, h) => calls.push(['fillRect', x, y, w, h]),
      restore: () => calls.push('restore'),
    }
    const opts = { ctx: mockCtx, img: 'IMG', w: 20, h: 10, x: 2, y: 3, boxW: 6, boxH: 4 }
    drawBackgroundAndInset(opts)
    expect(calls[0]).toBe('save')
    expect(calls.some((c) => Array.isArray(c) && c[0] === 'drawImage')).toBeTruthy()
    expect(calls.some((c) => Array.isArray(c) && c[0] === 'fillRect')).toBeTruthy()
    expect(calls.at(-1)).toBe('restore')
  })

  it('drawIslandShape creates a pattern and strokes when coastline present', () => {
    const called = []
    const mockCtx = {
      beginPath: () => called.push('begin'),
      moveTo: (x, y) => called.push(['moveTo', x, y]),
      lineTo: (x, y) => called.push(['lineTo', x, y]),
      closePath: () => called.push('close'),
      save: () => called.push('save'),
      clip: () => called.push('clip'),
      fillRect: (x, y, w, h) => called.push(['fillRect', x, y, w, h]),
      restore: () => called.push('restore'),
      globalCompositeOperation: 'source-over',
      createPattern: (bmp, mode) => {
        called.push(['createPattern', bmp, mode])
        return {} // truthy pattern
      },
      fillStyle: null,
      fill: () => called.push('fill'),
      strokeStyle: null,
      lineWidth: 0,
      lineJoin: null,
      stroke: () => called.push('stroke'),
    }

    const rng = () => 0.5
    const opts = {
      ctx: mockCtx,
      rng,
      cx: 50,
      cy: 50,
      baseRadius: 20,
      xRadius: 25,
      yRadius: 20,
      boxW: 40,
      boxH: 40,
      x: 10,
      y: 10,
      landBitmap: 'LANDBMP',
      displayBitmap: 'DISP',
      imgBitmap: 'IMG',
    }

    drawIslandShape(opts)
    expect(called.some((c) => Array.isArray(c) && c[0] === 'createPattern')).toBeTruthy()
    // stroke should be called because computedDefaultWidth >=1
    expect(called.includes('stroke')).toBeTruthy()
  })
})
