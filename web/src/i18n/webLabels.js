import enLabels from './labels/en'
import esLabels from './labels/es'
import ruLabels from './labels/ru'
import deLabels from './labels/de'
import frLabels from './labels/fr'
import ptLabels from './labels/pt'
import zhLabels from './labels/zh'

const WEB_LABELS = {
  en: enLabels,
  es: esLabels,
  ru: ruLabels,
  de: deLabels,
  fr: frLabels,
  pt: ptLabels,
  zh: zhLabels,
}

export function getFrontendLabels(language) {
  const code = (language || 'en').slice(0, 2).toLowerCase()
  const localized = WEB_LABELS[code] || {}
  return {
    ...WEB_LABELS.en,
    ...localized,
  }
}
