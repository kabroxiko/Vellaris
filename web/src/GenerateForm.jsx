import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import CustomizeSettingsSection from './generate/CustomizeSettingsSection'
import RandomSettingsSection from './generate/RandomSettingsSection'
import { base64ToBlob, formatColorString, colorToHex, colorToAlphaPercent, parseColorChannels } from './generate/utils'
import { selectCityIconType, fetchJson, handleResponseError, appendIfSet, tryParseJson as tryParse } from './generate/helpers'
import { downloadNortContent } from './generate/responseHandlers'
import { createSettingsAppliers } from './generate/settingsAppliers'
import { getFrontendLabels } from './i18n/webLabels'
const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const RANDOM_OVERRIDES_STORAGE_KEY = 'vellaris-random-manual-overrides'
const CUSTOMIZE_OVERRIDES_STORAGE_KEY = 'vellaris-customize-overrides'
const cityIconTypesRequestByPack = new Map()
const uiOptionsCache = new Map()

function serializeNortObject(obj) {
  function sortRec(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const keys = Object.keys(v).sort()
      const out = {}
      for (const k of keys) out[k] = sortRec(v[k])
      return out
    }
    if (Array.isArray(v)) return v.map(sortRec)
    return v
  }

  try {
    return JSON.stringify(sortRec(obj), null, 2)
  } catch (e) {
    if (typeof console !== 'undefined' && typeof console.debug === 'function')
      console.debug('serializeNortObject: JSON stringify failed, falling back to raw stringify', e)
    try {
      return JSON.stringify(obj)
    } catch (err) {
      return String(obj)
    }
  }
}

function deriveNortFilenameFromContent(nortContent) {
  try {
    let parsed = null
    if (typeof nortContent === 'string') parsed = tryParse(nortContent)
    else parsed = nortContent
    if (!parsed || !parsed.edits) return null
    const textList = Array.isArray(parsed.edits.textEdits)
      ? parsed.edits.textEdits
      : Array.isArray(parsed.edits.text)
      ? parsed.edits.text
      : null
    if (!Array.isArray(textList)) return null
    for (const t of textList) {
      const tType = t && (t.type || t.typeName || t.Type)
      const tText = t && (t.text || t.value || t.Text)
      if (tType === 'Title' && typeof tText === 'string' && tText.trim()) return tText.trim()
    }
  } catch (e) {
    if (typeof console !== 'undefined' && console.debug) console.debug('deriveNortFilenameFromContent: parse failed', e)
  }
  return null
}

