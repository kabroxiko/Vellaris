import * as settingsAppliers from './settingsAppliers'
import { describe, it, expect } from 'vitest'

describe('settingsAppliers exports', () => {
  it('module exports are present', () => {
    expect(settingsAppliers).toBeTruthy()
    const keys = Object.keys(settingsAppliers)
    expect(keys.length).toBeGreaterThan(0)
  })
})
