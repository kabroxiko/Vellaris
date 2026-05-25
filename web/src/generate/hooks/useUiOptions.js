import { useCallback, useState } from 'react'
import { fetchJson } from '../helpers'
import { getFrontendLabels } from '../../i18n/webLabels'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const cityIconTypesRequestByPack = new Map()
const uiOptionsCache = new Map()

export function populateCityIconTypes(byPack) {
  if (!byPack) return
  for (const pack of Object.keys(byPack)) {
    cityIconTypesRequestByPack.set(pack, Promise.resolve(byPack[pack]))
  }
}

export function loadCityIconTypes(pack) {
  if (!cityIconTypesRequestByPack.has(pack)) {
    cityIconTypesRequestByPack.set(pack, Promise.resolve([]))
  }
  return cityIconTypesRequestByPack.get(pack)
}

export async function loadUiOptions(lang) {
  if (!lang) lang = 'en'
  if (uiOptionsCache.has(lang)) return uiOptionsCache.get(lang)
  const p = fetchJson(`${API_BASE}/ui-options?lang=${encodeURIComponent(lang)}`)
  uiOptionsCache.set(lang, p)
  return p
}

export default function useUiOptions() {
  const [uiI18n, setUiI18n] = useState({ labels: {} })
  const [uiOptions, setUiOptions] = useState({})
  const [uiLoaded, setUiLoaded] = useState(false)
  const [artPacks, setArtPacks] = useState([])
  const [textures, setTextures] = useState([])
  const [borderTypes, setBorderTypes] = useState([])
  const [allBooks, setAllBooks] = useState([])

  const setUiListsFromOptions = useCallback((uiOpts) => {
    setArtPacks(uiOpts?.artPacks)
    setAllBooks(uiOpts?.books)
    setTextures(uiOpts?.textures)
    setBorderTypes(uiOpts?.borderTypes)
  }, [])

  async function mergeAndSetUiI18n(uiOpts, requestLanguage) {
    const frontendLabels = await getFrontendLabels(requestLanguage)
    const backendLabels = uiOpts?.labels
    const mergedLabels = backendLabels ? { ...frontendLabels, ...backendLabels } : frontendLabels
    setUiI18n({ labels: mergedLabels })
    setUiOptions(uiOpts.options ?? {})
  }

  // Initialize UI from server-provided options. Caller may pass callbacks
  // to handle side-effects such as selecting books or loading city icon types.
  async function initializeUiForLanguage(
    lang,
    {
      initialRandomOverrides = {},
      setSelectedBooks,
      booksLoadedRef,
      setArtPack,
      artPack,
      cityIconType,
      handleCityIconTypesLoaded,
      requestLanguage,
    } = {}
  ) {
    const uiOpts = await loadUiOptions(lang)
    if (!uiOpts) return null

    setUiListsFromOptions(uiOpts)

    // compute initial books selection
    // Prefer explicit manual overrides, then server-provided defaults
    const overrideBooks = Array.isArray(initialRandomOverrides.selectedBooks)
      ? initialRandomOverrides.selectedBooks
      : null
    const defsBooks = Array.isArray(uiOpts?.defaults?.books) ? uiOpts.defaults.books : null
    let initialBooks
    if (overrideBooks && overrideBooks.length > 0) initialBooks = new Set(overrideBooks)
    else if (defsBooks && defsBooks.length > 0) initialBooks = new Set(defsBooks)
    else initialBooks = new Set()
    if (booksLoadedRef && setSelectedBooks) {
      booksLoadedRef.current = true
      setSelectedBooks(initialBooks)
    }

    populateCityIconTypes(uiOpts.cityIconTypesByPack)

    // choose art pack and load city icon types
    // Do not pick the first art pack from `options` as a client-side default.
    // Prefer an explicitly provided `artPack`, then server `defaults.artPack`.
    const defsArtPack = uiOpts?.defaults?.artPack ?? null
    const chosenPack = artPack ?? defsArtPack ?? null
    if (!artPack && defsArtPack && setArtPack) setArtPack(defsArtPack)
    const types = await loadCityIconTypes(chosenPack)
    if (handleCityIconTypesLoaded) handleCityIconTypesLoaded(types, cityIconType)

    await mergeAndSetUiI18n(uiOpts, requestLanguage)

    // Note: callers receive `uiOpts` from this function's return value
    // and should apply any server-provided `defaults` themselves. Do
    // not perform automatic default application here.

    setUiLoaded(true)
    return uiOpts
  }

  return {
    uiI18n,
    uiOptions,
    setUiI18n,
    setUiOptions,
    uiLoaded,
    setUiLoaded,
    artPacks,
    setArtPacks,
    textures,
    setTextures,
    borderTypes,
    setBorderTypes,
    allBooks,
    setAllBooks,
    loadUiOptions,
    populateCityIconTypes,
    loadCityIconTypes,
    initializeUiForLanguage,
    uiOptionsCache,
  }
}
