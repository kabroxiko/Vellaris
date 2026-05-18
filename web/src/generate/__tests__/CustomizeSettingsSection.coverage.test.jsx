import { expect } from 'chai'
import { vi } from 'vitest'
import {
  makeCanvasForBitmap,
  fetchPreviewBlob,
  prepareBitmapsModule,
  colorizeBitmap,
} from '../CustomizeSettingsSection.jsx'

import backgroundBaseCache from '../backgroundBaseCache'

test('makeCanvasForBitmap returns canvas and context sized to bitmap', () => {
  const originalCreate = document.createElement
  // stub canvas creation to provide a dummy 2D context
  document.createElement = (tag) => {
    if (tag === 'canvas') {
      const c = { width: 7, height: 9 }
      c.getContext = () => ({})
      return c
    }
    return originalCreate.call(document, tag)
  }

  const bmp = { width: 7, height: 9 }
  const { canvas, ctx, w, h } = makeCanvasForBitmap(bmp)
  expect(w).to.equal(7)
  expect(h).to.equal(9)
  expect(canvas).to.exist
  expect(ctx).to.exist

  document.createElement = originalCreate
})

test('fetchPreviewBlob uses backgroundBaseCache and returns blob', async () => {
  const payload = { foo: 'bar' }
  const fakeBlob = new Blob(['ok'])
  const preloadSpy = vi.spyOn(backgroundBaseCache, 'preload').mockImplementation(() => {})
  const getSpy = vi.spyOn(backgroundBaseCache, 'get').mockResolvedValue(fakeBlob)

  const res = await fetchPreviewBlob(payload)
  expect(preloadSpy.mock.calls.length).to.be.at.least(1)
  expect(getSpy.mock.calls.length).to.be.at.least(1)
  expect(res).to.equal(fakeBlob)

  preloadSpy.mockRestore()
  getSpy.mockRestore()
})

test('prepareBitmapsModule calls colorizeBitmap appropriately', async () => {
  // stub document.createElement to provide a usable 2D context for colorizeBitmap
  const originalCreate = document.createElement
  document.createElement = (tag) => {
    if (tag === 'canvas') {
      const c = { width: 4, height: 4 }
      c.getContext = () => ({
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4 * 4 * 4) }),
        putImageData: () => {},
      })
      return c
    }
    return originalCreate.call(document, tag)
  }

  // ensure createImageBitmap exists so colorizeBitmap can complete if invoked
  const origCIB = globalThis.createImageBitmap
  globalThis.createImageBitmap = vi.fn().mockResolvedValue('ib')
  const img = {}
  const res = await prepareBitmapsModule(
    img,
    4,
    4,
    { colorizeOcean: true, colorizeLand: true },
    { backgroundType: '' },
    { colorizeLand: false }
  )
  // both displayBitmap and landBitmap should be produced
  expect(res.displayBitmap).to.exist
  expect(res.landBitmap).to.exist
  // restore createImageBitmap
  if (origCIB === undefined) delete globalThis.createImageBitmap
  else globalThis.createImageBitmap = origCIB
  if (globalThis.createImageBitmap !== undefined) delete globalThis.createImageBitmap
  document.createElement = originalCreate
})

test('colorizeBitmap runs and returns createImageBitmap result (stubbed)', async () => {
  const originalCreate = document.createElement
  // stub canvas and context so drawImage/getImageData/putImageData work
  document.createElement = (tag) => {
    if (tag === 'canvas') {
      const c = { width: 2, height: 2 }
      c.getContext = () => ({
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(2 * 2 * 4) }),
        putImageData: () => {},
      })
      return c
    }
    return originalCreate.call(document, tag)
  }

  const fakeIB = { ok: true }
  const origCreateImageBitmap = globalThis.createImageBitmap
  globalThis.createImageBitmap = vi.fn().mockResolvedValue(fakeIB)

  const result = await colorizeBitmap(
    {
      /* fake sourceBitmap */
    },
    '#ff0000',
    2,
    2,
    { backgroundType: '' },
    { preserveTexture: 0 }
  )
  expect(result).to.equal(fakeIB)

  // restore
  if (origCreateImageBitmap === undefined) delete globalThis.createImageBitmap
  else globalThis.createImageBitmap = origCreateImageBitmap
  if (globalThis.createImageBitmap !== undefined) delete globalThis.createImageBitmap
  document.createElement = originalCreate
})
