import Toast from './Toast'
import { describe, it, expect } from 'vitest'

describe('Toast module', () => {
  it('imports without throwing', () => {
    expect(Toast).toBeTruthy()
  })
})
