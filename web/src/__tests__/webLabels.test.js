import { describe, it, expect } from 'vitest'
import { getFrontendLabels } from '../i18n/webLabels'

describe('getFrontendLabels', () => {
  it('returns English labels for en', async () => {
    const labels = await getFrontendLabels('en')
    expect(labels['ui.generate']).toBe('Generate Random Map')
    expect(labels['ui.upload.hint']).toBe('or drag and drop a settings file here')
  })

  it('falls back to English for unknown or unsafe codes', async () => {
    const labels = await getFrontendLabels('@@/../../')
    expect(labels['ui.generate']).toBe('Generate Random Map')
  })

  it('loads and merges localized bundle for de', async () => {
    const labels = await getFrontendLabels('de')
    // German bundle overrides the Generate label
    expect(labels['ui.generate']).toBe('Zufallskarte generieren')
    // Keys not present in de should still come from English
    expect(labels['theme.styleOptions.label']).toBe('Style options:')
  })
})

describe('webLabels', () => {
  it('getFrontendLabels returns an object for en', async () => {
    const labels = await getFrontendLabels('en')
    expect(typeof labels).toBe('object')
    expect(Object.keys(labels).length).toBeGreaterThan(0)
  })
})
