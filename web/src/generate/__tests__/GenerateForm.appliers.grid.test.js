import { vi } from 'vitest'

vi.mock('../utils', () => ({
  formatColorString: vi.fn((hex, op) => `fmt:${hex}:${op}`),
  colorToHexWithAlpha: vi.fn((hex, alpha) => {
    if (!hex) return null
    const h = String(hex)
    if (alpha === undefined || alpha === null) return `${h}ff`
    const a = Number(alpha)
    return `${h}${a.toString(16).padStart(2, '0')}`
  }),
  colorToHex: vi.fn((hex) => (hex ? String(hex) : null)),
}))
vi.mock('../sharedHelpers', () => ({
  hexToRgbaString: vi.fn((hex, alpha) => `rgba(${hex},${alpha})`),
}))

import {
  applyGridAndColoringHoisted,
  mergeColor as moduleMergeColor,
} from '../GenerateForm.appliers'

describe('applyGridAndColoringHoisted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies region boundary via ctx.mergeColor and formats ocean/land colors, sets grid overlay color alpha', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'Dashed',
      regionBoundaryWidth: '2',
      regionBoundaryColor: '#112233',
      drawRegionBoundaries: 'true',
      colorizeLand: '1',
      colorizeOcean: '1',
      oceanColor: '#445566',
      landColor: '#778899',
      drawGridOverlay: true,
      gridOverlayShape: 'Square',
      gridOverlayRowOrColCount: '10',
      gridOverlayColor: '#aabbcc',
      gridOverlayXOffset: '5',
      gridOverlayYOffset: '6',
      gridOverlayLineWidth: '1',
      gridOverlayLayer: 'top',
      drawVoronoiGridOverlayOnlyOnLand: 'false',
      resolveLandColoringMethod: () => 'ColorPoliticalRegions',
      finalLandColoringMethod: 'whatever',
      // delegate to the module mergeColor so the formatting path is used
      mergeColor: moduleMergeColor,
      getGridOverlayAlpha: () => 123,
    }

    applyGridAndColoringHoisted(parsed, ctx)

    // region boundary
    expect(parsed.regionBoundaryStyle.type).to.equal('Dashed')
    expect(parsed.regionBoundaryStyle.width).to.equal(2)
    // module mergeColor (delegated) now returns combined hex with alpha
    expect(parsed.regionBoundaryColor).to.equal('#112233ff')

    // ocean and land colors use formatter (mock returns fmt:...)
    expect(parsed.oceanColor).to.equal('fmt:#445566:100')
    expect(parsed.landColor).to.equal('fmt:#778899:100')

    // grid overlay color uses combined hex with alpha (123 -> 0x7b)
    expect(parsed.gridOverlayColor).to.equal('#aabbcc7b')

    // drawRegionColors set from resolved method
    expect(parsed.drawRegionColors).to.equal(true)
  })
})
