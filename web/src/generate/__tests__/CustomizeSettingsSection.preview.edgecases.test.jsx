import React from 'react'
import { expect, vi, test } from 'vitest'

// We'll test the exported hoisted helpers directly.
import { composeMiniIslandFromBlobModule } from '../CustomizeSettingsSection'

test('composeMiniIslandFromBlobModule rejects when createImageBitmap fails', async () => {
  // make createImageBitmap reject
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.reject(new Error('bad image')))
  )

  await expect(composeMiniIslandFromBlobModule(new Blob())).rejects.toThrow('bad image')
})

test('composeMiniIslandFromBlobModule resolves to null when canvas.toBlob yields null', async () => {
  // stub createImageBitmap to return a minimal bitmap
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 64, height: 64 }))
  )

  // build an override that returns a canvas whose toBlob calls back with null
  const makeCanvasForBitmap = (imgBitmap) => {
    const canvas = {
      width: imgBitmap.width,
      height: imgBitmap.height,
      toBlob(cb) {
        cb(null)
      },
      getContext() {
        return {
          save() {},
          restore() {},
          drawImage() {},
          beginPath() {},
          closePath() {},
          moveTo() {},
          lineTo() {},
          clip() {},
          fillRect() {},
          createPattern: () => null,
          fill() {},
          stroke() {},
          globalCompositeOperation: 'source-over',
        }
      },
    }
    return { canvas, ctx: canvas.getContext(), w: canvas.width, h: canvas.height }
  }

  const overrides = {
    makeCanvasForBitmap,
    prepareBitmaps: async (imgBitmap) => ({ displayBitmap: imgBitmap, landBitmap: imgBitmap }),
    drawBackgroundAndInset: () => {},
    drawIslandShape: () => {},
  }

  const result = await composeMiniIslandFromBlobModule(
    new Blob(['x'], { type: 'image/png' }),
    {},
    {},
    {},
    overrides
  )
  expect(result).toBeNull()
})

test('composeMiniIslandFromBlobModule works when pattern is absent (no throw)', async () => {
  // normal minimal flow where createImageBitmap returns an object
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 32, height: 32 }))
  )

  const makeCanvasForBitmap = (imgBitmap) => {
    const canvas = {
      width: imgBitmap.width,
      height: imgBitmap.height,
      toBlob(cb) {
        cb(new Blob(['ok'], { type: 'image/png' }))
      },
      getContext() {
        return {
          save() {},
          restore() {},
          drawImage() {},
          beginPath() {},
          closePath() {},
          moveTo() {},
          lineTo() {},
          clip() {},
          fillRect() {},
          createPattern: () => null,
          fill() {},
          stroke() {},
          globalCompositeOperation: 'source-over',
        }
      },
    }
    return { canvas, ctx: canvas.getContext(), w: canvas.width, h: canvas.height }
  }

  const overrides = {
    makeCanvasForBitmap,
    prepareBitmaps: async (imgBitmap) => ({ displayBitmap: imgBitmap, landBitmap: imgBitmap }),
    drawBackgroundAndInset: () => {},
    drawIslandShape: () => {},
  }

  const result = await composeMiniIslandFromBlobModule(
    new Blob(['x'], { type: 'image/png' }),
    {},
    {},
    {},
    overrides
  )
  expect(result).toBeInstanceOf(Blob)
})
