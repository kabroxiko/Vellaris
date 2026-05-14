import App from './App'
import { describe, it, expect } from 'vitest'

describe('App module', () => {
  it('imports without error', () => {
    expect(App).toBeTruthy()
  })
})
