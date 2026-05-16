import { describe, it, expect } from 'vitest'
import BackgroundTab from '../tabs/BackgroundTab'

describe('BackgroundTab module', () => {
  it('exports a component function', () => {
    expect(typeof BackgroundTab).toBe('function')
  })
})
