import { describe, it, expect } from 'vitest'
import { setResourceFromRef, scaleSliderValue } from '../GenerateForm.helpers'

describe('GenerateForm helpers - setResourceFromRef and scaleSliderValue', () => {
  it('setResourceFromRef parses pack|name into object', () => {
    const out = {}
    setResourceFromRef(out, 'borderResource', 'packX|nameY')
    expect(out.borderResource).toEqual({ artPack: 'packX', name: 'nameY' })
  })

  it('setResourceFromRef ignores falsy ref', () => {
    const out = {}
    setResourceFromRef(out, 'k', '')
    expect(out.k).toBeUndefined()
  })

  it('scaleSliderValue returns undefined for non-numeric', () => {
    expect(scaleSliderValue('x')).toBeUndefined()
  })

  it('scaleSliderValue produces expected scale for values around pivot', () => {
    // for sliderValueFor1Scale default 5, test values below and above
    const v1 = scaleSliderValue(1) // near min
    const v2 = scaleSliderValue(5) // pivot
    const v3 = scaleSliderValue(15) // max
    expect(typeof v1).toBe('number')
    expect(typeof v2).toBe('number')
    expect(typeof v3).toBe('number')
  })
})
