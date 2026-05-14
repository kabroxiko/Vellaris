import * as cache from './backgroundBaseCache'
import { describe, it, expect } from 'vitest'

describe('backgroundBaseCache module', () => {
  it('loads and exposes keys', () => {
    expect(cache).toBeTruthy()
    const keys = Object.keys(cache)
    expect(keys.length).toBeGreaterThan(0)
  })
})
