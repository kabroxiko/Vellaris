// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { colorizeBitmap } from '../CustomizeSettingsSection'
import * as shared from '../sharedHelpers'

describe('colorizeBitmap', () => {
  let originalCreateElement

  beforeEach(() => {
    vi.restoreAllMocks()
    originalCreateElement = document.createElement.bind(document)
  })

  it('returns an ImageBitmap (mocked) after colorizing', async () => {
    // mock hexToHSB and hsbToRgb to keep deterministic
    vi.spyOn(shared, 'hexToHSB').mockReturnValue([0.5, 0.5, 0.5])
    vi.spyOn(shared, 'hsbToRgb').mockReturnValue([128, 128, 128])

    // fake canvas context with getImageData/putImageData
    const fakeImageData = { data: new Uint8ClampedArray(4 * 4) }
    const mockCtx = {
      drawImage: () => {},
      getImageData: () => fakeImageData,
      putImageData: () => {},
    }

    // stub document.createElement to return a canvas-like object
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        return {
          width: 4,
          height: 4,
          getContext: () => mockCtx,
        }
      }
      return originalCreateElement(tag)
    })

    // mock createImageBitmap to return a sentinel value
    vi.stubGlobal('createImageBitmap', async (c) => {
      return 'MOCK_IMAGE_BITMAP'
    })

    const result = await colorizeBitmap({/* sourceBitmap not used by our mocks */}, '#abcdef', 4, 4, undefined, { preserveTexture: 0 })
    expect(result).toBe('MOCK_IMAGE_BITMAP')
  })
})
