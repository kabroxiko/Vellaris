import { describe, it, expect } from 'vitest'
import BorderTab from '../tabs/BorderTab'

describe('BorderTab module', () => {
  it('exports a component function', () => {
    expect(typeof BorderTab).toBe('function')
  })
})