function sanitizeFilenameBase(name, fallback) {
  try {
    let s = String(name || '')
    s = s.trim()
    s = s.replace(/[\\/:*?"<>|]+/g, '-')
    s = s.replace(/\s+/g, '-')
    if (s) return s
  } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('sanitizeFilenameBase: error sanitizing', e) }
  return fallback || 'vellaris-map'
}

function safeDebugLog(functionName, message, error) {
  if (typeof console !== 'undefined' && console.debug) {
    console.debug(`${functionName}: ${message}`, error)
  }
}

// `tryParse` is imported from shared helpers to centralize parsing logic.

// Build the customize-panel payload from a values object.
function buildCustomizePayload(values) {
  return {
    backgroundType: values.backgroundType,
    textureRef: values.textureRef,
    backgroundSeed: values.backgroundSeed,
    drawRegionBoundaries: values.drawRegionBoundaries,
    colorizeLand: values.colorizeLand,
    colorizeOcean: values.colorizeOcean,
    oceanColorHex: values.oceanColorHex,
    landColorHex: values.landColorHex,
    regionBoundaryStyle: values.regionBoundaryStyle,
    regionBoundaryWidth: values.regionBoundaryWidth,
    regionBoundaryColorHex: values.regionBoundaryColorHex,
    drawBorder: values.drawBorder,
    drawGridOverlay: values.drawGridOverlay,
    finalLandColoringMethod: values.finalLandColoringMethod,
    borderRef: values.borderRef,
    borderWidth: values.borderWidth,
    borderPosition: values.borderPosition,
    borderColorOption: values.borderColorOption,
    borderColorHex: values.borderColorHex,
    frayedBorder: values.frayedBorder,
    frayedBorderBlurLevel: values.frayedBorderBlurLevel,
    frayedBorderSize: values.frayedBorderSize,
    frayedBorderSeed: values.frayedBorderSeed,
    drawGrunge: values.drawGrunge,
    grungeWidth: values.grungeWidth,
    frayedBorderColorHex: values.frayedBorderColorHex,
    lineStyle: values.lineStyle,
    coastlineWidth: values.coastlineWidth,
    coastlineColorHex: values.coastlineColorHex,
    coastShadingLevel: values.coastShadingLevel,
    coastShadingColorHex: values.coastShadingColorHex,
    coastShadingAlpha: values.coastShadingAlpha,
    oceanShadingAlpha: values.oceanShadingAlpha,
    oceanShadingLevel: values.oceanShadingLevel,
    oceanShadingColorHex: values.oceanShadingColorHex,
    oceanWavesType: values.oceanWavesType,
    oceanWavesLevel: values.oceanWavesLevel,
    oceanWavesColorHex: values.oceanWavesColorHex,
    oceanWavesAlpha: values.oceanWavesAlpha,
    concentricWaveCount: values.concentricWaveCount,
    fadeConcentricWaves: values.fadeConcentricWaves,
    jitterToConcentricWaves: values.jitterToConcentricWaves,
    brokenLinesForConcentricWaves: values.brokenLinesForConcentricWaves,
    drawOceanEffectsInLakes: values.drawOceanEffectsInLakes,
    riverColorHex: values.riverColorHex,
    drawRoads: values.drawRoads,
    roadStyle: values.roadStyle,
    roadWidth: values.roadWidth,
    roadColorHex: values.roadColorHex,
    mountainSize: values.mountainSize,
    hillSize: values.hillSize,
    duneSize: values.duneSize,
    treeHeight: values.treeHeight,
    citySize: values.citySize,
    drawText: values.drawText,
    titleFontFamily: values.titleFontFamily,
    regionFontFamily: values.regionFontFamily,
    mountainRangeFontFamily: values.mountainRangeFontFamily,
    otherMountainsFontFamily: values.otherMountainsFontFamily,
    citiesFontFamily: values.citiesFontFamily,
    riverFontFamily: values.riverFontFamily,
    textColorHex: values.textColorHex,
    drawBoldBackground: values.drawBoldBackground,
    boldBackgroundColorHex: values.boldBackgroundColorHex,
  }
}

function persistCustomizeOverrides(values) {
  try {
    const payload = buildCustomizePayload(values)
    localStorage.setItem(CUSTOMIZE_OVERRIDES_STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: localStorage persist failed', e)
  }
}

async function loadUiOptions(lang) {
  const key = String(lang || 'default')
  if (uiOptionsCache.has(key)) return uiOptionsCache.get(key)
  const p = (async () => {
    try {
      const url = `${API_BASE}/ui-options?uiLanguage=${encodeURIComponent(lang || 'en')}`
      const j = await fetchJson(url)
      return j
    } catch (e) {
      console.error('Failed to load UI options', e)
      return null
    }
  })()
  uiOptionsCache.set(key, p)
  return p
}
function loadRandomOverrides() {
  try {
    const raw = localStorage.getItem(RANDOM_OVERRIDES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = tryParse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (e) {
    if (typeof console !== 'undefined' && console.debug) console.debug('loadRandomOverrides: failed to parse overrides', e)
    return {}
  }
}

function loadCustomizeOverrides() {
  try {
    const raw = localStorage.getItem(CUSTOMIZE_OVERRIDES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = tryParse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (e) {
    if (typeof console !== 'undefined' && console.debug) console.debug('loadCustomizeOverrides: failed to parse overrides', e)
    return {}
  }
}


function loadCityIconTypes(pack) {
  if (!cityIconTypesRequestByPack.has(pack)) {
    // Do not fetch city icon types independently; rely on `/api/ui-options`
    // which populates `cityIconTypesByPack` during initial UI load. If the
    // pack was not present in the initial response, return an empty list
    // to avoid extra network calls.
    cityIconTypesRequestByPack.set(pack, Promise.resolve([]))
  }
  return cityIconTypesRequestByPack.get(pack)
}
async function readResponseBytesWithProgress(res, onDownloadingStarted) {
  const reader = res.body?.getReader?.()
  onDownloadingStarted?.()

  if (!reader) {
    return new Uint8Array(await res.arrayBuffer())
  }

  let loaded = 0
  const chunks = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      loaded += value.length
    }
  }

  const merged = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

function makeProgressToastController() {
  let progressToastId = null
  const show = (message) => {
    try {
      if (progressToastId) globalThis.hideToast?.(progressToastId)
      progressToastId =
        globalThis.showToast?.(message, {
          type: 'info',
          duration: 0,
          dismissible: false,
          working: true,
        }) ?? null
    } catch (e) {
      console.warn('showToast failed', e)
    }
  }
  const hide = () => {
    try {
      if (progressToastId) globalThis.hideToast?.(progressToastId)
    } catch (e) {
      console.warn('hideToast failed', e)
    }
  }
  return { show, hide }
}

// Small debug hook: logs selected UI values when appliers have run.
function usePostApplierLogger(lastApplierRunRef, deps = []) {
  useEffect(() => {
    try {
      if (!lastApplierRunRef || typeof lastApplierRunRef.current !== 'number') return
      if (lastApplierRunRef.current > 0) {
        // Keep this lightweight and opt-in for developer consoles.
        console.debug('post-applier run', lastApplierRunRef.current, deps)
      }
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('usePostApplierLogger: logging failed', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastApplierRunRef && lastApplierRunRef.current, ...(Array.isArray(deps) ? deps : [])])
}

function GenerateForm({ uiLanguage = 'en' }) {
  const initialRandomOverrides = useMemo(() => loadRandomOverrides(), [])
  // Always start with empty customize overrides so UI resets to backend defaults on load
  const initialCustomize = useMemo(() => ({}), [])
  const [preview, setPreview] = useState(null)
  const [currentSource, setCurrentSource] = useState(null)
  const requestLanguage = uiLanguage
  
  async function handleInitialUiOpts(uiOpts) {
    try {
      setArtPacks(uiOpts.artPacks || [])
      setAllBooks(uiOpts.books || [])
      setTextures(uiOpts.textures || [])
      setBorderTypes(uiOpts.borderTypes || [])
      const defs = uiOpts.defaults || {}

      try {
        const byPack = uiOpts.cityIconTypesByPack || {}
        for (const pack of Object.keys(byPack)) {
          cityIconTypesRequestByPack.set(pack, Promise.resolve(byPack[pack]))
        }
      } catch (e) {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: cityIconTypes enumeration failed', e)
      }

      // Set sensible defaults for Random panel and selected books
      try {
        const overrideBooks = Array.isArray(initialRandomOverrides.selectedBooks)
          ? initialRandomOverrides.selectedBooks
          : null
        const validBooks = overrideBooks ? overrideBooks.filter((b) => (uiOpts.books || []).includes(b)) : null
        const initialBooks = validBooks && validBooks.length > 0 ? new Set(validBooks) : new Set(uiOpts.books || [])
        booksLoadedRef.current = true
        setSelectedBooks(initialBooks)

        const firstArtPack = Array.isArray(uiOpts.artPacks) && uiOpts.artPacks.length > 0 ? uiOpts.artPacks[0] : null
        if (!artPack && firstArtPack) setArtPack(firstArtPack)

        const packToLoad = artPack || firstArtPack || 'nortantis'
        const preferredCityDefault = defs && (defs.cityIconType ?? defs.cityIconSetName) ? String(defs.cityIconType ?? defs.cityIconSetName) : cityIconType
        loadCityIconTypes(packToLoad)
          .then((types) => handleCityIconTypesLoaded(types, preferredCityDefault))
          .catch((e) => {
            if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: loadCityIconTypes failed', e)
          })
      } catch (e) {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: applying defaults failed', e)
      }

      // Merge backend i18n labels with frontend labels
      const frontendLabels = await getFrontendLabels(requestLanguage)
      const backendLabels = uiOpts.labels || {}
      setUiI18n({ labels: { ...frontendLabels, ...backendLabels }, options: uiOpts.options || {} })

      // Apply server option defaults and backend `defaults` so UI resets to canonical backend values on load.
      const opts = uiOpts.options || {}
      if (!backgroundType && Array.isArray(opts.backgroundTypes) && opts.backgroundTypes.length > 0) {
        setBackgroundType(opts.backgroundTypes[0].value)
      }
      if (!finalLandColoringMethod && Array.isArray(opts.finalLandColoringMethods) && opts.finalLandColoringMethods.length > 0) {
        setFinalLandColoringMethod(opts.finalLandColoringMethods[0].value)
      }
      if (!regionBoundaryStyle && Array.isArray(opts.lineStyles) && opts.lineStyles.length > 0) {
        setRegionBoundaryStyle(opts.lineStyles[0].value)
      }
      try {
        if (defs) applyServerDefaults(defs, opts)
      } catch (e) {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: backend defaults inner handler failed', e)
      }

      // Persist the raw backend defaults so we can later force-apply them to the UI once the settings appliers are available.
      lastUiDefaultsRef.current = uiOpts.defaults || null
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('handleInitialUiOpts failed', e)
    }
  }

  // --- Random Map state ---
  const [artPacks, setArtPacks] = useState([])
  const [artPack, setArtPack] = useState(initialRandomOverrides.artPack || '')
  const [dimension, setDimension] = useState(initialRandomOverrides.dimension || '')
  const [worldSize, setWorldSize] = useState(0)
  const [landShape, setLandShape] = useState(initialRandomOverrides.landShape || '')
  const [regionCount, setRegionCount] = useState(0)
  const [landColoringMethod, setLandColoringMethod] = useState(
    initialRandomOverrides.landColoringMethod || ''
  )
  const [cityIconTypes, setCityIconTypes] = useState([])
  const [cityIconType, setCityIconType] = useState(initialRandomOverrides.cityIconType || '')
  const [cityFrequency, setCityFrequency] = useState(0)
  const [allBooks, setAllBooks] = useState([])
  const [selectedBooks, setSelectedBooks] = useState(new Set())
  const [randomSeed, setRandomSeed] = useState('')
  const [mapLanguage, setMapLanguage] = useState(
    initialRandomOverrides.mapLanguage || uiLanguage
  )

  // --- Generate from Settings state ---
  const [fileName, setFileName] = useState('')
  const [fileObj, setFileObj] = useState(null)
  const [finalWidth, setFinalWidth] = useState(0)
  const [finalHeight, setFinalHeight] = useState(0)
  const [finalSeed, setFinalSeed] = useState('')

  // --- Generate from Settings: theme overrides ---
  const [backgroundType, setBackgroundType] = useState(initialCustomize.backgroundType || '')
  const [textures, setTextures] = useState([])
  const [borderTypes, setBorderTypes] = useState([])
  const [textureRef, setTextureRef] = useState(initialCustomize.textureRef || '')
  const [backgroundSeed, setBackgroundSeed] = useState(initialCustomize.backgroundSeed || '')
  const [drawRegionBoundaries, setDrawRegionBoundaries] = useState(
    typeof initialCustomize.drawRegionBoundaries === 'boolean' ? initialCustomize.drawRegionBoundaries : false
  )
  const [colorizeLand, setColorizeLand] = useState(
    typeof initialCustomize.colorizeLand === 'boolean' ? initialCustomize.colorizeLand : false
  )
  const [colorizeOcean, setColorizeOcean] = useState(
    typeof initialCustomize.colorizeOcean === 'boolean' ? initialCustomize.colorizeOcean : false
  )
  const [oceanColorHex, setOceanColorHex] = useState(initialCustomize.oceanColorHex || '')
  const [landColorHex, setLandColorHex] = useState(initialCustomize.landColorHex || '')
  const [regionBoundaryStyle, setRegionBoundaryStyle] = useState(initialCustomize.regionBoundaryStyle || '')
  const [regionBoundaryWidth, setRegionBoundaryWidth] = useState(
    typeof initialCustomize.regionBoundaryWidth === 'number' ? initialCustomize.regionBoundaryWidth : 0
  )
  const [regionBoundaryColorHex, setRegionBoundaryColorHex] = useState(initialCustomize.regionBoundaryColorHex || '')
  const [drawBorder, setDrawBorder] = useState(
    typeof initialCustomize.drawBorder === 'boolean' ? initialCustomize.drawBorder : false
  )
  const [drawGridOverlay, setDrawGridOverlay] = useState(
    typeof initialCustomize.drawGridOverlay === 'boolean' ? initialCustomize.drawGridOverlay : false
  )
  const [gridOverlayShape, setGridOverlayShape] = useState(initialCustomize.gridOverlayShape || '')
  const [gridOverlayRowOrColCount, setGridOverlayRowOrColCount] = useState(
    typeof initialCustomize.gridOverlayRowOrColCount === 'number' ? initialCustomize.gridOverlayRowOrColCount : 0
  )
  const [gridOverlayColorHex, setGridOverlayColorHex] = useState(initialCustomize.gridOverlayColorHex || '')
  const [gridOverlayXOffset, setGridOverlayXOffset] = useState(initialCustomize.gridOverlayXOffset || '')
  const [gridOverlayYOffset, setGridOverlayYOffset] = useState(initialCustomize.gridOverlayYOffset || '')
  const [gridOverlayLineWidth, setGridOverlayLineWidth] = useState(
    typeof initialCustomize.gridOverlayLineWidth === 'number' ? initialCustomize.gridOverlayLineWidth : 0
  )
  const [gridOverlayLayer, setGridOverlayLayer] = useState(initialCustomize.gridOverlayLayer || '')
  const [drawVoronoiGridOverlayOnlyOnLand, setDrawVoronoiGridOverlayOnlyOnLand] = useState(
    typeof initialCustomize.drawVoronoiGridOverlayOnlyOnLand === 'boolean' ? initialCustomize.drawVoronoiGridOverlayOnlyOnLand : false
  )
  
  const [finalLandColoringMethod, setFinalLandColoringMethod] = useState(initialCustomize.finalLandColoringMethod || '')
  const [borderRef, setBorderRef] = useState(initialCustomize.borderRef || '')
  const [borderWidth, setBorderWidth] = useState(
    typeof initialCustomize.borderWidth === 'number' ? initialCustomize.borderWidth : 0
  )
  const [borderPosition, setBorderPosition] = useState(initialCustomize.borderPosition || '')
  const [borderColorOption, setBorderColorOption] = useState(initialCustomize.borderColorOption || '')
  const [borderColorHex, setBorderColorHex] = useState(initialCustomize.borderColorHex || '')
  const [frayedBorder, setFrayedBorder] = useState(
    typeof initialCustomize.frayedBorder === 'boolean' ? initialCustomize.frayedBorder : false
  )
  const [frayedBorderBlurLevel, setFrayedBorderBlurLevel] = useState(
    typeof initialCustomize.frayedBorderBlurLevel === 'number' ? initialCustomize.frayedBorderBlurLevel : 0
  )
  const [frayedBorderSize, setFrayedBorderSize] = useState(
    typeof initialCustomize.frayedBorderSize === 'number' ? initialCustomize.frayedBorderSize : 0
  )
  const [frayedBorderSeed, setFrayedBorderSeed] = useState(initialCustomize.frayedBorderSeed || '')
  const [drawGrunge, setDrawGrunge] = useState(
    typeof initialCustomize.drawGrunge === 'boolean' ? initialCustomize.drawGrunge : false
  )
  
  const [grungeWidth, setGrungeWidth] = useState(
    typeof initialCustomize.grungeWidth === 'number' ? initialCustomize.grungeWidth : 0
  )
  const [frayedBorderColorHex, setFrayedBorderColorHex] = useState(initialCustomize.frayedBorderColorHex || '')
  const [lineStyle, setLineStyle] = useState(initialCustomize.lineStyle || '')
  const [coastlineWidth, setCoastlineWidth] = useState(
    typeof initialCustomize.coastlineWidth === 'number' ? initialCustomize.coastlineWidth : 0
  )
  const [coastlineColorHex, setCoastlineColorHex] = useState(initialCustomize.coastlineColorHex || '')
  const [coastShadingLevel, setCoastShadingLevel] = useState(
    typeof initialCustomize.coastShadingLevel === 'number' ? initialCustomize.coastShadingLevel : 0
  )
  const [coastShadingColorHex, setCoastShadingColorHex] = useState(initialCustomize.coastShadingColorHex || '')
  const [coastShadingAlpha, setCoastShadingAlpha] = useState(
    typeof initialCustomize.coastShadingAlpha === 'number' ? initialCustomize.coastShadingAlpha : 0
  )
  const [oceanShadingAlpha, setOceanShadingAlpha] = useState(
    typeof initialCustomize.oceanShadingAlpha === 'number' ? initialCustomize.oceanShadingAlpha : 0
  )
  const [oceanShadingLevel, setOceanShadingLevel] = useState(
    typeof initialCustomize.oceanShadingLevel === 'number' ? initialCustomize.oceanShadingLevel : 0
  )
  const [oceanShadingColorHex, setOceanShadingColorHex] = useState(initialCustomize.oceanShadingColorHex || '')
  const [oceanWavesType, setOceanWavesType] = useState(initialCustomize.oceanWavesType || '')
  const [oceanWavesLevel, setOceanWavesLevel] = useState(
    typeof initialCustomize.oceanWavesLevel === 'number' ? initialCustomize.oceanWavesLevel : 0
  )
  const [oceanWavesColorHex, setOceanWavesColorHex] = useState(initialCustomize.oceanWavesColorHex || '')
  const [oceanWavesAlpha, setOceanWavesAlpha] = useState(
    typeof initialCustomize.oceanWavesAlpha === 'number' ? initialCustomize.oceanWavesAlpha : 0
  )
  const [concentricWaveCount, setConcentricWaveCount] = useState(
    typeof initialCustomize.concentricWaveCount === 'number' ? initialCustomize.concentricWaveCount : 0
  )
  const [fadeConcentricWaves, setFadeConcentricWaves] = useState(
    typeof initialCustomize.fadeConcentricWaves === 'boolean' ? initialCustomize.fadeConcentricWaves : false
  )
  const [jitterToConcentricWaves, setJitterToConcentricWaves] = useState(
    typeof initialCustomize.jitterToConcentricWaves === 'boolean' ? initialCustomize.jitterToConcentricWaves : false
  )
  const [brokenLinesForConcentricWaves, setBrokenLinesForConcentricWaves] = useState(
    typeof initialCustomize.brokenLinesForConcentricWaves === 'boolean' ? initialCustomize.brokenLinesForConcentricWaves : false
  )
  const [drawOceanEffectsInLakes, setDrawOceanEffectsInLakes] = useState(
    typeof initialCustomize.drawOceanEffectsInLakes === 'boolean' ? initialCustomize.drawOceanEffectsInLakes : false
  )
  const [riverColorHex, setRiverColorHex] = useState(initialCustomize.riverColorHex || '')
  const [drawRoads, setDrawRoads] = useState(
    typeof initialCustomize.drawRoads === 'boolean' ? initialCustomize.drawRoads : false
  )
  const [roadStyle, setRoadStyle] = useState(initialCustomize.roadStyle || '')
  const [roadWidth, setRoadWidth] = useState(
    typeof initialCustomize.roadWidth === 'number' ? initialCustomize.roadWidth : 0
  )
  const [roadColorHex, setRoadColorHex] = useState(initialCustomize.roadColorHex || '')
  const [mountainSize, setMountainSize] = useState(typeof initialCustomize.mountainSize === 'number' ? initialCustomize.mountainSize : 0)
  const [hillSize, setHillSize] = useState(typeof initialCustomize.hillSize === 'number' ? initialCustomize.hillSize : 0)
  const [duneSize, setDuneSize] = useState(typeof initialCustomize.duneSize === 'number' ? initialCustomize.duneSize : 0)
  const [treeHeight, setTreeHeight] = useState(typeof initialCustomize.treeHeight === 'number' ? initialCustomize.treeHeight : 0)
  const [citySize, setCitySize] = useState(typeof initialCustomize.citySize === 'number' ? initialCustomize.citySize : 0)
  const [drawText, setDrawText] = useState(typeof initialCustomize.drawText === 'boolean' ? initialCustomize.drawText : false)
  const [titleFontFamily, setTitleFontFamily] = useState(initialCustomize.titleFontFamily || '')
  const [regionFontFamily, setRegionFontFamily] = useState(initialCustomize.regionFontFamily || '')
  const [mountainRangeFontFamily, setMountainRangeFontFamily] = useState(initialCustomize.mountainRangeFontFamily || '')
  const [otherMountainsFontFamily, setOtherMountainsFontFamily] = useState(initialCustomize.otherMountainsFontFamily || '')
  const [citiesFontFamily, setCitiesFontFamily] = useState(initialCustomize.citiesFontFamily || '')
  const [riverFontFamily, setRiverFontFamily] = useState(initialCustomize.riverFontFamily || '')
  const [textColorHex, setTextColorHex] = useState(initialCustomize.textColorHex || '')
  const [drawBoldBackground, setDrawBoldBackground] = useState(typeof initialCustomize.drawBoldBackground === 'boolean' ? initialCustomize.drawBoldBackground : false)
  const [boldBackgroundColorHex, setBoldBackgroundColorHex] = useState(initialCustomize.boldBackgroundColorHex || '')

  // --- Shared state ---
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uiI18n, setUiI18n] = useState({ labels: {}, options: {} })
  const [uiLoaded, setUiLoaded] = useState(false)
  const [customizationDirty, setCustomizationDirty] = useState(false)
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false)
  const dropRef = useRef(null)
  const [randomOverrides, setRandomOverrides] = useState(initialRandomOverrides)
  const lastApplierRunRef = useRef(0)
  const booksLoadedRef = useRef(false)
  const lastUiDefaultsRef = useRef(null)
  // In-memory canonical merged settings received from server (random/file/or generate)
  const mergedSettingsRef = useRef(null)

  // Log applied settings after appliers run (hook must be called at top-level)
  usePostApplierLogger(lastApplierRunRef, [
    coastlineColorHex,
    coastShadingColorHex,
    coastShadingAlpha,
    oceanShadingColorHex,
    oceanShadingAlpha,
  ])

  useEffect(() => {
    localStorage.setItem(RANDOM_OVERRIDES_STORAGE_KEY, JSON.stringify(randomOverrides))
  }, [randomOverrides])

  // Persist Customize panel values so they are restored on next load
  useEffect(() => {
    persistCustomizeOverrides({
      backgroundType,
      textureRef,
      backgroundSeed,
      drawRegionBoundaries,
      colorizeLand,
      colorizeOcean,
      oceanColorHex,
      landColorHex,
      regionBoundaryStyle,
      regionBoundaryWidth,
      regionBoundaryColorHex,
      drawBorder,
      drawGridOverlay,
      finalLandColoringMethod,
      borderRef,
      borderWidth,
      borderPosition,
      borderColorOption,
      borderColorHex,
      frayedBorder,
      frayedBorderBlurLevel,
      frayedBorderSize,
      frayedBorderSeed,
      drawGrunge,
      grungeWidth,
      frayedBorderColorHex,
      lineStyle,
      coastlineWidth,
      coastlineColorHex,
      coastShadingLevel,
      coastShadingColorHex,
      coastShadingAlpha,
      oceanShadingAlpha,
      oceanShadingLevel,
      oceanShadingColorHex,
      oceanWavesType,
      oceanWavesLevel,
      oceanWavesColorHex,
      oceanWavesAlpha,
      concentricWaveCount,
      fadeConcentricWaves,
      jitterToConcentricWaves,
      brokenLinesForConcentricWaves,
      drawOceanEffectsInLakes,
      riverColorHex,
      drawRoads,
      roadStyle,
      roadWidth,
      roadColorHex,
      mountainSize,
      hillSize,
      duneSize,
      treeHeight,
      citySize,
      drawText,
      titleFontFamily,
      regionFontFamily,
      mountainRangeFontFamily,
      otherMountainsFontFamily,
      citiesFontFamily,
      riverFontFamily,
      textColorHex,
      drawBoldBackground,
      boldBackgroundColorHex,
    })
  }, [
    backgroundType,
    textureRef,
    backgroundSeed,
    drawRegionBoundaries,
    colorizeLand,
    colorizeOcean,
    oceanColorHex,
    landColorHex,
    regionBoundaryStyle,
    regionBoundaryWidth,
    regionBoundaryColorHex,
    drawBorder,
    drawGridOverlay,
    finalLandColoringMethod,
    borderRef,
    borderWidth,
    borderPosition,
    borderColorOption,
    borderColorHex,
    frayedBorder,
    frayedBorderBlurLevel,
    frayedBorderSize,
    frayedBorderSeed,
    drawGrunge,
    grungeWidth,
    frayedBorderColorHex,
    lineStyle,
    coastlineWidth,
    coastlineColorHex,
    coastShadingLevel,
    coastShadingColorHex,
    coastShadingAlpha,
    oceanShadingAlpha,
    oceanShadingLevel,
    oceanShadingColorHex,
    oceanWavesType,
    oceanWavesLevel,
    oceanWavesColorHex,
    oceanWavesAlpha,
    concentricWaveCount,
    fadeConcentricWaves,
    jitterToConcentricWaves,
    brokenLinesForConcentricWaves,
    drawOceanEffectsInLakes,
    riverColorHex,
    drawRoads,
    roadStyle,
    roadWidth,
    roadColorHex,
    mountainSize,
    hillSize,
    duneSize,
    treeHeight,
    citySize,
    drawText,
    titleFontFamily,
    regionFontFamily,
    mountainRangeFontFamily,
    otherMountainsFontFamily,
    citiesFontFamily,
    riverFontFamily,
    textColorHex,
    drawBoldBackground,
    boldBackgroundColorHex,
  ])

  // Load UI option labels and resource lists on mount so the Customize
  // panel can display meaningful options instead of random placeholder
  // text. If the user has no saved customize overrides, apply sensible
  // defaults from the server-provided options.
  useEffect(() => {
    initializeUiForLanguage(requestLanguage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestLanguage])

  async function initializeUiForLanguage(lang) {
    try {
      const uiOpts = await loadUiOptions(lang)
      if (uiOpts) await handleInitialUiOpts(uiOpts)
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: startup option load failed', e)
    } finally {
      try {
        setUiLoaded(true)
      } catch (e) {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: setUiLoaded failed', e)
      }
    }
  }

  // Apply backend `defaults` to the UI using the existing setters.
  function applyServerDefaults(defs, opts) {
    const setHex = (setter, value) => {
      if (value) setter(colorToHex(value) || '')
    }
    const setNumber = (setter, value) => {
      if (Number.isFinite(Number(value))) setter(Number(value))
    }
    const setString = (setter, value) => {
      if (value !== undefined && value !== null) setter(String(value))
    }
    const setBoolean = (setter, value) => {
      if (typeof value === 'boolean') setter(value)
    }

    setNumber(setWorldSize, defs.worldSize)
    setNumber(setRegionCount, defs.regionCount)
    if (defs.cityProbability !== undefined && opts.maxCityProbability !== undefined) {
      setNumber(setCityFrequency, (Number(defs.cityProbability) / Number(opts.maxCityProbability)) * 100)
    }
    setNumber(setFinalWidth, defs.generatedWidth)
    setNumber(setFinalHeight, defs.generatedHeight)
    setString(setMapLanguage, defs.mapLanguage)
    setString(setDimension, defs.dimension)
    setString(setLandShape, defs.landShape)
    setString(setArtPack, defs.artPack)
    setString(setCityIconType, defs.cityIconType ?? defs.cityIconSetName)
    setString(setBackgroundType, defs.backgroundType)
    setString(setTextureRef, defs.textureRef)
    setString(setBackgroundSeed, defs.backgroundRandomSeed)
    setBoolean(setDrawRegionBoundaries, defs.drawRegionBoundaries)
    setBoolean(setColorizeLand, defs.colorizeLand)
    setBoolean(setColorizeOcean, defs.colorizeOcean)
    setHex(setOceanColorHex, defs.oceanColor)
    setHex(setLandColorHex, defs.landColor)
    setHex(setRegionBoundaryColorHex, defs.regionBoundaryColor)
    setNumber(setRegionBoundaryWidth, defs.regionBoundaryWidth)
    setBoolean(setDrawBorder, defs.drawBorder)
    setBoolean(setDrawGridOverlay, defs.drawGridOverlay)
    setString(setGridOverlayShape, defs.gridOverlayShape)
    setNumber(setGridOverlayRowOrColCount, defs.gridOverlayRowOrColCount)
    setHex(setGridOverlayColorHex, defs.gridOverlayColor)
    if (defs.gridOverlayXOffset !== undefined && defs.gridOverlayXOffset !== null) setGridOverlayXOffset(defs.gridOverlayXOffset)
    if (defs.gridOverlayYOffset !== undefined && defs.gridOverlayYOffset !== null) setGridOverlayYOffset(defs.gridOverlayYOffset)
    setNumber(setGridOverlayLineWidth, defs.gridOverlayLineWidth)
    setString(setGridOverlayLayer, defs.gridOverlayLayer)
    setBoolean(setDrawVoronoiGridOverlayOnlyOnLand, defs.drawVoronoiGridOverlayOnlyOnLand)
    setString(setFinalLandColoringMethod, defs.finalLandColoringMethod)
    if (typeof defs.drawRegionColors === 'boolean') {
      const method = defs.drawRegionColors ? 'ColorPoliticalRegions' : 'SingleColor'
      setString(setLandColoringMethod, method)
      setString(setFinalLandColoringMethod, method)
    }
    setString(setBorderRef, defs.borderRef)
    setNumber(setBorderWidth, defs.borderWidth)
    setString(setBorderPosition, defs.borderPosition)
    setString(setBorderColorOption, defs.borderColorOption)
    setHex(setBorderColorHex, defs.borderColor)
    setBoolean(setFrayedBorder, defs.frayedBorder)
    setNumber(setFrayedBorderBlurLevel, defs.frayedBorderBlurLevel)
    setNumber(setFrayedBorderSize, defs.frayedBorderSize)
    setString(setFrayedBorderSeed, defs.frayedBorderSeed)
    setBoolean(setDrawGrunge, defs.drawGrunge)
    setNumber(setGrungeWidth, defs.grungeWidth)
    setHex(setFrayedBorderColorHex, defs.frayedBorderColor)
    setString(setLineStyle, defs.lineStyle)
    setNumber(setCoastlineWidth, defs.coastlineWidth)
    setHex(setCoastlineColorHex, defs.coastlineColor)
    setNumber(setCoastShadingLevel, defs.coastShadingLevel)
    setHex(setCoastShadingColorHex, defs.coastShadingColor)
    setNumber(setCoastShadingAlpha, defs.coastShadingAlpha)
    setNumber(setOceanShadingAlpha, defs.oceanShadingAlpha)
    setNumber(setOceanShadingLevel, defs.oceanShadingLevel)
    setHex(setOceanShadingColorHex, defs.oceanShadingColor)
    setString(setOceanWavesType, defs.oceanWavesType)
    setNumber(setOceanWavesLevel, defs.oceanWavesLevel)
    setHex(setOceanWavesColorHex, defs.oceanWavesColor)
    setNumber(setOceanWavesAlpha, defs.oceanWavesAlpha)
    setNumber(setConcentricWaveCount, defs.concentricWaveCount)
    setBoolean(setFadeConcentricWaves, defs.fadeConcentricWaves)
    setBoolean(setJitterToConcentricWaves, defs.jitterToConcentricWaves)
    setBoolean(setBrokenLinesForConcentricWaves, defs.brokenLinesForConcentricWaves)
    setBoolean(setDrawOceanEffectsInLakes, defs.drawOceanEffectsInLakes)
    setHex(setRiverColorHex, defs.riverColor)
    setBoolean(setDrawRoads, defs.drawRoads)
    setString(setRoadStyle, defs.roadStyle)
    setNumber(setRoadWidth, defs.roadWidth)
    setHex(setRoadColorHex, defs.roadColor)
    setNumber(setMountainSize, defs.mountainSize)
    setNumber(setHillSize, defs.hillSize)
    setNumber(setDuneSize, defs.duneSize)
    setNumber(setTreeHeight, defs.treeHeight)
    setNumber(setCitySize, defs.citySize)
    setBoolean(setDrawText, defs.drawText)
    setString(setTitleFontFamily, defs.titleFontFamily)
    setString(setRegionFontFamily, defs.regionFontFamily)
    setString(setMountainRangeFontFamily, defs.mountainRangeFontFamily)
    setString(setOtherMountainsFontFamily, defs.otherMountainsFontFamily)
    setString(setCitiesFontFamily, defs.citiesFontFamily)
    setString(setRiverFontFamily, defs.riverFontFamily)
    setHex(setTextColorHex, defs.textColor)
    setBoolean(setDrawBoldBackground, defs.drawBoldBackground)
    setHex(setBoldBackgroundColorHex, defs.boldBackgroundColor)

    const backendDefaultFont = (opts && opts.defaultFontFamily) || (Array.isArray(opts.fonts) && opts.fonts.length > 0 ? opts.fonts[0] : null)
    if (!titleFontFamily && backendDefaultFont) setTitleFontFamily(backendDefaultFont)
    if (!regionFontFamily && backendDefaultFont) setRegionFontFamily(backendDefaultFont)
    if (!mountainRangeFontFamily && backendDefaultFont) setMountainRangeFontFamily(backendDefaultFont)
    if (!otherMountainsFontFamily && backendDefaultFont) setOtherMountainsFontFamily(backendDefaultFont)
    if (!citiesFontFamily && backendDefaultFont) setCitiesFontFamily(backendDefaultFont)
    if (!riverFontFamily && backendDefaultFont) setRiverFontFamily(backendDefaultFont)
    if (Array.isArray(defs.books)) setSelectedBooks(new Set(defs.books))
  }

  const updateRandomOverride = useCallback((key, value) => {
    setRandomOverrides((previous) => {
      const next = { ...previous }
      if (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }, [])

  const handleDimensionChange = useCallback(
    (value) => {
      setDimension(value)
      updateRandomOverride('dimension', value)
    },
    [updateRandomOverride]
  )

  const handleLandShapeChange = useCallback(
    (value) => {
      setLandShape(value)
      updateRandomOverride('landShape', value)
    },
    [updateRandomOverride]
  )

  const handleLandColoringMethodChange = useCallback(
    (value) => {
      setLandColoringMethod(value)
      updateRandomOverride('landColoringMethod', value)
    },
    [updateRandomOverride]
  )

  const handleArtPackChange = useCallback(
    (value) => {
      setArtPack(value)
      updateRandomOverride('artPack', value)
    },
    [updateRandomOverride]
  )

  const handleCityIconTypeChange = useCallback(
    (value) => {
      setCityIconType(value)
      updateRandomOverride('cityIconType', value)
    },
    [updateRandomOverride]
  )

  const handleCityFrequencyChange = useCallback(
    (value) => {
      setCityFrequency(value)
      updateRandomOverride('cityFrequency', value)
    },
    [updateRandomOverride]
  )

  const handleMapLanguageChange = useCallback(
    (value) => {
      setMapLanguage(value)
      updateRandomOverride('mapLanguage', value)
    },
    [updateRandomOverride]
  )

  const handleRandomSeedChange = useCallback(
    (value) => {
      setRandomSeed(value)
      updateRandomOverride('randomSeed', value)
    },
    [updateRandomOverride]
  )

  // When the user manually changes the random seed, re-request the
  // server-provided UI options (seeded) so defaults like art packs,
  // textures and city icon lists update to the requested seed.
  const handleRandomSeedChangeAndRefreshUi = useCallback(
    (value) => {
      handleRandomSeedChange(value)
      ;(async () => {
        try {
          // Re-fetch ui-options (no seed support) so lists reflect any
          // backend-generated defaults—server will ignore any seed.
          const uiOpts = await loadUiOptions(requestLanguage)
          if (!uiOpts) return
          setArtPacks(uiOpts.artPacks || [])
          setAllBooks(uiOpts.books || [])
          setTextures(uiOpts.textures || [])
          setBorderTypes(uiOpts.borderTypes || [])
          const defs = uiOpts.defaults || {}
          try {
            const byPack = uiOpts.cityIconTypesByPack || {}
            for (const pack of Object.keys(byPack)) {
              cityIconTypesRequestByPack.set(pack, Promise.resolve(byPack[pack]))
            }
          } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('GenerateForm: startup defaults composition error', e) }

          // Merge backend i18n labels with frontend labels
          const frontendLabels = await getFrontendLabels(requestLanguage)
          const backendLabels = uiOpts.labels || {}
          setUiI18n({ labels: { ...frontendLabels, ...backendLabels }, options: uiOpts.options || {} })

          // Persist the raw backend defaults so appliers can apply them
          lastUiDefaultsRef.current = defs || null

          
          // update to the newly-seeded canonical values returned by the
          // server. Use the same appliers as initial-load so behaviour is
          // consistent.
          try {
            const ap = appliersRef.current
            if (ap) {
              ap.applyMapSizeAndSeedSettings(defs)
              ap.applyBackgroundTypeSettings(defs)
              ap.applyColorAndBoundarySettings(defs)
              ap.applyBorderSettings(defs)
              ap.applyFrayedBorderSettings(defs)
              ap.applyCoastlineSettings(defs)
              ap.applyOceanSettings(defs)
              ap.applyRoadAndScaleSettings(defs)
              ap.applyTextSettings(defs)
            }
          } catch (e) {
            if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: apply appliers failed during ui defaults application', e)
          }
        } catch (e) {
          if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: ui defaults processing failed', e)
        }
      })()
    },
    [handleRandomSeedChange, requestLanguage]
  )

  const handleWorldSizeChange = useCallback(
    (value) => {
      setWorldSize(value)
      updateRandomOverride('worldSize', value)
    },
    [updateRandomOverride]
  )
  async function refreshUiForSeed(value) {
    try {
      const uiOpts = await loadUiOptions(requestLanguage)
      if (!uiOpts) return
      setArtPacks(uiOpts.artPacks || [])
      setAllBooks(uiOpts.books || [])
      setTextures(uiOpts.textures || [])
      setBorderTypes(uiOpts.borderTypes || [])
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: refreshUiForSeed failed', e)
    }
  }

  const handleRegionCountChange = useCallback(
    (value) => {
      setRegionCount(value)
      updateRandomOverride('regionCount', value)
    },
    [updateRandomOverride]
  )

  const handleSelectedBooksChange = useCallback(
    (booksSet) => {
      setSelectedBooks(booksSet)
      if (!booksLoadedRef.current) {
        return
      }
      updateRandomOverride('selectedBooks', Array.from(booksSet))
    },
    [updateRandomOverride]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const appliers = useMemo(
    () =>
      createSettingsAppliers({
        setFinalWidth,
        setFinalHeight,
        setFinalSeed,
        setRandomSeed,
        setArtPack,
        setLandShape,
        setRegionCount,
        setWorldSize,
        setCityIconType,
        setSelectedBooks,
        setDimension,
        setRegionBoundaryStyle,
        setRegionBoundaryWidth,
        setBackgroundType,
        setTextureRef,
        setBackgroundSeed,
        setDrawRegionBoundaries,
        setColorizeLand,
        setColorizeOcean,
        setOceanColorHex,
        setLandColorHex,
        setRegionBoundaryColorHex,
        setDrawBorder,
        setDrawGridOverlay,
        setLandColoringMethod,
        setFinalLandColoringMethod,
        setBorderRef,
        setBorderWidth,
        setBorderPosition,
        setBorderColorOption,
        setBorderColorHex,
        setFrayedBorder,
        setFrayedBorderBlurLevel,
        setFrayedBorderSize,
        setFrayedBorderSeed,
        setDrawGrunge,
        setGrungeWidth,
        setFrayedBorderColorHex,
        setLineStyle,
        setCoastlineWidth,
        setCoastlineColorHex,
        setCoastShadingLevel,
        setCoastShadingColorHex,
        setCoastShadingAlpha,
        setOceanShadingLevel,
        setOceanShadingAlpha,
        setOceanShadingColorHex,
        setOceanWavesAlpha,
        setOceanWavesType,
        setOceanWavesLevel,
        setOceanWavesColorHex,
        setConcentricWaveCount,
        setFadeConcentricWaves,
        setJitterToConcentricWaves,
        setBrokenLinesForConcentricWaves,
        setDrawOceanEffectsInLakes,
        setRiverColorHex,
        setDrawRoads,
        setRoadStyle,
        setRoadWidth,
        setRoadColorHex,
        setMountainSize,
        setHillSize,
        setDuneSize,
        setTreeHeight,
        setCitySize,
        setDrawText,
        setTitleFontFamily,
        setRegionFontFamily,
        setMountainRangeFontFamily,
        setOtherMountainsFontFamily,
        setCitiesFontFamily,
        setRiverFontFamily,
        setTextColorHex,
        setDrawBoldBackground,
        setBoldBackgroundColorHex,
      },
      {
        // current values used for idempotent setter comparisons
        finalWidth,
        finalHeight,
        finalSeed,
        randomSeed,
        artPack,
        landShape,
        regionCount,
        worldSize,
        cityIconType,
        selectedBooks,
        dimension,
        backgroundType,
        textureRef,
        backgroundSeed,
        drawRegionBoundaries,
        colorizeLand,
        colorizeOcean,
        oceanColorHex,
        landColorHex,
        regionBoundaryColorHex,
        drawBorder,
        drawGridOverlay,
        landColoringMethod,
        finalLandColoringMethod,
        borderRef,
        borderWidth,
        borderPosition,
        borderColorOption,
        borderColorHex,
        frayedBorder,
        frayedBorderBlurLevel,
        frayedBorderSize,
        frayedBorderSeed,
        drawGrunge,
        grungeWidth,
        frayedBorderColorHex,
        lineStyle,
        coastlineWidth,
        coastlineColorHex,
        coastShadingLevel,
        coastShadingColorHex,
        coastShadingAlpha,
        oceanShadingLevel,
        oceanShadingAlpha,
        oceanShadingColorHex,
        oceanWavesType,
        oceanWavesLevel,
        oceanWavesAlpha,
        oceanWavesColorHex,
        drawOceanEffectsInLakes,
        riverColorHex,
        drawRoads,
        roadStyle,
        roadWidth,
        roadColorHex,
        mountainSize,
        hillSize,
        duneSize,
        treeHeight,
        citySize,
        drawText,
        titleFontFamily,
        regionFontFamily,
        mountainRangeFontFamily,
        otherMountainsFontFamily,
        citiesFontFamily,
        riverFontFamily,
        textColorHex,
        drawBoldBackground,
        boldBackgroundColorHex,
      }),
    [
      // Recreate appliers when any current UI value used for comparisons changes
      finalWidth,
      finalHeight,
      finalSeed,
      randomSeed,
      artPack,
      landShape,
      regionCount,
      worldSize,
      cityIconType,
      selectedBooks,
      dimension,
      backgroundType,
      textureRef,
      backgroundSeed,
      drawRegionBoundaries,
      colorizeLand,
      colorizeOcean,
      oceanColorHex,
      landColorHex,
      regionBoundaryColorHex,
      drawBorder,
      drawGridOverlay,
      landColoringMethod,
      finalLandColoringMethod,
      borderRef,
      borderWidth,
      borderPosition,
      borderColorOption,
      borderColorHex,
      frayedBorder,
      frayedBorderBlurLevel,
      frayedBorderSize,
      frayedBorderSeed,
      drawGrunge,
      grungeWidth,
      frayedBorderColorHex,
      lineStyle,
      coastlineWidth,
      coastlineColorHex,
      coastShadingLevel,
      coastShadingColorHex,
      coastShadingAlpha,
      oceanShadingLevel,
      oceanShadingAlpha,
      oceanShadingColorHex,
      oceanWavesType,
      oceanWavesLevel,
      oceanWavesAlpha,
      oceanWavesColorHex,
      drawOceanEffectsInLakes,
      riverColorHex,
      drawRoads,
      roadStyle,
      roadWidth,
      roadColorHex,
      mountainSize,
      hillSize,
      duneSize,
      treeHeight,
      citySize,
      drawText,
      titleFontFamily,
      regionFontFamily,
      mountainRangeFontFamily,
      otherMountainsFontFamily,
      citiesFontFamily,
      riverFontFamily,
      textColorHex,
      drawBoldBackground,
      boldBackgroundColorHex,
    ]
  ) // setters from useState are stable references

  // Keep a ref to the latest appliers so effects can use a stable
  // dependency list that doesn't re-run when the applier object identity
  // changes under React StrictMode. Update the ref whenever appliers
  // is recreated.
  const appliersRef = useRef(appliers)
  useEffect(() => {
    appliersRef.current = appliers
  }, [appliers])

  // If backend defaults were captured during UI load, apply them now
  // using the canonical settings appliers so every control resets to
  // the server-provided default values on page load.
  useEffect(() => {
    const defs = lastUiDefaultsRef.current
    if (!defs) return
    const ap = appliersRef.current
    if (!ap) return
    ap.applyMapSizeAndSeedSettings(defs)
    ap.applyBackgroundTypeSettings(defs)
    ap.applyColorAndBoundarySettings(defs)
    ap.applyBorderSettings(defs)
    ap.applyFrayedBorderSettings(defs)
    ap.applyCoastlineSettings(defs)
    ap.applyOceanSettings(defs)
    ap.applyRoadAndScaleSettings(defs)
    ap.applyTextSettings(defs)

    // Ensure the Random Seed input starts empty on initial load per UX rules.
    // The backend may provide a canonical `randomSeed` for reproducible
    // generation, but the UI should present an empty seed so users opt-in
    // to supplying a manual seed. Clear the state and remove any stored
    // override for `randomSeed`.
    try {
      // Fill the Random Seed input with the backend-provided canonical
      // seed when present so the UI reflects the generated preset.
      const seedVal = defs && defs.randomSeed !== undefined && defs.randomSeed !== null ? String(defs.randomSeed) : ''
      setRandomSeed(seedVal)
      updateRandomOverride('randomSeed', seedVal || null)
    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('GenerateForm: preview prefetch error', e) }

    // Ensure font family controls are initialized to backend canonical
    // default if available.
    const opts = uiI18n.options || {}
    const backendDefaultFont = opts?.defaultFontFamily || (Array.isArray(opts?.fonts) && opts.fonts.length > 0 ? opts.fonts[0] : null)
    if (backendDefaultFont) {
      setTitleFontFamily(backendDefaultFont)
      setRegionFontFamily(backendDefaultFont)
      setMountainRangeFontFamily(backendDefaultFont)
      setOtherMountainsFontFamily(backendDefaultFont)
      setCitiesFontFamily(backendDefaultFont)
      setRiverFontFamily(backendDefaultFont)
    }

    // Clear stored defaults after applying once.
    lastUiDefaultsRef.current = null
  }, [uiI18n])

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url)
      }
    }
  }, [preview])

  

  // Note: background preview prefetch removed to avoid duplicate
  // /background-preview requests. `CustomizeSettingsSection` is now
  // responsible for fetching the preview when needed.

  function handleCityIconTypesLoaded(types, previousType) {
    setCityIconTypes(types)
    const selected = selectCityIconType(previousType, types)
    // Only update the selected city icon type when the selector
    // returns a non-empty value. This prevents asynchronous type
    // enumeration from clearing a backend-provided default.
    if (selected) setCityIconType(selected)
  }

  useEffect(() => {
    const pack = artPack || 'nortantis'
    loadCityIconTypes(pack)
      .then((types) => handleCityIconTypesLoaded(types, cityIconType))
      .catch((e) => {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: loadCityIconTypes (useEffect) failed', e)
      })
  }, [artPack])

  useEffect(() => {
    if (!currentSource?.nortContent) return
    try {
      // Parse the current source content and apply appliers. Do not perform
      // ad-hoc, case-by-case merges here — the canonical merged settings
      // are stored in `mergedSettingsRef` and UI helper values (hex/alpha)
      // are derived from canonical numeric colors where appropriate.
      let settings = tryParse(currentSource.nortContent)
      if (!settings) throw new Error('Current source nortContent is not valid JSON.')
      // mark origin so appliers can log which source triggered them
      try { settings.__applierSource = 'currentSource' } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('GenerateForm: set __applierSource failed', e) }
      // Always apply map size and seed settings so the Random panel
      // reflects server-resolved values (width, height, seed, worldSize, etc.).
      try { appliersRef.current.applyMapSizeAndSeedSettings(settings) } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('GenerateForm: applyMapSizeAndSeedSettings failed', e) }
      appliersRef.current.applyBackgroundTypeSettings(settings)
      appliersRef.current.applyColorAndBoundarySettings(settings)
      appliersRef.current.applyBorderSettings(settings)
      appliersRef.current.applyFrayedBorderSettings(settings)
      appliersRef.current.applyCoastlineSettings(settings)
      appliersRef.current.applyOceanSettings(settings)
      appliersRef.current.applyRoadAndScaleSettings(settings)
      appliersRef.current.applyTextSettings(settings)
    } catch (e) {
      if (typeof console !== 'undefined' && console.debug) console.debug('GenerateForm: failed to parse currentSource.nortContent', e)
      // Ignore parse failures; form keeps current values.
    }
  }, [currentSource?.nortContent, currentSource?.originType])

  // When the user switches wave type to show concentric controls, prefer
  // values from the last-loaded/merged settings if the UI still has the
  // initial defaults. This ensures a loaded `.nort`'s concentric settings
  // become visible when the controls are revealed.
  useEffect(() => {
    try {
      const ms = mergedSettingsRef.current
      if (!ms) return
      if (!Number.isFinite(Number(ms.concentricWaveCount))) return
      // Only overwrite UI if user hasn't changed the slider (still initial)
      if (concentricWaveCount === 3) setConcentricWaveCount(Number(ms.concentricWaveCount))
      if (typeof ms.fadeConcentricWaves === 'boolean' && !fadeConcentricWaves) setFadeConcentricWaves(Boolean(ms.fadeConcentricWaves))
      if (typeof ms.jitterToConcentricWaves === 'boolean' && !jitterToConcentricWaves)
        setJitterToConcentricWaves(Boolean(ms.jitterToConcentricWaves))
      if (typeof ms.brokenLinesForConcentricWaves === 'boolean' && !brokenLinesForConcentricWaves)
        setBrokenLinesForConcentricWaves(Boolean(ms.brokenLinesForConcentricWaves))
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: concentric wave defaults update failed', e)
    }
  }, [oceanWavesType])

  const handleFile = useCallback(
    (f) => {
      if (!f) return
      setFileName(f.name)
      setFileObj(f)
      setCurrentSource({ type: 'nort', name: f.name })
      f.text()
        .then(async (text) => {
          const source = { type: 'nort-content', name: f.name, nortContent: text }
          setCurrentSource(source)

          // Immediately render the loaded settings so users can start customizing from preview.
          let parsedSettings = null
          try {
            parsedSettings = tryParse(text)
            if (!parsedSettings) throw new Error('Loaded settings file is not valid JSON.')
          } catch {
            throw new Error('Loaded settings file is not valid JSON.')
          }
              try { mergedSettingsRef.current = tryParse(text) || parsedSettings } catch (e) { mergedSettingsRef.current = parsedSettings }
              // Upload the original file text to avoid re-serializing and
              // changing numeric types (integers -> floats). Use the raw
              // uploaded content so the server receives exactly what the
              // user provided in the .nort file.
              // Send the uploaded .nort content as the raw JSON body (no wrapper).
              const parsed = parsedSettings
              await runGenerate(
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(parsed),
                },
                f.name.replace(/\.[^.]+$/, ''),
                source
              )
        })
        .catch((e) => {
              if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: file read failed', e)
            })
    },
    [requestLanguage, runGenerate]
  )

  function handleFileInput(e) {
    handleFile(e.target.files?.[0])
  }

  function onDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  function handleSuccess(blob, baseName, source, nortContent) {
    const url = URL.createObjectURL(blob)
    setPreview((previous) => {
      if (previous?.url) {
        URL.revokeObjectURL(previous.url)
      }
      let filenameBase = baseName
      try {
        if (nortContent) {
          const derived = deriveNortFilenameFromContent(nortContent)
          if (derived) filenameBase = derived
        }
      } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('handleSuccess: deriveNortFilenameFromContent failed', e) }
      const filename = `${sanitizeFilenameBase(filenameBase, 'vellaris-map')}.png`
      return {
        url,
        filename,
        sourceLabel:
          source?.type === 'random'
            ? 'Random Map'
            : source?.name || fileName || 'Generated from Settings',
      }
    })
    if (nortContent) {
          // suppressed debug: handleSuccess nortContent details
      setCurrentSource({
        type: 'nort-content',
        name: source?.name || fileName || 'Generated settings',
        nortContent,
        originType: source?.type,
      })
      try {
        const parsed = tryParse(nortContent)
        if (parsed) mergedSettingsRef.current = parsed
      } catch (e) {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: failed to parse nortContent from server', e)
      }
    } else if (source) {
      // Do not overwrite currentSource when server did not return merged
      // nortContent. In particular, generating from the Customize panel
      // should not reset custom control values by replacing the source
      // with a bare `source` object. If the previous `currentSource` had
      // a `nortContent` blob (and thus the UI has state derived from it),
      // keep it.
      setCurrentSource((prev) => {
        try {
          if (source?.type === 'random' && prev?.nortContent) return prev
          // If the source we're about to set already contains nortContent,
          // avoid clobbering the previous source which may have UI overrides.
          if (source?.nortContent && prev?.nortContent) return prev
        } catch (e) {
          if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: setCurrentSource prev-check failed', e)
        }
        return source
      })
    }
    try {
      globalThis.showToast?.('Map generated', { type: 'success', duration: 3000 })
    } catch (e) {
      console.warn('showToast failed', e)
    }
    // Mark that a generation completed successfully and clear dirty flag
    try {
      setHasGeneratedOnce(true)
      setCustomizationDirty(false)
    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('GenerateForm: failed to set generated/dirty flags', e) }
  }

  async function processGenerateResponse(bytes, contentType, outputMode, baseName, source) {
    if (!contentType.includes('application/json')) {
      if (outputMode === 'nort-only')
        throw new Error('Server returned image bytes; expected settings content.')
      handleSuccess(new Blob([bytes], { type: contentType || 'image/png' }), baseName, source)
      return
    }
    const decoded = new TextDecoder('utf-8').decode(bytes)
    const data = tryParse(decoded)
    if (!data || typeof data !== 'object') throw new Error('Invalid JSON response from server')
    if (outputMode !== 'nort-only') {
      const imageBase64 = data.imageBase64
      // Build nortContent by serializing the returned settings object without imageBase64
      const copy = { ...data }
      delete copy.imageBase64
      const nortContent = serializeNortObject(copy)
      handleSuccess(base64ToBlob(imageBase64, 'image/png'), baseName, source, nortContent)
      return
    }
    // nort-only: server still returns merged settings object with imageBase64; extract nort JSON
    const copy = { ...data }
    delete copy.imageBase64
    const nortContent = serializeNortObject(copy)
    try {
      const parsed = tryParse(nortContent)
      if (parsed) mergedSettingsRef.current = parsed
    } catch (e) {
      // ignore parse failures
    }
    downloadNortContent(nortContent, baseName)
    setCurrentSource({
      type: 'nort-content',
      name: source?.name || fileName || 'Generated settings',
      nortContent,
      originType: source?.type,
    })
    globalThis.showToast?.('Settings file downloaded', { type: 'success', duration: 3000 })
  }

  async function runGenerate(requestOptions, baseName, source, outputMode = 'preview', externalToast = null) {
    setError(null)
    setLoading(true)
    const toast = externalToast ?? makeProgressToastController()

    // no-op: instrumentation removed

    try {
      if (!externalToast) toast.show(outputMode === 'nort-only' ? 'Preparing settings...' : 'Generating map..')
      // FormData debug removed

      // If caller requested `nort-only`, ask server to return merged
      // settings alongside the image as JSON.
      try {
        const body = requestOptions.body
        if (outputMode === 'nort-only' && body && typeof FormData !== 'undefined' && body instanceof FormData) {
          body.append('returnSettings', 'true')
        }
      } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('runGenerate: failed to append returnSettings to FormData', e) }

      let res = await fetch(`${API_BASE}/generate`, requestOptions)
      if (!res.ok) await handleResponseError(res)
      const contentType = res.headers.get('content-type') || ''
      const bytes = await readResponseBytesWithProgress(res, () => {
        toast.show(outputMode === 'nort-only' ? 'Downloading settings...' : 'Downloading map...')
      })
      await processGenerateResponse(bytes, contentType, outputMode, baseName, source)
    } catch (err) {
      setError(err.message)
      try {
        globalThis.showToast?.(err.message, { type: 'error', duration: 6000 })
      } catch (e) {
        console.warn('showToast failed', e)
      }
    } finally {
      setLoading(false)
      if (!externalToast) toast.hide()
    }
  }

  async function handleRandomMap(evt) {
    evt.preventDefault()
    setError(null)
    setLoading(true)
    const toast = makeProgressToastController()

    try {
      // Build a compact random-block payload and POST directly to /api/generate
      toast.show('Preparing map settings...')
      const isManual = (k) => Object.prototype.hasOwnProperty.call(randomOverrides, k)
      const cfg = {
        language: isManual('mapLanguage') ? mapLanguage || undefined : undefined,
        randomSeed: isManual('randomSeed') ? (randomSeed ? Number(randomSeed) : undefined) : undefined,
        artPack: isManual('artPack') ? artPack || undefined : undefined,
        dimension: isManual('dimension') ? dimension || undefined : undefined,
        worldSize: isManual('worldSize') ? worldSize : undefined,
        landShape: isManual('landShape') ? landShape || undefined : undefined,
        regionCount: isManual('regionCount') ? regionCount : undefined,
        drawRegionColors: isManual('landColoringMethod') ? (landColoringMethod ? (landColoringMethod === 'ColorPoliticalRegions') : undefined) : undefined,
        cityFrequency: isManual('cityFrequency') ? cityFrequency : undefined,
        // Preserve a manually-selected city icon set for the settings resolver
        cityIconSetName: isManual('cityIconType') ? cityIconType || undefined : undefined,
        books: isManual('selectedBooks') ? (selectedBooks.size > 0 ? Array.from(selectedBooks) : undefined) : undefined,
      }

      // First request: resolved settings (no image)
      const settingsRes = await fetch(`${API_BASE}/generate-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      if (!settingsRes.ok) await handleResponseError(settingsRes)
      // Server now returns the normalized .nort JSON directly as the body.
      const nortContent = await settingsRes.text()
      if (!nortContent) throw new Error('Server did not return settings content.')

      // Apply returned settings to UI so controls reflect generated values
      let parsedReturned = null
      try {
        parsedReturned = tryParse(nortContent)
        if (parsedReturned) mergedSettingsRef.current = parsedReturned
      } catch (e) {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: failed to parse nortContent from handleRandom response', e)
      }
      try { appliersRef.current.applyMapSizeAndSeedSettings(mergedSettingsRef.current) } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('handleRandomMap: applyMapSizeAndSeedSettings failed', e) }
      try { appliersRef.current.applyBackgroundTypeSettings(mergedSettingsRef.current) } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('handleRandomMap: applyBackgroundTypeSettings failed', e) }

      // Now request final image by POSTing the returned .nort as FormData
      toast.show('Generating random map...')
      // If the UI specified a map language override, embed it into the
      // returned settings JSON under the `language` field so the server
      // consumes it from the .nort content rather than a separate form param.
      if (parsedReturned && isManual('mapLanguage') && mapLanguage) {
        parsedReturned.language = mapLanguage
      }
      // Ensure a manually-selected city icon type is preserved in the
      // returned settings. The server and other appliers expect the
      // legacy `cityIconSetName` field.
      if (parsedReturned && isManual('cityIconType') && cityIconType) {
        parsedReturned.cityIconSetName = cityIconType
      }
      // Send the returned .nort JSON as the raw request body (no wrapper).
      const bodyPayload = parsedReturned || tryParse(nortContent)
      await runGenerate({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPayload) }, 'random-map', { type: 'random', name: 'Random Map', nortContent }, 'preview', toast)
    } catch (err) {
      setError(err.message)
      try {
        globalThis.showToast?.(err.message, { type: 'error', duration: 6000 })
      } catch (e) {
        console.warn('showToast failed', e)
      }
    } finally {
      setLoading(false)
      toast.hide()
    }
  }

  function resolveLandColoringMethod(fallbackMethod) {
    // Server-side region shading expects region index data; when texture land colorization
    // is disabled, forcing SingleColor avoids an invalid drawRegionColors combination.
    if (backgroundType === 'GeneratedFromTexture' && !colorizeLand) {
      return 'SingleColor'
    }
    return finalLandColoringMethod || fallbackMethod || undefined
  }

  // Helper: parse hex color to RGB tuple or return null
  function parseHexColor(hexStr) {
    if (!hexStr) return null
    const hex = hexStr.replace(/^#/, '')
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
    return {
      r: Number.parseInt(hex.substring(0, 2), 16),
      g: Number.parseInt(hex.substring(2, 4), 16),
      b: Number.parseInt(hex.substring(4, 6), 16),
    }
  }

  // Helper: convert hex to RGBA string or fallback
  function hexToRgbaString(hexStr, alpha = 255) {
    const rgb = parseHexColor(hexStr)
    return rgb ? `${rgb.r},${rgb.g},${rgb.b},${alpha}` : hexStr
  }

  // Helper: merge color with optional formatColorString fallback
  function mergeColor(parsedSettings, key, hexStr, opacityPercent = 100, useFormatter = false) {
    if (!hexStr) return
    if (useFormatter) {
      try {
        const formatted = formatColorString(hexStr, opacityPercent)
        if (formatted) { parsedSettings[key] = formatted; return }
      } catch (e) { /* fallthrough to hex parse */ }
    }
    parsedSettings[key] = hexToRgbaString(hexStr, 255)
  }

  // Helper: parse and set resource (artPack|name)
  function setResourceFromRef(parsedSettings, key, ref) {
    if (!ref) return
    const parts = ref.split('|', 2)
    if (parts.length === 2) {
      parsedSettings[key] = { artPack: parts[0], name: parts[1] }
    }
  }

  // Helper: parse boolean with optional merge from prior settings
  function parseBooleanWithDefault(value, mergedRef, priorKey, uiValue) {
    try {
      const orig = mergedRef?.current?.[priorKey]
      if (typeof orig === 'boolean' && uiValue === false && orig !== uiValue) {
        return Boolean(orig)
      }
    } catch (e) { /* use uiValue */ }
    return Boolean(value)
  }

  // Helper: scale value with linear interpolation
  function scaleSliderValue(sliderValue, sliderValueFor1Scale = 5, scaleMin = 0.5, scaleMax = 3.0) {
    const v = Number(sliderValue)
    if (!Number.isFinite(v)) return undefined
    const minSlider = 1, maxSlider = 15
    if (v <= sliderValueFor1Scale) {
      const slope = (sliderValueFor1Scale - minSlider) / (1.0 - scaleMin)
      return (v - (sliderValueFor1Scale - slope)) / slope
    } else {
      const slope = (maxSlider - sliderValueFor1Scale) / (scaleMax - 1.0)
      return (v - (sliderValueFor1Scale - slope * 1.0)) / slope
    }
  }

  // Helper: preserve grid overlay alpha from prior settings if color unchanged
  function getGridOverlayAlpha() {
    try {
      const origColor = mergedSettingsRef?.current?.gridOverlayColor
      if (!origColor) return 255
      const origHex = colorToHex(origColor)
      if (origHex && origHex.toLowerCase() === gridOverlayColorHex.toLowerCase()) {
        const ch = parseColorChannels(origColor)
        if (ch?.a !== undefined && Number.isFinite(Number(ch.a))) return Number(ch.a)
      }
    } catch (e) { /* use default */ }
    return 255
  }

  // Helper: handle wave count preservation
  function getConcentricWaveCount() {
    try {
      const origCount = mergedSettingsRef?.current?.concentricWaveCount
      const uiCountNum = Number(concentricWaveCount)
      if (typeof origCount === 'number' && (!Number.isFinite(uiCountNum) || uiCountNum === 0)) {
        return origCount
      } else if (Number.isFinite(uiCountNum)) {
        return uiCountNum
      }
    } catch (e) { /* use uiCountNum */ }
    return Number.isFinite(Number(concentricWaveCount)) ? Number(concentricWaveCount) : undefined
  }

  // Merge current UI theme/visual settings into a parsed settings object.
  // Reused by buildNortContentRequest and random-map outgoing settings.
  function mergeUiIntoParsed(parsedSettings) {
    try {
      // Handle background type flags
      const bgFlags = {
        'SolidColor': { solidColorBackground: true, generateBackgroundFromTexture: false, generateBackground: false },
        'GeneratedFromTexture': { solidColorBackground: false, generateBackgroundFromTexture: true, generateBackground: false },
      }
      const flags = bgFlags[backgroundType] || { solidColorBackground: false, generateBackgroundFromTexture: false, generateBackground: true }
      Object.assign(parsedSettings, flags)

      // Resources
      setResourceFromRef(parsedSettings, 'borderResource', borderRef)
      setResourceFromRef(parsedSettings, 'backgroundTextureResource', textureRef)

      // Background seed
      if (backgroundSeed) parsedSettings.backgroundRandomSeed = Number(backgroundSeed)

      // Top-level map/randomization fields
      if (artPack) parsedSettings.artPack = artPack
      if (typeof worldSize !== 'undefined') parsedSettings.worldSize = Number(worldSize)
      if (landShape) parsedSettings.landShape = landShape
      if (Number.isFinite(Number(regionCount))) parsedSettings.regionCount = Number(regionCount)
      if (randomSeed) parsedSettings.randomSeed = Number(randomSeed)
      if (selectedBooks && typeof selectedBooks === 'object' && typeof selectedBooks.size === 'number') parsedSettings.books = Array.from(selectedBooks).sort()

      // Region boundary style & color
      if (!parsedSettings.regionBoundaryStyle || typeof parsedSettings.regionBoundaryStyle !== 'object') parsedSettings.regionBoundaryStyle = {}
      if (regionBoundaryStyle) parsedSettings.regionBoundaryStyle.type = regionBoundaryStyle
      if (Number.isFinite(Number(regionBoundaryWidth))) parsedSettings.regionBoundaryStyle.width = Number(regionBoundaryWidth)
      mergeColor(parsedSettings, 'regionBoundaryColor', regionBoundaryColorHex)

      // Draw flags and colorization
      parsedSettings.drawRegionBoundaries = Boolean(drawRegionBoundaries)
      parsedSettings.colorizeLand = Boolean(colorizeLand)
      parsedSettings.colorizeOcean = Boolean(colorizeOcean)
      mergeColor(parsedSettings, 'oceanColor', oceanColorHex, 100, true)
      mergeColor(parsedSettings, 'landColor', landColorHex, 100, true)

      // Grid overlay settings
      parsedSettings.drawGridOverlay = Boolean(drawGridOverlay)
      if (gridOverlayShape) parsedSettings.gridOverlayShape = gridOverlayShape
      if (Number.isFinite(Number(gridOverlayRowOrColCount))) parsedSettings.gridOverlayRowOrColCount = Number(gridOverlayRowOrColCount)
      if (gridOverlayColorHex) {
        const alpha = getGridOverlayAlpha()
        parsedSettings.gridOverlayColor = hexToRgbaString(gridOverlayColorHex, alpha)
      }
      if (gridOverlayXOffset) parsedSettings.gridOverlayXOffset = gridOverlayXOffset
      if (gridOverlayYOffset) parsedSettings.gridOverlayYOffset = gridOverlayYOffset
      if (Number.isFinite(Number(gridOverlayLineWidth))) parsedSettings.gridOverlayLineWidth = Number(gridOverlayLineWidth)
      if (gridOverlayLayer) parsedSettings.gridOverlayLayer = gridOverlayLayer
      parsedSettings.drawVoronoiGridOverlayOnlyOnLand = Boolean(drawVoronoiGridOverlayOnlyOnLand)

      // Land coloring / border settings
      const resolvedLandMethod = resolveLandColoringMethod(parsedSettings.landColoringMethod)
      if (resolvedLandMethod) parsedSettings.drawRegionColors = (resolvedLandMethod === 'ColorPoliticalRegions')
      parsedSettings.borderWidth = Number(borderWidth)
      parsedSettings.borderPosition = borderPosition
      parsedSettings.borderColorOption = borderColorOption
      mergeColor(parsedSettings, 'borderColor', borderColorHex)

      // Frayed border / grunge
      parsedSettings.frayedBorder = Boolean(frayedBorder)
      if (Number.isFinite(Number(frayedBorderBlurLevel))) parsedSettings.frayedBorderBlurLevel = Number(frayedBorderBlurLevel)
      if (Number.isFinite(Number(frayedBorderSize))) parsedSettings.frayedBorderSize = Number(frayedBorderSize)
      if (frayedBorderSeed) parsedSettings.frayedBorderSeed = Number(frayedBorderSeed)
      parsedSettings.drawGrunge = Boolean(drawGrunge)
      if (Number.isFinite(Number(grungeWidth))) parsedSettings.grungeWidth = Number(grungeWidth)
      mergeColor(parsedSettings, 'frayedBorderColor', frayedBorderColorHex)

      // Line / coastline settings
      if (lineStyle) parsedSettings.lineStyle = lineStyle
      if (Number.isFinite(Number(coastlineWidth))) parsedSettings.coastlineWidth = Number(coastlineWidth)
      mergeColor(parsedSettings, 'coastlineColor', coastlineColorHex)

      // Coast shading
      if (Number.isFinite(Number(coastShadingLevel))) parsedSettings.coastShadingLevel = Number(coastShadingLevel)
      if (coastShadingColorHex) {
        const opacityPercent = 100 - Number(coastShadingAlpha || 0)
        mergeColor(parsedSettings, 'coastShadingColor', coastShadingColorHex, opacityPercent, true)
      }

      // Ocean shading / waves
      if (Number.isFinite(Number(oceanShadingLevel))) parsedSettings.oceanShadingLevel = Number(oceanShadingLevel)
      if (oceanShadingColorHex) {
        const oceanOpacityPercent = 100 - Number(oceanShadingAlpha || 0)
        mergeColor(parsedSettings, 'oceanShadingColor', oceanShadingColorHex, oceanOpacityPercent, true)
      }
      if (oceanWavesType) parsedSettings.oceanEffect = oceanWavesType
      if (Number.isFinite(Number(oceanWavesLevel))) parsedSettings.oceanWavesLevel = Number(oceanWavesLevel)
      parsedSettings.concentricWaveCount = getConcentricWaveCount()
      parsedSettings.fadeConcentricWaves = Boolean(fadeConcentricWaves)
      parsedSettings.jitterToConcentricWaves = parseBooleanWithDefault(jitterToConcentricWaves, mergedSettingsRef, 'jitterToConcentricWaves', jitterToConcentricWaves)
      parsedSettings.brokenLinesForConcentricWaves = parseBooleanWithDefault(brokenLinesForConcentricWaves, mergedSettingsRef, 'brokenLinesForConcentricWaves', brokenLinesForConcentricWaves)
      if (oceanWavesColorHex) {
        const opacityPercent = 100 - Number(oceanWavesAlpha || 0)
        mergeColor(parsedSettings, 'oceanWavesColor', oceanWavesColorHex, opacityPercent, true)
      }
      parsedSettings.drawOceanEffectsInLakes = Boolean(drawOceanEffectsInLakes)

      // River
      mergeColor(parsedSettings, 'riverColor', riverColorHex)

      // Roads
      parsedSettings.drawRoads = Boolean(drawRoads)
      if (roadStyle) {
        parsedSettings.roadStyle = { type: roadStyle, width: Number.isFinite(Number(roadWidth)) ? Number(roadWidth) : undefined }
      } else if (Number.isFinite(Number(roadWidth))) {
        parsedSettings.roadStyle = { width: Number(roadWidth) }
      }
      mergeColor(parsedSettings, 'roadColor', roadColorHex)

      // Scales and sizes
      if (Number.isFinite(Number(mountainSize))) parsedSettings.mountainScale = scaleSliderValue(mountainSize)
      if (Number.isFinite(Number(hillSize))) parsedSettings.hillScale = scaleSliderValue(hillSize)
      if (Number.isFinite(Number(duneSize))) parsedSettings.duneScale = scaleSliderValue(duneSize)
      if (Number.isFinite(Number(treeHeight))) parsedSettings.treeHeightScale = 0.1 + Number(treeHeight) * 0.05
      if (Number.isFinite(Number(citySize))) parsedSettings.cityScale = scaleSliderValue(citySize)

      // Text and bold background
      parsedSettings.drawText = Boolean(drawText)
      mergeColor(parsedSettings, 'textColor', textColorHex)
      parsedSettings.drawBoldBackground = Boolean(drawBoldBackground)
      mergeColor(parsedSettings, 'boldBackgroundColor', boldBackgroundColorHex)
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug('GenerateForm: merge of UI values failed', e)
    }
  }

  function parseNortSettings(explicitNortContent) {
    try {
      if (explicitNortContent) {
        return tryParse(explicitNortContent)
      }
      if (mergedSettingsRef?.current) {
        return cloneMergedSettings()
      }
      return tryParse(currentSource?.nortContent)
    } catch (e) {
      throw new Error('Current settings are not valid JSON.')
    }
  }

  function cloneMergedSettings() {
    try {
      return tryParse(JSON.stringify(mergedSettingsRef.current))
    } catch (e) {
      return mergedSettingsRef.current
    }
  }

  function updateSettingsWithDimensions(parsedSettings) {
    if (finalWidth) parsedSettings.generatedWidth = Number(finalWidth)
    if (finalHeight) parsedSettings.generatedHeight = Number(finalHeight)
    if (finalSeed) parsedSettings.randomSeed = finalSeed ? Number(finalSeed) : undefined
  }

  function exposeSettingsForDebugging(parsedSettings) {
    try {
      if (typeof globalThis !== 'undefined') {
        globalThis.__lastMergedParsedSettings = parsedSettings
      }
    } catch (dbg) {
      safeDebugLog('buildNortContentRequest', 'set __lastMergedParsedSettings failed', dbg)
    }
  }

  function buildNortContentRequest({ explicitNortContent = null } = {}) {
    let parsedSettings = parseNortSettings(explicitNortContent)
    if (!parsedSettings) throw new Error('Current settings are not valid JSON.')

    try {
      mergeUiIntoParsed(parsedSettings)
    } catch (e) {
      safeDebugLog('buildNortContentRequest', 'mergeUiIntoParsed failed', e)
    }

    updateSettingsWithDimensions(parsedSettings)
    exposeSettingsForDebugging(parsedSettings)

    if (mapLanguage) parsedSettings.language = mapLanguage
    serializeNortObject(parsedSettings)

    return {
      requestOptions: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedSettings),
      },
      baseName: (preview?.filename || 'generated-map.png').replace(/\.png$/, ''),
      source: {
        type: currentSource.type,
        name: currentSource.name,
        nortContent: currentSource.nortContent,
      },
    }
  }

  async function handleGenerateFromSettings(evt) {
    evt.preventDefault()
    await runGenerateFromCurrentSource()
  }

  async function handleGenerateAndSaveNort(evt) {
    evt.preventDefault()
    // Build merged settings from current UI state and download that
    try {
      const result = buildNortContentRequest()
      const body = result.requestOptions && result.requestOptions.body
      if (!body) throw new Error('Failed to build merged settings for download.')

      // We now send JSON bodies. Parse the JSON and extract the `settings` object.
      let serialized
      if (typeof body === 'string') {
        // Body is a raw .nort JSON (no wrapper).
        const parsed = tryParse(body)
        if (!parsed) throw new Error('Merged settings not available for download.')
        serialized = serializeNortObject(parsed)
      } else if (typeof body === 'object') {
        // Fallback: if callers supply a FormData-like object, attempt to read nortFile
        if (typeof body.get === 'function') {
          const nf = body.get('nortFile')
          if (!nf || typeof nf.text !== 'function') throw new Error('Merged settings not available for download.')
          serialized = await nf.text()
        } else {
          throw new Error('Merged settings not available for download.')
        }
      } else {
        throw new Error('Merged settings not available for download.')
      }

      const derived = deriveNortFilenameFromContent(serialized)
      const baseName = derived || (currentSource?.name || 'generated-settings')
      downloadNortContent(serialized, baseName)
      globalThis.showToast?.('Settings file downloaded', { type: 'success', duration: 3000 })
    } catch (e) {
      globalThis.showToast?.(e.message || 'Cannot download merged settings. Open the Customize panel and save settings locally first.', { type: 'warning', duration: 6000 })
    }
  }

  async function runGenerateFromCurrentSource(requestBehavior = null, outputMode = 'preview') {
    const effectiveRequestBehavior = requestBehavior ?? {}
    let result = null

    try {
      // If a file is available, always read its text and merge UI overrides
      // into that content. This avoids stale `currentSource.nortContent` and
      // ensures the sent .nort contains the latest control values.
      if (fileObj) {
        // Always read the uploaded file as text and send JSON body; do not
        // fall back to multipart form uploads.
        try {
          const text = await fileObj.text()
          result = buildNortContentRequest({ ...effectiveRequestBehavior, explicitNortContent: text })
        } catch (e) {
          throw new Error('Failed to read uploaded .nort file as text; cannot POST as JSON.')
        }
      } else if (currentSource?.nortContent) {
        result = buildNortContentRequest(effectiveRequestBehavior)
      } else {
        return
      }
    } catch (err) {
      const message = err?.message || 'Failed to prepare map request.'
      setError(message)
      globalThis.showToast?.(message, { type: 'error', duration: 6000 })
      return
    }

    await runGenerate(result.requestOptions, result.baseName, result.source, outputMode)
  }

  function openPreviewModal() {
    if (!preview?.url) return
    globalThis.openModal?.(preview.url, preview.filename)
  }

  function handleDownloadMap() {
    if (!preview?.url) return
    const anchor = document.createElement('a')
    anchor.href = preview.url
    anchor.download = preview.filename || 'vellaris-map.png'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }
  // instrumentation removed

  if (!uiLoaded) {
    return (
      <div className="generate-form loading">
        {uiI18n.labels['ui.loading']}
      </div>
    )
  }

  return (
    <div className="generate-form">
      <RandomSettingsSection
        values={{
          dimension,
          worldSize,
          landShape,
          regionCount,
          landColoringMethod,
          artPack,
          cityIconType,
          cityFrequency,
          selectedBooks,
          randomSeed,
          mapLanguage,
          fileName,
        }}
        handlers={{
          setDimension: handleDimensionChange,
          setWorldSize: handleWorldSizeChange,
          setLandShape: handleLandShapeChange,
          setRegionCount: handleRegionCountChange,
          setLandColoringMethod: handleLandColoringMethodChange,
          setArtPack: handleArtPackChange,
          setCityIconType: handleCityIconTypeChange,
          setCityFrequency: handleCityFrequencyChange,
          setSelectedBooks: handleSelectedBooksChange,
          setRandomSeed: handleRandomSeedChangeAndRefreshUi,
          setMapLanguage: handleMapLanguageChange,
          handleRandomMap,
          handleFileInput,
          onDrop,
        }}
        options={{
          artPacks,
          cityIconTypes,
          allBooks,
          i18n: uiI18n,
        }}
        ui={{
          loading,
          dropRef,
        }}
      />

      <div className="section-divider">
        <span>{uiI18n.labels['ui.section.then']}</span>
      </div>
      <CustomizeSettingsSection
        values={{
          preview,
          backgroundType,
          textureRef,
          colorizeLand,
          colorizeOcean,
          finalLandColoringMethod,
          regionBoundaryStyle,
          regionBoundaryWidth,
          regionBoundaryColorHex,
          landColorHex,
          oceanColorHex,
          backgroundSeed,
          finalSeed,
          finalWidth,
          finalHeight,
          drawRegionBoundaries,
          drawBorder,
          drawGridOverlay,
          borderRef,
          borderWidth,
          borderPosition,
          borderColorOption,
          borderColorHex,
          frayedBorder,
          frayedBorderBlurLevel,
          frayedBorderSize,
          frayedBorderSeed,
          drawGrunge,
          grungeWidth,
          frayedBorderColorHex,
          lineStyle,
          coastlineWidth,
          coastlineColorHex,
          coastShadingLevel,
          coastShadingColorHex,
          coastShadingAlpha,
          oceanShadingAlpha,
          oceanShadingLevel,
          oceanShadingColorHex,
          oceanWavesType,
          oceanWavesLevel,
          oceanWavesAlpha,
          oceanWavesColorHex,
          concentricWaveCount,
          fadeConcentricWaves,
          jitterToConcentricWaves,
          brokenLinesForConcentricWaves,
          drawOceanEffectsInLakes,
          riverColorHex,
          drawRoads,
          roadStyle,
          roadWidth,
          roadColorHex,
          mountainSize,
          hillSize,
          duneSize,
          treeHeight,
          citySize,
          drawText,
          titleFontFamily,
          regionFontFamily,
          mountainRangeFontFamily,
          otherMountainsFontFamily,
          citiesFontFamily,
          riverFontFamily,
          textColorHex,
          drawBoldBackground,
          boldBackgroundColorHex,
          gridOverlayShape,
          gridOverlayRowOrColCount,
          gridOverlayColorHex,
          gridOverlayXOffset,
          gridOverlayYOffset,
          gridOverlayLineWidth,
          gridOverlayLayer,
          drawVoronoiGridOverlayOnlyOnLand,
          fileObj,
          currentSource,
        }}
        handlers={{
          setBackgroundType,
          setTextureRef,
          setColorizeLand,
          setColorizeOcean,
          setFinalLandColoringMethod,
          setRegionBoundaryStyle,
          setRegionBoundaryWidth,
          setRegionBoundaryColorHex,
          setLandColorHex,
          setOceanColorHex,
          setBackgroundSeed,
          setFinalSeed,
          setFinalWidth,
          setFinalHeight,
          setDrawRegionBoundaries,
          setDrawBorder,
          setDrawGridOverlay,
          setBorderRef,
          setBorderWidth,
          setBorderPosition,
          setBorderColorOption,
          setBorderColorHex,
          setGridOverlayShape,
          setGridOverlayRowOrColCount,
          setGridOverlayColorHex,
          setGridOverlayXOffset,
          setGridOverlayYOffset,
          setGridOverlayLineWidth,
          setGridOverlayLayer,
          setDrawVoronoiGridOverlayOnlyOnLand,
          setFrayedBorder,
          setFrayedBorderBlurLevel,
          setFrayedBorderSize,
          setFrayedBorderSeed,
          setDrawGrunge,
          setGrungeWidth,
          setFrayedBorderColorHex,
          setLineStyle,
          setCoastlineWidth,
          setCoastlineColorHex,
          setCoastShadingLevel,
          setCoastShadingColorHex,
          setCoastShadingAlpha,
          setOceanShadingAlpha,
          setOceanShadingLevel,
          setOceanShadingColorHex,
          setOceanWavesType,
          setOceanWavesLevel,
          setOceanWavesAlpha,
          setOceanWavesColorHex,
          setConcentricWaveCount,
          setFadeConcentricWaves,
          setJitterToConcentricWaves,
          setBrokenLinesForConcentricWaves,
          setDrawOceanEffectsInLakes,
          setRiverColorHex,
          setDrawRoads,
          setRoadStyle,
          setRoadWidth,
          setRoadColorHex,
          setMountainSize,
          setHillSize,
          setDuneSize,
          setTreeHeight,
          setCitySize,
          setDrawText,
          setTitleFontFamily,
          setRegionFontFamily,
          setMountainRangeFontFamily,
          setOtherMountainsFontFamily,
          setCitiesFontFamily,
          setRiverFontFamily,
          setTextColorHex,
          setDrawBoldBackground,
          setBoldBackgroundColorHex,
          handleGenerateFromSettings,
          handleGenerateAndSaveNort,
          openPreviewModal,
          handleDownloadMap,
          notifyManualChange: () => {
            try {
              if (hasGeneratedOnce) setCustomizationDirty(true)
            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('Notify manual change: setCustomizationDirty failed', e) }
          },
        }}
        options={{
          textures,
          borderTypes,
          i18n: uiI18n,
        }}
        ui={{
          loading,
          customizationDirty,
          hasGeneratedOnce,
        }}
      />

      {error && <div className="error">{error}</div>}
    </div>
  )
}

export default GenerateForm

GenerateForm.propTypes = {
  uiLanguage: PropTypes.string,
}
