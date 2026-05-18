import { describe, it, expect } from 'vitest'
import {
  pickDefaultTexture,
  resolveRawTextureRef,
  buildPreviewPayload,
} from '../CustomizeSettingsSection'

describe('CustomizeSettingsSection payload helpers', () => {
  it('pickDefaultTexture prefers cityIconTypesByPack when present', () => {
    const cityIconTypesByPack = { packA: ['city1', 'city2'], packB: ['city3'] }
    const textures = [{ artPack: 'Tpack', name: 'tex1' }]
    const out = pickDefaultTexture(textures, cityIconTypesByPack)
    expect(out).toEqual({ artPack: 'packA', cityIconType: 'city1' })
  })

  it('pickDefaultTexture falls back to textures list', () => {
    const textures = [{ artPack: 'Tpack', name: 'tex1' }]
    const out = pickDefaultTexture(textures, {})
    expect(out).toEqual({ artPack: 'Tpack', cityIconType: 'tex1' })
  })

  it('resolveRawTextureRef returns parsed pack|name pair when provided', () => {
    const textures = [{ artPack: 'A', name: 'n' }]
    const out = resolveRawTextureRef('A|n', textures)
    expect(out).toEqual({ artPack: 'A', cityIconType: 'n' })
  })

  it('resolveRawTextureRef returns split values when not found in textures', () => {
    const textures = [{ artPack: 'X', name: 'y' }]
    const out = resolveRawTextureRef('P|Q', textures)
    expect(out).toEqual({ artPack: 'P', cityIconType: 'Q' })
  })

  it('resolveRawTextureRef returns cityIconType when rawRef has no |', () => {
    const out = resolveRawTextureRef('justA')
    expect(out).toEqual({ cityIconType: 'justA' })
  })

  it('buildPreviewPayload adds default width/height and merges previewFields', () => {
    const pf = { backgroundType: 'Fractal', finalWidth: 100 }
    const out = buildPreviewPayload(pf, [], {})
    expect(out.width).toBe(520)
    expect(out.height).toBe(170)
    expect(out.finalWidth).toBe(100)
  })

  it('buildPreviewPayload uses pickDefaultTexture when textureRef empty', () => {
    const pf = { backgroundType: 'GeneratedFromTexture', textureRef: '' }
    const textures = [{ artPack: 'P', name: 'n' }]
    const out = buildPreviewPayload(pf, textures, {})
    expect(out.artPack).toBe('P')
    expect(out.cityIconType).toBe('n')
  })

  it('buildPreviewPayload resolves raw texture refs and merges random payloads', () => {
    const pf = { backgroundType: 'GeneratedFromTexture', textureRef: 'A|n' }
    const textures = []
    const cs = { type: 'random', payload: { seed: 123 } }
    const out = buildPreviewPayload(pf, textures, cs)
    expect(out.artPack).toBe('A')
    expect(out.cityIconType).toBe('n')
    expect(out.seed).toBe(123)
  })
})
