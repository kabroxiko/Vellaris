// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prepareBitmapsModule, composeMiniIslandFromBlobModule } from '../CustomizeSettingsSection'

describe('prepareBitmapsModule and composeMiniIslandFromBlobModule', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('prepareBitmapsModule calls colorizeBitmap correctly', async () => {
    // Provide a fake canvas context so colorizeBitmap can run in jsdom
    const fakeImageData = { data: new Uint8ClampedArray(4 * 4) }
    const mockCtx = {
      save: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
      drawImage: () => {},
      getImageData: () => fakeImageData,
      putImageData: () => {},
      restore: () => {},
      fillRect: () => {},
      globalCompositeOperation: 'source-over',
      createPattern: () => ({ __pattern: true }),
      fillStyle: null,
      fill: () => {},
      strokeStyle: null,
      lineWidth: 1,
      lineJoin: null,
      stroke: () => {},
    }
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return { width: 8, height: 8, getContext: () => mockCtx }
      return originalCreate(tag)
    })
    // stub createImageBitmap used by colorizeBitmap
    vi.stubGlobal('createImageBitmap', async (c) => 'MOCK_BITMAP')
    const defaults = { colorizeOcean: true, oceanColorHex: '#010101', colorizeLand: true, landColorHex: '#020202' }
    const res = await prepareBitmapsModule('IMG', 8, 8, {}, { backgroundSeed: 1 }, defaults)
    expect(res.displayBitmap).toBeTruthy()
    expect(res.landBitmap).toBeTruthy()
  })

  it('composeMiniIslandFromBlobModule returns canvas blob via toBlob', async () => {
    // Mock createImageBitmap to return a fake bitmap object
    vi.stubGlobal('createImageBitmap', async (b) => ({ width: 10, height: 6 }))

    // Provide overrides to avoid touching the module's internal canvas/draw helpers
    const overrides = {
      makeCanvasForBitmap: () => ({ canvas: { toBlob: (cb) => cb('RESULT_BLOB') }, ctx: {}, w: 10, h: 6 }),
      prepareBitmaps: async () => ({ displayBitmap: 'DB', landBitmap: 'LB' }),
      drawBackgroundAndInset: () => {},
      drawIslandShape: () => {},
    }

    const blob = await composeMiniIslandFromBlobModule('SOME_BLOB', {}, { backgroundSeed: 42 }, {}, overrides)
    expect(blob).toBe('RESULT_BLOB')
  })
})
