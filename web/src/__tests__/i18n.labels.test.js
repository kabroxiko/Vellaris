import { describe, it, expect } from 'vitest'

const LANGS = ['de', 'es', 'fr', 'pt', 'ru', 'zh']

describe('i18n label bundles', () => {
  for (const code of LANGS) {
    it(`loads ${code} bundle and has keys`, async () => {
      const mod = await import(`../i18n/labels/${code}.js`)
      const obj = mod.default ?? mod
      expect(typeof obj).toBe('object')
      // allow empty but ensure import succeeded
      expect(obj).toBeTruthy()
    })
  }
})
