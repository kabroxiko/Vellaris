import { describe, it, expect } from 'vitest'
import { setResourceFromRef } from '../GenerateForm'

describe('border helpers', () => {
  it('setResourceFromRef ignores falsy refs and parses valid ones', () => {
    const p = {}
    setResourceFromRef(p, 'borderResource', 'packX|nameY')
    expect(p.borderResource).toEqual({ artPack: 'packX', name: 'nameY' })
    const p2 = {}
    setResourceFromRef(p2, 'foo', '')
    expect(p2.foo).toBeUndefined()
  })
})
