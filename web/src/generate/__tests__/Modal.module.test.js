import { describe, it, expect } from 'vitest'
import Modal from '../../Modal'

describe('Modal module', () => {
  it('exports a component function', () => {
    expect(typeof Modal).toBe('function')
  })
})
