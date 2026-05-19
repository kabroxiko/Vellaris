import enLabels from './labels/en'

// Lazy-load other language bundles to avoid bundling all translations
// into the initial frontend payload. Always include English as the
// baseline so untranslated keys still resolve locally.
export async function getFrontendLabels(language) {
  const code = (language || 'en').slice(0, 2).toLowerCase()
  // Only allow known two-letter language codes to avoid unsafe dynamic import paths
  const allowed = new Set(['en', 'de', 'es', 'fr', 'pt', 'ru', 'zh'])
  const safeCode = allowed.has(code) ? code : 'en'
  // Load localized bundle (no fallback merge for the localized store used by toasts)
  if (safeCode === 'en') {
    // also expose localized labels for strict i18n consumers
    if (typeof globalThis !== 'undefined') globalThis.__localizedFrontendLabels = { ...enLabels }
    return { ...enLabels }
  }

  const module = await import(/* @vite-ignore */ `./labels/${safeCode}.js`)
  const localized = module?.default ?? {}
  // expose the localized-only labels for consumers that must not fallback
  if (typeof globalThis !== 'undefined') globalThis.__localizedFrontendLabels = { ...localized }
  // keep returning merged labels for existing UI code to avoid breaking behavior
  return { ...enLabels, ...localized }
}
