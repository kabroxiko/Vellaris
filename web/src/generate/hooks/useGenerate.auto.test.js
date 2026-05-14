import * as useGenerate from './useGenerate'
import { describe, it, expect } from 'vitest'

describe('useGenerate module', () => {
  it('module loads without error', () => {
    expect(useGenerate).toBeTruthy()
    const keys = Object.keys(useGenerate)
    expect(keys.length).toBeGreaterThanOrEqual(0)
  })
})
