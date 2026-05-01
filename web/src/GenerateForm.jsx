import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import CustomizeSettingsSection from './generate/CustomizeSettingsSection'
import RandomSettingsSection from './generate/RandomSettingsSection'
import { base64ToBlob, formatColorString, colorToHex, colorToAlphaPercent } from './generate/utils'
import { selectCityIconType, fetchJson, handleResponseError } from './generate/helpers'
import { downloadNortContent } from './generate/responseHandlers'
import { createSettingsAppliers } from './generate/settingsAppliers'
import { getFrontendLabels } from './i18n/webLabels'
const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const RANDOM_OVERRIDES_STORAGE_KEY = 'vellaris-random-manual-overrides'
const CUSTOMIZE_OVERRIDES_STORAGE_KEY = 'vellaris-customize-overrides'
const cityIconTypesRequestByPack = new Map()
function loadRandomOverrides() {
  try {
    const raw = localStorage.getItem(RANDOM_OVERRIDES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function loadCustomizeOverrides() {
  try {
    const raw = localStorage.getItem(CUSTOMIZE_OVERRIDES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
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

const uiOptionsRequestByLang = new Map()
function loadUiOptions(language = 'en') {
  const key = language || 'en'
  if (!uiOptionsRequestByLang.has(key)) {
    uiOptionsRequestByLang.set(key, fetchJson(`${API_BASE}/ui-options?language=${encodeURIComponent(language)}`))
  }
  return uiOptionsRequestByLang.get(key)
}

// Log resolved-setting-applier results after React applies state updates.
// We rely on a timestamp marker `lastApplierRunRef` to avoid spurious logs.
function usePostApplierLogger(lastApplierRunRef, deps) {
  const marker = lastApplierRunRef?.current
  useEffect(() => {
    if (!marker) return
    // Defer to next macrotask to ensure state is stable in concurrent mode.
    const id = setTimeout(() => {
      // suppressed verbose debug output in production
      // clear marker
      if (lastApplierRunRef) lastApplierRunRef.current = 0
    }, 0)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker, ...deps])

}

function deriveNortFilenameFromContent(nortContent) {
  try {
    const parsed = typeof nortContent === 'string' ? JSON.parse(nortContent) : nortContent
    if (parsed && parsed.edits) {
      const textList = Array.isArray(parsed.edits.textEdits)
        ? parsed.edits.textEdits
        : Array.isArray(parsed.edits.text)
        ? parsed.edits.text
        : null
      if (Array.isArray(textList)) {
        for (const t of textList) {
          const tType = t && (t.type || t.typeName || t.Type)
          const tText = t && (t.text || t.value || t.Text)
          if (tType === 'Title' && typeof tText === 'string' && tText.trim()) {
            return String(tText.trim()).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-')
          }
        }
      }
    }
  } catch (e) {}
  return null
}

function appendIfSet(fd, key, value) {
  if (value !== null && value !== undefined && value !== '') fd.append(key, String(value))
}

// Serialize .nort JSON consistently for backend compatibility:
// - replace `null` values with empty string `""`
// - format integer numeric literals as floats (e.g. `1` -> `1.0`) so outputs
//   resemble desktop exports (cosmetic, valid JSON numbers)
function serializeNortObject(obj) {
  // Replace nulls with empty strings and produce a stable JSON with
  // alphabetically sorted object keys for reproducible .nort output.
  function normalizeAndSort(value, keyPath = []) {
    if (value === null) {
      // Preserve explicit null for specific export-path keys so downloaded
      // .nort files keep null instead of being converted to empty string.
      const lastKey = keyPath.length > 0 ? keyPath[keyPath.length - 1] : null
      if (lastKey === 'heightmapExportPath' || lastKey === 'imageExportPath') return null
      return ""
    }
    if (Array.isArray(value)) {
      // Preserve original array ordering. Previously arrays were
      // alphabetically sorted which changed user-provided ordering.
      // Avoid passing Array.map's index/array as the `keyPath` arg to
      // `normalizeAndSort` (see keyPath bug fix above).
      const mapped = value.map((v) => normalizeAndSort(v, keyPath))
      return mapped
    }
    if (typeof value === 'object' && value !== null) {
      const out = {}
      const keys = Object.keys(value).sort()
      for (const k of keys) {
        out[k] = normalizeAndSort(value[k], keyPath.concat(k))
      }
      return out
    }
    return value
  }

  try {
    const normalized = normalizeAndSort(obj)
    let json = JSON.stringify(normalized, null, 2)
    // Ensure exported density integer literals include a decimal (1 => 1.0)
    // Replace only numeric integer values for the property name "density".
    // Replace integer density values (e.g. 1) with float format (1.0).
    // This should be deterministic and not silently fall back.
    json = json.replace(/("density"\s*:\s*)(-?\d+)(\s*[,}\n])/g, (m, p1, p2, p3) => `${p1}${p2}.0${p3}`)
    return json
  } catch (e) {
    // Do not fall back silently — propagate the error so callers handle it.
    throw e
  }
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

function GenerateForm({ language = 'en' }) {
  const initialRandomOverrides = useMemo(() => loadRandomOverrides(), [])
  // Always start with empty customize overrides so UI resets to backend defaults on load
  const initialCustomize = useMemo(() => ({}), [])
  const [preview, setPreview] = useState(null)
  const [currentSource, setCurrentSource] = useState(null)
  const requestLanguage = language

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
    initialRandomOverrides.mapLanguage || language
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
    try {
      const payload = {
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
      }
      localStorage.setItem(CUSTOMIZE_OVERRIDES_STORAGE_KEY, JSON.stringify(payload))
    } catch (e) {
      // ignore storage errors
    }
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
    (async () => {
      try {
        const uiOpts = await loadUiOptions(requestLanguage)
        if (uiOpts) {
          setArtPacks(uiOpts.artPacks || [])
          setAllBooks(uiOpts.books || [])
          setTextures(uiOpts.textures || [])
          setBorderTypes(uiOpts.borderTypes || [])
          try {
            const byPack = uiOpts.cityIconTypesByPack || {}
            for (const pack of Object.keys(byPack)) {
              cityIconTypesRequestByPack.set(pack, Promise.resolve(byPack[pack]))
            }
          } catch (e) {
            // ignore
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

            // Default art pack to first available if none chosen
            const firstArtPack = Array.isArray(uiOpts.artPacks) && uiOpts.artPacks.length > 0 ? uiOpts.artPacks[0] : null
            if (!artPack && firstArtPack) setArtPack(firstArtPack)

            // Prefetch city icon types for the selected/default art pack
            const packToLoad = artPack || firstArtPack || 'nortantis'
            loadCityIconTypes(packToLoad)
              .then((types) => handleCityIconTypesLoaded(types, cityIconType))
              .catch(() => {})
          } catch (e) {
            // ignore
          }

          // Merge backend i18n labels with frontend labels so untranslated
          // keys still resolve to readable text where possible. Do not
          // alter backend label text here; return it verbatim and let
          // renderers handle any HTML formatting if needed.
          const frontendLabels = getFrontendLabels(requestLanguage)
          const backendLabels = uiOpts.labels || {}
          setUiI18n({ labels: { ...frontendLabels, ...backendLabels }, options: uiOpts.options || {} })

          // Always apply server option defaults and backend `defaults` so
          // the UI resets to canonical backend values on every load.
          try {
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
              const defs = uiOpts.defaults || {}
              if (defs) {
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
                setNumber(setCityFrequency, defs.cityFrequency)
                setNumber(setFinalWidth, defs.generatedWidth)
                setNumber(setFinalHeight, defs.generatedHeight)
                setString(setMapLanguage, defs.mapLanguage)
                setString(setDimension, defs.dimension)
                setString(setLandShape, defs.landShape)
                setString(setArtPack, defs.artPack)
                setString(setCityIconType, defs.cityIconType)
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
                if (Array.isArray(defs.books)) setSelectedBooks(new Set(defs.books))
              }
            } catch (e) {
              // ignore default application failures
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore startup option load failures
      } finally {
        try { setUiLoaded(true) } catch (e) {}
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestLanguage])

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

  const handleWorldSizeChange = useCallback(
    (value) => {
      setWorldSize(value)
      updateRandomOverride('worldSize', value)
    },
    [updateRandomOverride]
  )

  const handleRegionCountChange = useCallback(
    (value) => {
      setRegionCount(value)
      updateRandomOverride('regionCount', value)
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
    setCityIconType(selectCityIconType(previousType, types))
  }

  useEffect(() => {
    const pack = artPack || 'nortantis'
    loadCityIconTypes(pack)
      .then((types) => handleCityIconTypesLoaded(types, cityIconType))
      .catch(() => {})
  }, [artPack])

  useEffect(() => {
    if (!currentSource?.nortContent) return
    try {
      // Parse the current source content and apply appliers. Do not perform
      // ad-hoc, case-by-case merges here — the canonical merged settings
      // are stored in `mergedSettingsRef` and UI helper values (hex/alpha)
      // are derived from canonical numeric colors where appropriate.
      let settings = JSON.parse(currentSource.nortContent)
      // mark origin so appliers can log which source triggered them
      try { settings.__applierSource = 'currentSource' } catch (e) {}
      // Always apply map size and seed settings so the Random panel
      // reflects server-resolved values (width, height, seed, worldSize, etc.).
      try { appliersRef.current.applyMapSizeAndSeedSettings(settings) } catch (e) {}
      appliersRef.current.applyBackgroundTypeSettings(settings)
      appliersRef.current.applyColorAndBoundarySettings(settings)
      appliersRef.current.applyBorderSettings(settings)
      appliersRef.current.applyFrayedBorderSettings(settings)
      appliersRef.current.applyCoastlineSettings(settings)
      appliersRef.current.applyOceanSettings(settings)
      appliersRef.current.applyRoadAndScaleSettings(settings)
      appliersRef.current.applyTextSettings(settings)
    } catch {
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
      // ignore
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
            parsedSettings = JSON.parse(text)
          } catch {
            throw new Error('Loaded settings file is not valid JSON.')
          }
              try { mergedSettingsRef.current = JSON.parse(text) } catch (e) { mergedSettingsRef.current = parsedSettings }
              // Upload the original file text to avoid re-serializing and
              // changing numeric types (integers -> floats). Use the raw
              // uploaded content so the server receives exactly what the
              // user provided in the .nort file.
              const settingsBlob = new Blob([text], {
                type: 'application/json',
              })
              const payload = new FormData()
              payload.append('nortFile', settingsBlob, f.name || 'uploaded-settings.nort')
              appendIfSet(payload, 'language', requestLanguage)
          await runGenerate(
            {
              method: 'POST',
                  body: payload,
            },
            f.name.replace(/\.[^.]+$/, ''),
            source
          )
        })
        .catch(() => {
          // Ignore read errors; upload path still works through FormData.
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
      const filename = baseName ? `${baseName}.png` : 'vellaris-map.png'
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
        mergedSettingsRef.current = JSON.parse(nortContent)
      } catch (e) {
        // ignore parse failures
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
          if (source?.type === 'random' && prev && prev.nortContent) return prev
          // If the source we're about to set already contains nortContent,
          // avoid clobbering the previous source which may have UI overrides.
          if (source?.nortContent && prev && prev.nortContent) return prev
        } catch (e) {
          // ignore
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
    } catch (e) {}
  }

  async function processGenerateResponse(bytes, contentType, outputMode, baseName, source) {
    if (!contentType.includes('application/json')) {
      if (outputMode === 'nort-only')
        throw new Error('Server returned image bytes; expected settings content.')
      handleSuccess(new Blob([bytes], { type: contentType || 'image/png' }), baseName, source)
      return
    }
    const data = JSON.parse(new TextDecoder('utf-8').decode(bytes))
    if (outputMode !== 'nort-only') {
      handleSuccess(base64ToBlob(data.imageBase64, 'image/png'), baseName, source, data.nortContent)
      return
    }
    if (!data.nortContent) throw new Error('Server did not return settings content for download.')
    try {
      mergedSettingsRef.current = JSON.parse(data.nortContent)
    } catch (e) {
      // ignore parse failures
    }
    downloadNortContent(data.nortContent, baseName)
    setCurrentSource({
      type: 'nort-content',
      name: source?.name || fileName || 'Generated settings',
      nortContent: data.nortContent,
      originType: source?.type,
    })
    globalThis.showToast?.('Settings file downloaded', { type: 'success', duration: 3000 })
  }

  async function runGenerate(requestOptions, baseName, source, outputMode = 'preview', externalToast = null) {
    setError(null)
    setLoading(true)
    const toast = externalToast ?? makeProgressToastController()

    try {
      if (!externalToast) toast.show(outputMode === 'nort-only' ? 'Preparing settings...' : 'Generating map..')
      // Debug: if we're sending FormData, capture and expose its entries
      try {
        const body = requestOptions.body
        if (body && typeof FormData !== 'undefined' && body instanceof FormData) {
          const entries = []
          for (const [k, v] of body.entries()) {
            if (v instanceof File || (typeof Blob !== 'undefined' && v instanceof Blob)) {
              let info = { key: k, type: 'file', name: v.name || 'blob', size: v.size }
              // reuse previously read nort text if available
              if (k === 'nortFile' && window.__lastUploadedNort) {
                info.snippet = window.__lastUploadedNort.slice(0, 800)
              } else if (typeof v.text === 'function') {
                try {
                  const txt = await v.text()
                  info.snippet = txt.slice(0, 800)
                } catch (e) {
                  info.snippet = '<unreadable>'
                }
              }
              entries.push(info)
            } else {
              entries.push({ key: k, type: 'field', value: String(v) })
            }
          }
          try { window.__lastUploadedFormData = entries } catch (e) {}
          // suppressed verbose FormData debug
        }
      } catch (dbg) { console.warn('FormData debug failed', dbg) }
      // Attempt to build a fresh merged nort payload from current UI state
      // at the moment of POST and replace the outgoing `nortFile` with it.
      try {
        const body = requestOptions.body
        // If the caller provided an explicit source that came from an
        // uploaded/loaded `.nort` file, do NOT replace the outgoing
        // `nortFile` with a UI-merged copy here. Replacing immediately
        // can overwrite file-origin values (e.g. `worldSize`) because
        // React state updates from the appliers may not have committed
        // yet. Only perform the merge-replace for generated/resolved
        // sources where overwriting with the current UI state is desired.
        const sourceType = source && source.type ? source.type : null
        const preserveNort = requestOptions && requestOptions.preserveNort === true
        const skipReplaceForSource = preserveNort || sourceType === 'nort' || sourceType === 'nort-content' || sourceType === 'file' || sourceType === 'uploaded'
        if (body && typeof FormData !== 'undefined' && body instanceof FormData && !skipReplaceForSource) {
          try {
            // Build merged content using the current UI state
            const mergedResult = buildNortContentRequest()
            const mergedFd = mergedResult.requestOptions && mergedResult.requestOptions.body
            if (mergedFd && typeof mergedFd.get === 'function') {
              const nf = mergedFd.get('nortFile')
              if (nf && typeof nf.text === 'function') {
                const mergedText = await nf.text()
                const blob = new Blob([mergedText], { type: 'application/json' })
                if (typeof body.delete === 'function') body.delete('nortFile')
                body.append('nortFile', blob, 'merged-settings.nort')
              }
            }
          } catch (e) {
            // fallback: try using lastMergedParsedSettings if available
            if (window.__lastMergedParsedSettings) {
              try {
                const mergedJson = JSON.stringify(window.__lastMergedParsedSettings)
                const blob = new Blob([mergedJson], { type: 'application/json' })
                if (typeof body.delete === 'function') body.delete('nortFile')
                body.append('nortFile', blob, 'merged-settings.nort')
              } catch (e2) {}
            }
          }
        }
      } catch (dbg) { console.warn('runGenerate merge-replace failed', dbg) }

      // If caller requested `nort-only`, ask server to return merged
      // settings alongside the image as JSON.
      try {
        const body = requestOptions.body
        if (outputMode === 'nort-only' && body && typeof FormData !== 'undefined' && body instanceof FormData) {
          body.append('returnSettings', 'true')
        }
      } catch (e) {}

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
      toast.show('Generating random map...')
      const isManual = (k) => Object.prototype.hasOwnProperty.call(randomOverrides, k)
      const cfg = {
        language: requestLanguage,
        mapLanguage: isManual('mapLanguage') ? mapLanguage || undefined : undefined,
        randomSeed: isManual('randomSeed') ? (randomSeed ? Number(randomSeed) : undefined) : undefined,
        artPack: isManual('artPack') ? artPack || undefined : undefined,
        dimension: isManual('dimension') ? dimension || undefined : undefined,
        worldSize: isManual('worldSize') ? worldSize : undefined,
        landShape: isManual('landShape') ? landShape || undefined : undefined,
        regionCount: isManual('regionCount') ? regionCount : undefined,
        drawRegionColors: isManual('landColoringMethod') ? (landColoringMethod ? (landColoringMethod === 'ColorPoliticalRegions') : undefined) : undefined,
        cityIconType: isManual('cityIconType') ? cityIconType || undefined : undefined,
        cityFrequency: isManual('cityFrequency') ? cityFrequency : undefined,
        books: isManual('selectedBooks') ? (selectedBooks.size > 0 ? Array.from(selectedBooks) : undefined) : undefined,
      }

      const genRes = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      if (!genRes.ok) await handleResponseError(genRes)
      const data = await genRes.json()
      if (!data || !data.imageBase64) throw new Error('Server did not return image data.')

      // Use returned image + settings (nortContent) to update UI state
      const blob = base64ToBlob(data.imageBase64, 'image/png')
      try {
        if (data.nortContent) {
          try { mergedSettingsRef.current = JSON.parse(data.nortContent) } catch (e) {}
          // Apply a subset of appliers so UI reflects generated values
          try { appliersRef.current.applyMapSizeAndSeedSettings(mergedSettingsRef.current) } catch (e) {}
          try { appliersRef.current.applyBackgroundTypeSettings(mergedSettingsRef.current) } catch (e) {}
        }
      } catch (e) {}

      handleSuccess(blob, 'random-map', { type: 'random', name: 'Random Map' }, data.nortContent)
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

  // Merge current UI theme/visual settings into a parsed settings object.
  // Reused by buildNortContentRequest and random-map outgoing settings.
  function mergeUiIntoParsed(parsedSettings) {
    try {
      // Handle background type flags that need to be set for server-side processing
      if (backgroundType === 'SolidColor') {
        parsedSettings.solidColorBackground = true
        parsedSettings.generateBackgroundFromTexture = false
        parsedSettings.generateBackground = false
      } else if (backgroundType === 'GeneratedFromTexture') {
        parsedSettings.solidColorBackground = false
        parsedSettings.generateBackgroundFromTexture = true
        parsedSettings.generateBackground = false
      } else {
        // FractalNoise or unknown - generate fractal background and
        // ensure texture/solid flags are off.
        parsedSettings.solidColorBackground = false
        parsedSettings.generateBackgroundFromTexture = false
        parsedSettings.generateBackground = true
      }

      // Border resource (artPack|name)
      if (borderRef) {
        const parts = borderRef.split('|', 2)
        if (parts.length === 2) {
          parsedSettings.borderResource = { artPack: parts[0], name: parts[1] }
        }
      }
      // Background texture resource (artPack|name)
      if (textureRef) {
        const tparts = textureRef.split('|', 2)
        if (tparts.length === 2) {
          parsedSettings.backgroundTextureResource = { artPack: tparts[0], name: tparts[1] }
        }
      }
      // Background seed
      if (backgroundSeed) parsedSettings.backgroundRandomSeed = Number(backgroundSeed)

      // Top-level map/randomization fields
      if (artPack) parsedSettings.artPack = artPack
      if (typeof worldSize !== 'undefined') parsedSettings.worldSize = Number(worldSize)
      if (landShape) parsedSettings.landShape = landShape
      if (Number.isFinite(Number(regionCount))) parsedSettings.regionCount = Number(regionCount)
      if (randomSeed) parsedSettings.randomSeed = Number(randomSeed)
      // cityIconTypeName removed: do not write cityIconTypeName into .nort
      if (selectedBooks && typeof selectedBooks === 'object' && typeof selectedBooks.size === 'number') parsedSettings.books = Array.from(selectedBooks).sort()

      // Region boundary style (type + width) & color
      if (!parsedSettings.regionBoundaryStyle || typeof parsedSettings.regionBoundaryStyle !== 'object') parsedSettings.regionBoundaryStyle = {}
      if (regionBoundaryStyle) parsedSettings.regionBoundaryStyle.type = regionBoundaryStyle
      if (Number.isFinite(Number(regionBoundaryWidth))) parsedSettings.regionBoundaryStyle.width = Number(regionBoundaryWidth)
      if (regionBoundaryColorHex) {
        const rbc = regionBoundaryColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(rbc)) {
          const rr = parseInt(rbc.substring(0, 2), 16)
          const rg = parseInt(rbc.substring(2, 4), 16)
          const rb = parseInt(rbc.substring(4, 6), 16)
          parsedSettings.regionBoundaryColor = `${rr},${rg},${rb},255`
        } else {
          parsedSettings.regionBoundaryColor = regionBoundaryColorHex
        }
      }

      // Draw flags and colorization
      parsedSettings.drawRegionBoundaries = Boolean(drawRegionBoundaries)
      parsedSettings.colorizeLand = Boolean(colorizeLand)
      parsedSettings.colorizeOcean = Boolean(colorizeOcean)
      if (oceanColorHex) {
        try {
          const formatted = formatColorString(oceanColorHex, 100)
          if (formatted) parsedSettings.oceanColor = formatted
        } catch (e) {
          const oh = oceanColorHex.replace(/^#/, '')
          if (/^[0-9a-fA-F]{6}$/.test(oh)) {
            const or = parseInt(oh.substring(0, 2), 16)
            const og = parseInt(oh.substring(2, 4), 16)
            const ob = parseInt(oh.substring(4, 6), 16)
            parsedSettings.oceanColor = `${or},${og},${ob},255`
          } else {
            parsedSettings.oceanColor = oceanColorHex
          }
        }
      }
      if (landColorHex) {
        try {
          const formattedLand = formatColorString(landColorHex, 100)
          if (formattedLand) parsedSettings.landColor = formattedLand
        } catch (e) {
          const lh = landColorHex.replace(/^#/, '')
          if (/^[0-9a-fA-F]{6}$/.test(lh)) {
            const lr = parseInt(lh.substring(0, 2), 16)
            const lg = parseInt(lh.substring(2, 4), 16)
            const lb = parseInt(lh.substring(4, 6), 16)
            parsedSettings.landColor = `${lr},${lg},${lb},255`
          } else {
            parsedSettings.landColor = landColorHex
          }
        }
      }

      // Grid overlay settings
      parsedSettings.drawGridOverlay = Boolean(drawGridOverlay)
      if (gridOverlayShape) parsedSettings.gridOverlayShape = gridOverlayShape
      if (Number.isFinite(Number(gridOverlayRowOrColCount))) parsedSettings.gridOverlayRowOrColCount = Number(gridOverlayRowOrColCount)
      if (gridOverlayColorHex) {
        const gh = gridOverlayColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(gh)) {
          const gr = parseInt(gh.substring(0, 2), 16)
          const gg = parseInt(gh.substring(2, 4), 16)
          const gb = parseInt(gh.substring(4, 6), 16)
          parsedSettings.gridOverlayColor = `${gr},${gg},${gb},255`
        } else {
          parsedSettings.gridOverlayColor = gridOverlayColorHex
        }
      }
      if (gridOverlayXOffset) parsedSettings.gridOverlayXOffset = gridOverlayXOffset
      if (gridOverlayYOffset) parsedSettings.gridOverlayYOffset = gridOverlayYOffset
      if (Number.isFinite(Number(gridOverlayLineWidth))) parsedSettings.gridOverlayLineWidth = Number(gridOverlayLineWidth)
      if (gridOverlayLayer) parsedSettings.gridOverlayLayer = gridOverlayLayer
      parsedSettings.drawVoronoiGridOverlayOnlyOnLand = Boolean(drawVoronoiGridOverlayOnlyOnLand)

      // Land coloring / region shading method
      const resolvedLandMethod = resolveLandColoringMethod(parsedSettings.landColoringMethod)
      if (resolvedLandMethod) parsedSettings.drawRegionColors = (resolvedLandMethod === 'ColorPoliticalRegions')
      parsedSettings.borderWidth = Number(borderWidth)
      parsedSettings.borderPosition = borderPosition
      parsedSettings.borderColorOption = borderColorOption
      if (borderColorHex) {
        const hex = borderColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
          const r = parseInt(hex.substring(0, 2), 16)
          const g = parseInt(hex.substring(2, 4), 16)
          const b = parseInt(hex.substring(4, 6), 16)
          parsedSettings.borderColor = `${r},${g},${b},255`
        } else {
          parsedSettings.borderColor = borderColorHex
        }
      }

      // Frayed border / grunge
      parsedSettings.frayedBorder = Boolean(frayedBorder)
      if (Number.isFinite(Number(frayedBorderBlurLevel))) parsedSettings.frayedBorderBlurLevel = Number(frayedBorderBlurLevel)
      if (Number.isFinite(Number(frayedBorderSize))) parsedSettings.frayedBorderSize = Number(frayedBorderSize)
      if (frayedBorderSeed) parsedSettings.frayedBorderSeed = Number(frayedBorderSeed)
      parsedSettings.drawGrunge = Boolean(drawGrunge)
      if (Number.isFinite(Number(grungeWidth))) parsedSettings.grungeWidth = Number(grungeWidth)
      if (frayedBorderColorHex) {
        const hex2 = frayedBorderColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(hex2)) {
          const r2 = parseInt(hex2.substring(0, 2), 16)
          const g2 = parseInt(hex2.substring(2, 4), 16)
          const b2 = parseInt(hex2.substring(4, 6), 16)
          parsedSettings.frayedBorderColor = `${r2},${g2},${b2},255`
        } else {
          parsedSettings.frayedBorderColor = frayedBorderColorHex
        }
      }

      // Region boundary style (merge type only; width is handled separately)
      if (regionBoundaryStyle) {
        if (!parsedSettings.regionBoundaryStyle || typeof parsedSettings.regionBoundaryStyle !== 'object') parsedSettings.regionBoundaryStyle = {}
        parsedSettings.regionBoundaryStyle.type = regionBoundaryStyle
      }

      // Line / coastline settings
      if (lineStyle) parsedSettings.lineStyle = lineStyle
      if (Number.isFinite(Number(coastlineWidth))) parsedSettings.coastlineWidth = Number(coastlineWidth)
      if (coastlineColorHex) {
        const ch = coastlineColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(ch)) {
          const cr = parseInt(ch.substring(0, 2), 16)
          const cg = parseInt(ch.substring(2, 4), 16)
          const cb = parseInt(ch.substring(4, 6), 16)
          parsedSettings.coastlineColor = `${cr},${cg},${cb},255`
        } else {
          parsedSettings.coastlineColor = coastlineColorHex
        }
      }

      // Coast shading
      if (Number.isFinite(Number(coastShadingLevel))) parsedSettings.coastShadingLevel = Number(coastShadingLevel)
      if (coastShadingColorHex) {
        try {
          const opacityPercent = 100 - Number(coastShadingAlpha || 0)
          const formatted = formatColorString(coastShadingColorHex, opacityPercent)
          if (formatted) parsedSettings.coastShadingColor = formatted
        } catch (e) {
          const csh = coastShadingColorHex.replace(/^#/, '')
          if (/^[0-9a-fA-F]{6}$/.test(csh)) {
            const csr = parseInt(csh.substring(0, 2), 16)
            const csg = parseInt(csh.substring(2, 4), 16)
            const csb = parseInt(csh.substring(4, 6), 16)
            parsedSettings.coastShadingColor = `${csr},${csg},${csb},255`
          } else {
            parsedSettings.coastShadingColor = coastShadingColorHex
          }
        }
      }

      // Ocean shading / waves
      if (Number.isFinite(Number(oceanShadingLevel))) parsedSettings.oceanShadingLevel = Number(oceanShadingLevel)
      if (oceanShadingColorHex) {
        try {
          const oceanOpacityPercent = 100 - Number(oceanShadingAlpha || 0)
          const formattedOcean = formatColorString(oceanShadingColorHex, oceanOpacityPercent)
          if (formattedOcean) parsedSettings.oceanShadingColor = formattedOcean
        } catch (e) {
          const osh = oceanShadingColorHex.replace(/^#/, '')
          if (/^[0-9a-fA-F]{6}$/.test(osh)) {
            const osr = parseInt(osh.substring(0, 2), 16)
            const osg = parseInt(osh.substring(2, 4), 16)
            const osb = parseInt(osh.substring(4, 6), 16)
            parsedSettings.oceanShadingColor = `${osr},${osg},${osb},255`
          } else {
            parsedSettings.oceanShadingColor = oceanShadingColorHex
          }
        }
      }
      if (oceanWavesType) parsedSettings.oceanEffect = oceanWavesType
      if (Number.isFinite(Number(oceanWavesLevel))) parsedSettings.oceanWavesLevel = Number(oceanWavesLevel)
      if (Number.isFinite(Number(concentricWaveCount))) parsedSettings.concentricWaveCount = Number(concentricWaveCount)
      parsedSettings.fadeConcentricWaves = Boolean(fadeConcentricWaves)
      parsedSettings.jitterToConcentricWaves = Boolean(jitterToConcentricWaves)
      parsedSettings.brokenLinesForConcentricWaves = Boolean(brokenLinesForConcentricWaves)
      if (oceanWavesColorHex) {
        try {
          const opacityPercent = 100 - Number(oceanWavesAlpha || 0)
          const formatted = formatColorString(oceanWavesColorHex, opacityPercent)
          if (formatted) parsedSettings.oceanWavesColor = formatted
        } catch (e) {
          const ow = oceanWavesColorHex.replace(/^#/, '')
          if (/^[0-9a-fA-F]{6}$/.test(ow)) {
            const owr = parseInt(ow.substring(0, 2), 16)
            const owg = parseInt(ow.substring(2, 4), 16)
            const owb = parseInt(ow.substring(4, 6), 16)
            parsedSettings.oceanWavesColor = `${owr},${owg},${owb},255`
          } else {
            parsedSettings.oceanWavesColor = oceanWavesColorHex
          }
        }
      }
      parsedSettings.drawOceanEffectsInLakes = Boolean(drawOceanEffectsInLakes)

      // River
      if (riverColorHex) {
        const rrh = riverColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(rrh)) {
          const rrr = parseInt(rrh.substring(0, 2), 16)
          const rrg = parseInt(rrh.substring(2, 4), 16)
          const rrb = parseInt(rrh.substring(4, 6), 16)
          parsedSettings.riverColor = `${rrr},${rrg},${rrb},255`
        } else {
          parsedSettings.riverColor = riverColorHex
        }
      }

      // Roads
      parsedSettings.drawRoads = Boolean(drawRoads)
      if (roadStyle) {
        parsedSettings.roadStyle = { type: roadStyle, width: Number.isFinite(Number(roadWidth)) ? Number(roadWidth) : undefined }
      } else if (Number.isFinite(Number(roadWidth))) {
        parsedSettings.roadStyle = { width: Number(roadWidth) }
      }
      if (roadColorHex) {
        const rh = roadColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(rh)) {
          const rr = parseInt(rh.substring(0, 2), 16)
          const rg = parseInt(rh.substring(2, 4), 16)
          const rb = parseInt(rh.substring(4, 6), 16)
          parsedSettings.roadColor = `${rr},${rg},${rb},255`
        } else {
          parsedSettings.roadColor = roadColorHex
        }
      }

      // Scales and sizes - convert slider values (1-15) to MapSettings scales
      const sliderValueFor1Scale = 5
      const scaleMax = 3.0
      const scaleMin = 0.5
      const minScaleSliderValue = 1
      const maxScaleSliderValue = 15
      function getScaleForSliderValue(sliderValue) {
        const v = Number(sliderValue)
        if (!Number.isFinite(v)) return undefined
        if (v <= sliderValueFor1Scale) {
          const slope = (sliderValueFor1Scale - minScaleSliderValue) / (1.0 - scaleMin)
          const yIntercept = sliderValueFor1Scale - slope
          return (v - yIntercept) / slope
        } else {
          const slope = (maxScaleSliderValue - sliderValueFor1Scale) / (scaleMax - 1.0)
          const yIntercept = sliderValueFor1Scale - slope * 1.0
          return (v - yIntercept) / slope
        }
      }
      function getTreeHeightScaleFromSlider(sliderValue) {
        const v = Number(sliderValue)
        if (!Number.isFinite(v)) return undefined
        return 0.1 + v * 0.05
      }

      if (Number.isFinite(Number(mountainSize))) parsedSettings.mountainScale = getScaleForSliderValue(mountainSize)
      if (Number.isFinite(Number(hillSize))) parsedSettings.hillScale = getScaleForSliderValue(hillSize)
      if (Number.isFinite(Number(duneSize))) parsedSettings.duneScale = getScaleForSliderValue(duneSize)
      if (Number.isFinite(Number(treeHeight))) parsedSettings.treeHeightScale = getTreeHeightScaleFromSlider(treeHeight)
      if (Number.isFinite(Number(citySize))) parsedSettings.cityScale = getScaleForSliderValue(citySize)

      // Text and bold background
      parsedSettings.drawText = Boolean(drawText)
      if (textColorHex) {
        const th = textColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(th)) {
          const tr = parseInt(th.substring(0, 2), 16)
          const tg = parseInt(th.substring(2, 4), 16)
          const tb = parseInt(th.substring(4, 6), 16)
          parsedSettings.textColor = `${tr},${tg},${tb},255`
        } else {
          parsedSettings.textColor = textColorHex
        }
      }
      parsedSettings.drawBoldBackground = Boolean(drawBoldBackground)
      if (boldBackgroundColorHex) {
        const bh = boldBackgroundColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(bh)) {
          const br = parseInt(bh.substring(0, 2), 16)
          const bg = parseInt(bh.substring(2, 4), 16)
          const bb = parseInt(bh.substring(4, 6), 16)
          parsedSettings.boldBackgroundColor = `${br},${bg},${bb},255`
        } else {
          parsedSettings.boldBackgroundColor = boldBackgroundColorHex
        }
      }
    } catch (e) {
      // Ignore merge failures; fall back to original parsedSettings
    }
  }

  function buildNortContentRequest({ forceSaveNort = false, explicitNortContent = null } = {}) {
    let parsedSettings = null
    try {
      if (explicitNortContent) {
        parsedSettings = JSON.parse(explicitNortContent)
      } else if (mergedSettingsRef && mergedSettingsRef.current) {
        // clone the in-memory canonical settings so we can safely mutate
        parsedSettings = JSON.parse(JSON.stringify(mergedSettingsRef.current))
      } else {
        const sourceContent = currentSource?.nortContent
        parsedSettings = JSON.parse(sourceContent)
      }
    } catch (e) {
      throw new Error('Current settings are not valid JSON.')
    }

    // Merge current UI border/fringe settings into the parsed settings so
    // regenerated maps reflect changes made in the Customize panel.
    // Centralized into mergeUiIntoParsed() to keep behavior consistent.
    mergeUiIntoParsed(parsedSettings)
      

    // Ensure map size/seed are stored inside the settings JSON so server only
    // needs to read the uploaded nort content to apply customization.
    // The backend reads `generatedWidth`/`generatedHeight` from settings
    // when rendering from a .nort file, so set those fields here. Do NOT
    // write top-level `width`/`height` fields anymore.
    if (finalWidth) {
      parsedSettings.generatedWidth = Number(finalWidth)
    }
    if (finalHeight) {
      parsedSettings.generatedHeight = Number(finalHeight)
    }
    if (finalSeed) parsedSettings.randomSeed = finalSeed ? Number(finalSeed) : undefined

    // Expose merged settings for debugging and log key UI->merged mappings.
    try {
      if (typeof window !== 'undefined') {
        window.__lastMergedParsedSettings = parsedSettings
        // suppressed merged settings debug
      }
    } catch (dbg) {}

    const settingsText = serializeNortObject(parsedSettings)
    const settingsBlob = new Blob([settingsText], {
      type: 'application/json',
    })
    const payload = new FormData()
    payload.append('nortFile', settingsBlob, 'generated-settings.nort')
    appendIfSet(payload, 'language', requestLanguage)
    appendIfSet(payload, 'mapLanguage', mapLanguage)
    if (forceSaveNort) payload.append('saveNort', 'true')
    // Server always returns image bytes; no flag required.
    return {
      requestOptions: {
        method: 'POST',
        body: payload,
      },
      baseName: (preview?.filename || 'generated-map.png').replace(/\.png$/, ''),
      source: {
        type: currentSource.type,
        name: currentSource.name,
        nortContent: currentSource.nortContent,
      },
    }
  }

  function buildFileRequest({ forceSaveNort = false } = {}) {
    const fd = new FormData()
    fd.append('nortFile', fileObj, fileObj.name)
    // Use generatedWidth/generatedHeight instead of legacy width/height
    if (finalWidth) fd.append('generatedWidth', String(finalWidth))
    if (finalHeight) fd.append('generatedHeight', String(finalHeight))
    if (finalSeed) fd.append('randomSeed', String(finalSeed))
    appendIfSet(fd, 'language', requestLanguage)
    appendIfSet(fd, 'mapLanguage', mapLanguage)
    if (forceSaveNort) fd.append('saveNort', 'true')
    appendIfSet(fd, 'backgroundType', backgroundType)
    appendIfSet(fd, 'textureRef', textureRef)
    appendIfSet(fd, 'backgroundSeed', backgroundSeed)
    fd.append('drawRegionBoundaries', String(drawRegionBoundaries))
    fd.append('colorizeLand', String(colorizeLand))
    fd.append('colorizeOcean', String(colorizeOcean))
    appendIfSet(fd, 'oceanColorHex', oceanColorHex)
    appendIfSet(fd, 'landColorHex', landColorHex)
    appendIfSet(fd, 'regionBoundaryStyle', regionBoundaryStyle)
    appendIfSet(fd, 'regionBoundaryColorHex', regionBoundaryColorHex)
    fd.append('drawBorder', String(drawBorder))
    fd.append('drawGridOverlay', String(drawGridOverlay))
    appendIfSet(fd, 'gridOverlayShape', gridOverlayShape)
    if (Number.isFinite(Number(gridOverlayRowOrColCount))) fd.append('gridOverlayRowOrColCount', String(gridOverlayRowOrColCount))
    appendIfSet(fd, 'gridOverlayColorHex', gridOverlayColorHex)
    appendIfSet(fd, 'gridOverlayXOffset', gridOverlayXOffset)
    appendIfSet(fd, 'gridOverlayYOffset', gridOverlayYOffset)
    if (Number.isFinite(Number(gridOverlayLineWidth))) fd.append('gridOverlayLineWidth', String(gridOverlayLineWidth))
    appendIfSet(fd, 'gridOverlayLayer', gridOverlayLayer)
    fd.append('drawVoronoiGridOverlayOnlyOnLand', String(drawVoronoiGridOverlayOnlyOnLand))
    fd.append('drawGrunge', String(drawGrunge))
    appendIfSet(fd, 'grungeWidth', grungeWidth)
    appendIfSet(fd, 'lineStyle', lineStyle)
    appendIfSet(fd, 'coastlineWidth', coastlineWidth)
    appendIfSet(fd, 'coastlineColorHex', coastlineColorHex)
    appendIfSet(fd, 'coastShadingLevel', coastShadingLevel)
    appendIfSet(fd, 'coastShadingColorHex', coastShadingColorHex)
    // Do not send oceanShadingAlpha as a separate field; embed alpha into oceanShadingColor
    appendIfSet(fd, 'oceanShadingLevel', oceanShadingLevel)
    appendIfSet(fd, 'oceanShadingColorHex', oceanShadingColorHex)
    appendIfSet(fd, 'oceanEffect', oceanWavesType)
    appendIfSet(fd, 'oceanWavesLevel', oceanWavesLevel)
    appendIfSet(fd, 'oceanWavesColorHex', oceanWavesColorHex)
    if (Number.isFinite(Number(concentricWaveCount))) fd.append('concentricWaveCount', String(concentricWaveCount))
    fd.append('fadeConcentricWaves', String(fadeConcentricWaves))
    fd.append('jitterToConcentricWaves', String(jitterToConcentricWaves))
    fd.append('brokenLinesForConcentricWaves', String(brokenLinesForConcentricWaves))
    fd.append('drawOceanEffectsInLakes', String(drawOceanEffectsInLakes))
    appendIfSet(fd, 'riverColorHex', riverColorHex)
    fd.append('drawRoads', String(drawRoads))
    appendIfSet(fd, 'roadStyle', roadStyle)
    appendIfSet(fd, 'roadWidth', roadWidth)
    appendIfSet(fd, 'roadColorHex', roadColorHex)
    // Convert slider values to server-expected scales
    const sliderValueFor1Scale = 5
    const scaleMax = 3.0
    const scaleMin = 0.5
    const minScaleSliderValue = 1
    const maxScaleSliderValue = 15
    function getScaleForSliderValue(sliderValue) {
      const v = Number(sliderValue)
      if (!Number.isFinite(v)) return undefined
      if (v <= sliderValueFor1Scale) {
        const slope = (sliderValueFor1Scale - minScaleSliderValue) / (1.0 - scaleMin)
        const yIntercept = sliderValueFor1Scale - slope
        return (v - yIntercept) / slope
      } else {
        const slope = (maxScaleSliderValue - sliderValueFor1Scale) / (scaleMax - 1.0)
        const yIntercept = sliderValueFor1Scale - slope * 1.0
        return (v - yIntercept) / slope
      }
    }
    function getTreeHeightScaleFromSlider(sliderValue) {
      const v = Number(sliderValue)
      if (!Number.isFinite(v)) return undefined
      return 0.1 + v * 0.05
    }

    appendIfSet(fd, 'mountainSize', getScaleForSliderValue(mountainSize))
    appendIfSet(fd, 'hillSize', getScaleForSliderValue(hillSize))
    appendIfSet(fd, 'duneSize', getScaleForSliderValue(duneSize))
    appendIfSet(fd, 'treeHeight', getTreeHeightScaleFromSlider(treeHeight))
    appendIfSet(fd, 'citySize', getScaleForSliderValue(citySize))
    fd.append('drawText', String(drawText))
    appendIfSet(fd, 'textColorHex', textColorHex)
    fd.append('drawBoldBackground', String(drawBoldBackground))
    appendIfSet(fd, 'boldBackgroundColorHex', boldBackgroundColorHex)
    appendIfSet(fd, 'drawRegionColors', String(resolveLandColoringMethod(undefined) === 'ColorPoliticalRegions'))
    appendIfSet(fd, 'titleFontFamily', titleFontFamily)
    appendIfSet(fd, 'regionFontFamily', regionFontFamily)
    appendIfSet(fd, 'mountainRangeFontFamily', mountainRangeFontFamily)
    appendIfSet(fd, 'otherMountainsFontFamily', otherMountainsFontFamily)
    appendIfSet(fd, 'citiesFontFamily', citiesFontFamily)
    appendIfSet(fd, 'riverFontFamily', riverFontFamily)
    // Server always returns image bytes; no flag required.
    return {
      requestOptions: { method: 'POST', body: fd },
      baseName: fileName ? fileName.replace(/\.[^.]+$/, '') : undefined,
      source: { type: 'nort', name: fileName || 'Uploaded settings' },
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
      const result = buildNortContentRequest({ forceSaveNort: true })
      const fd = result.requestOptions && result.requestOptions.body
      if (!fd || typeof fd.get !== 'function') throw new Error('Failed to build merged settings for download.')
      const nf = fd.get('nortFile')
      if (!nf || typeof nf.text !== 'function') throw new Error('Merged settings not available for download.')
      const serialized = await nf.text()
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
        try {
          const text = await fileObj.text()
          result = buildNortContentRequest({ ...effectiveRequestBehavior, explicitNortContent: text })
        } catch (e) {
          result = buildFileRequest(effectiveRequestBehavior)
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
          setRandomSeed: handleRandomSeedChange,
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
            } catch (e) {}
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
  language: PropTypes.string,
}
