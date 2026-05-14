import { describe, it, expect } from 'vitest'
import { getFrontendLabels } from '../i18n/webLabels'

describe('webLabels', () => {
  it('getFrontendLabels returns an object for en', async () => {
    const labels = await getFrontendLabels('en')
    expect(typeof labels).toBe('object')
    expect(Object.keys(labels).length).toBeGreaterThan(0)
  })
})
