import { describe, it, expect } from 'vitest'
import BBC from '../backgroundBaseCache'

describe('backgroundBaseCache module', () => {
  it('exports get, preload, clear functions', () => {
    expect(BBC).toBeDefined()
    expect(typeof BBC.get).toBe('function')
    expect(typeof BBC.preload).toBe('function')
    expect(typeof BBC.clear).toBe('function')
  })

  it('clear can be invoked safely', () => {
    expect(() => BBC.clear()).not.toThrow()
  })
})
