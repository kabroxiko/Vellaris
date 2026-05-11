import enLabels from './labels/en'

// Lazy-load other language bundles to avoid bundling all translations
// into the initial frontend payload. Always include English as the
// baseline so untranslated keys still resolve locally.
export async function getFrontendLabels(language) {
  const code = (language || 'en').slice(0, 2).toLowerCase()
  // Only allow known two-letter language codes to avoid unsafe dynamic import paths
  const allowed = new Set(['en', 'de', 'es', 'fr', 'pt', 'ru', 'zh'])
  const safeCode = allowed.has(code) ? code : 'en'
  if (safeCode === 'en') return { ...enLabels }

  const module = await import(/* @vite-ignore */ `./labels/${safeCode}.js`)
  const localized = module?.default ?? {}
  return { ...enLabels, ...localized }
}
