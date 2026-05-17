import { vi } from 'vitest'


vi.mock('../utils', () => ({ formatColorString: vi.fn((hex, op) => `fmt:${hex}:${op}`) }))
vi.mock('../sharedHelpers', () => ({ hexToRgbaString: vi.fn((hex, alpha) => `rgba(${hex},${alpha})`) }))

import { applyGridAndColoringHoisted, mergeColor as moduleMergeColor } from '../GenerateForm.appliers'

describe('applyGridAndColoringHoisted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies region boundary via ctx.mergeColor and formats ocean/land colors, sets grid overlay color alpha', () => {
    const parsed = {}
    const ctx = {
      regionBoundaryStyle: 'Dashed',
      regionBoundaryWidth: '2',
      regionBoundaryColorHex: '#112233',
      drawRegionBoundaries: 'true',
      colorizeLand: '1',
      colorizeOcean: '1',
      oceanColorHex: '#445566',
      landColorHex: '#778899',
      drawGridOverlay: true,
      gridOverlayShape: 'Square',
      gridOverlayRowOrColCount: '10',
      gridOverlayColorHex: '#aabbcc',
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
    // module mergeColor (delegated) will use hexToRgbaString for non-formatter call
    expect(parsed.regionBoundaryColor).to.equal('rgba(#112233,255)')

    // ocean and land colors use formatter (mock returns fmt:...)
    expect(parsed.oceanColor).to.equal('fmt:#445566:100')
    expect(parsed.landColor).to.equal('fmt:#778899:100')

    // grid overlay color uses hexToRgbaString with alpha
    expect(parsed.gridOverlayColor).to.equal('rgba(#aabbcc,123)')

    // drawRegionColors set from resolved method
    expect(parsed.drawRegionColors).to.equal(true)
  })
})
