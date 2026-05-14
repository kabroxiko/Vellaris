import * as helpers from '../helpers'
import { describe, it, expect } from 'vitest'

describe('helpers module', () => {
  it('exports utilities', () => {
    expect(helpers).toBeTruthy()
    const names = Object.keys(helpers)
    expect(names.length).toBeGreaterThan(0)
  })
})
