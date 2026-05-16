import { describe, it, expect } from 'vitest'
import GenerateForm from '../GenerateForm'

describe('GenerateForm module', () => {
  it('exports a component function', () => {
    expect(typeof GenerateForm).toBe('function')
  })
})
