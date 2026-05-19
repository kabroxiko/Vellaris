import { describe, it, expect } from 'vitest'
import {
  applyGridAndColoringHoisted,
  applyBordersFrayedAndGrungeHoisted,
} from '../GenerateForm.appliers'

describe('GenerateForm grid/coloring and borders/fray appliers', () => {
  it('applyGridAndColoringHoisted maps grid size and color options', () => {
    const parsed = {}
    const ctx = {
      drawGridOverlay: true,
      gridOverlayRowOrColCount: '32',
      gridOverlayColorHex: '#ff00ff',
      gridOverlayLineWidth: '2',
      gridOverlayLayer: 'above',
      gridOverlayXOffset: '1',
      gridOverlayYOffset: '2',
      mergeColor: (out, key, hex, alphaPct) => {
        if (hex) out[key] = { hex, alphaPct }
      },
      parseBooleanWithDefault: (v, d = false) => (v === undefined ? d : Boolean(v)),
      // provide land coloring resolver expected by the hoisted applier
      resolveLandColoringMethod: () => null,
      finalLandColoringMethod: null,
      getGridOverlayAlpha: () => 50,
    }

    applyGridAndColoringHoisted(parsed, ctx)
    expect(parsed.drawGridOverlay).toBe(true)
    expect(parsed.gridOverlayRowOrColCount).toBe(32)
    expect(typeof parsed.gridOverlayColor).toBe('string')
    expect(parsed.gridOverlayLineWidth).toBe(2)
    expect(parsed.gridOverlayLayer).toBe('above')
    expect(parsed.gridOverlayXOffset).toBe('1')
    expect(parsed.gridOverlayYOffset).toBe('2')
  })

  it('applyBordersFrayedAndGrungeHoisted sets border widths and flags', () => {
    const parsed = {}
    const ctx = {
      borderWidth: '2',
      borderPosition: 'inside',
      borderColorOption: 'solid',
      borderColorHex: '#001122',
      frayedBorder: true,
      frayedBorderBlurLevel: '4',
      frayedBorderSize: '7',
      frayedBorderSeed: '11',
      drawGrunge: true,
      grungeWidth: '30',
      frayedBorderColorHex: '#001122',
      mergeColor: (out, key, hex) => {
        if (hex) out[key] = hex
      },
    }

    applyBordersFrayedAndGrungeHoisted(parsed, ctx)
    expect(parsed.borderWidth).toBe(2)
    expect(parsed.borderPosition).toBe('inside')
    expect(parsed.borderColor).toBe('#001122')
    expect(parsed.frayedBorder).toBe(true)
    expect(parsed.frayedBorderBlurLevel).toBe(4)
    expect(parsed.frayedBorderSize).toBe(7)
    expect(parsed.frayedBorderSeed).toBe(11)
    expect(parsed.drawGrunge).toBe(true)
    expect(parsed.grungeWidth).toBe(30)
  })
})
