import { describe, it, expect } from 'vitest'
import BackgroundTab from '../tabs/BackgroundTab'
import BorderTab from '../tabs/BorderTab'
import EffectsTab from '../tabs/EffectsTab'
import FontsTab from '../tabs/FontsTab'

describe('tabs auto exports', () => {
  it('default exports are functions', () => {
    expect(typeof BackgroundTab).toBe('function')
    expect(typeof BorderTab).toBe('function')
    expect(typeof EffectsTab).toBe('function')
    expect(typeof FontsTab).toBe('function')
  })
})
