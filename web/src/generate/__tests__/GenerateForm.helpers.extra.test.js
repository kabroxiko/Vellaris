import { describe, it, expect } from 'vitest'
import { parseBooleanWithDefault, scaleSliderValue } from '../GenerateForm'

describe('GenerateForm helpers', () => {
  it('parseBooleanWithDefault prefers mergedRef boolean when uiValue false', () => {
    const mergedRef = { current: { priorKey: true } }
    const result = parseBooleanWithDefault(false, mergedRef, 'priorKey', false)
    expect(result).toBe(true)
  })

  it('scaleSliderValue returns undefined for non-numeric and returns number for numeric', () => {
    expect(scaleSliderValue('not-a-number')).toBeUndefined()
    const v = scaleSliderValue(5)
    expect(typeof v).toBe('number')
    expect(Number.isFinite(v)).toBe(true)
  })
})
