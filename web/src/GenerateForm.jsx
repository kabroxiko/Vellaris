import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import CustomizeSettingsSection from './generate/CustomizeSettingsSection'
import RandomSettingsSection from './generate/RandomSettingsSection'
import { base64ToBlob, formatColorString, colorToHex, colorToAlphaPercent } from './generate/utils'
import { selectCityIconType, fetchJson, handleResponseError } from './generate/helpers'
import { createSettingsAppliers } from './generate/settingsAppliers'
import { getFrontendLabels } from './i18n/webLabels'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const RANDOM_OVERRIDES_STORAGE_KEY = 'vellaris-random-manual-overrides'

let initialOptionsPromise = null
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

function loadInitialOptions() {
  if (!initialOptionsPromise) {
    initialOptionsPromise = Promise.all([
      fetchJson(`${API_BASE}/art-packs`),
      fetchJson(`${API_BASE}/books`),
      fetchJson(`${API_BASE}/textures`),
      fetchJson(`${API_BASE}/border-types`),
    ]).then(([artPacks, books, textures, borderTypes]) => ({
      artPacks,
      books,
      textures,
      borderTypes,
    }))
  }
  return initialOptionsPromise
}

function loadCityIconTypes(pack) {
  if (!cityIconTypesRequestByPack.has(pack)) {
    cityIconTypesRequestByPack.set(
      pack,
      fetchJson(`${API_BASE}/city-icon-types?artPack=${encodeURIComponent(pack)}`)
    )
  }
  return cityIconTypesRequestByPack.get(pack)
}

function loadUiOptions(language = 'en') {
  return fetchJson(`${API_BASE}/ui-options?language=${encodeURIComponent(language)}`)
}

// Log resolved-setting-applier results after React applies state updates.
// We rely on a timestamp marker `lastApplierRunRef` to avoid spurious logs.
function usePostApplierLogger(lastApplierRunRef, deps) {
  const marker = lastApplierRunRef?.current
  useEffect(() => {
    if (!marker) return
    // Defer to next macrotask to ensure state is stable in concurrent mode.
    const id = setTimeout(() => {
      try {
        console.debug('[resolvedSettings] post-appliers',
          'coastlineColorHex=', deps[0],
          'coastShadingColorHex=', deps[1],
          'coastShadingAlpha=', deps[2],
          'oceanShadingColorHex=', deps[3],
          'oceanShadingAlpha=', deps[4]
        )
      } catch (e) {}
      // clear marker
      if (lastApplierRunRef) lastApplierRunRef.current = 0
    }, 0)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker, ...deps])
}

function downloadNortContent(nortContent, baseName) {
  let pretty = null
  let filenameBase = baseName || 'generated-settings'
  try {
    let parsed = null
    if (typeof nortContent === 'string') {
      parsed = JSON.parse(nortContent)
    } else {
      parsed = nortContent
    }
    pretty = JSON.stringify(parsed, null, 2)
    // Prefer edits.textEdits (newer format) then edits.text (legacy)
    if (!baseName && parsed && parsed.edits) {
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
            filenameBase = tText.trim()
            break
          }
        }
      }
    }
  } catch (e) {
    // ignore parse errors and fall back to raw content
  }
  if (pretty === null) {
    pretty = typeof nortContent === 'string' ? nortContent : JSON.stringify(nortContent)
  }
  // sanitize filename
  filenameBase = String(filenameBase).trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-') || 'generated-settings'
  const filename = `${filenameBase}.nort`
  const blob = new Blob([pretty], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
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

export default function GenerateForm({ language = 'en' }) {
  const initialRandomOverrides = useMemo(() => loadRandomOverrides(), [])
  const [preview, setPreview] = useState(null)
  const [currentSource, setCurrentSource] = useState(null)
  const requestLanguage = language

  // --- Random Map state ---
  const [artPacks, setArtPacks] = useState([])
  const [artPack, setArtPack] = useState(initialRandomOverrides.artPack || '')
  const [dimension, setDimension] = useState(initialRandomOverrides.dimension || '')
  const [worldSize, setWorldSize] = useState(16000)
  const [landShape, setLandShape] = useState(initialRandomOverrides.landShape || '')
  const [regionCount, setRegionCount] = useState(10)
  const [landColoringMethod, setLandColoringMethod] = useState(
    initialRandomOverrides.landColoringMethod || ''
  )
  const [cityIconTypes, setCityIconTypes] = useState([])
  const [cityIconType, setCityIconType] = useState(initialRandomOverrides.cityIconType || '')
  const [cityFrequency, setCityFrequency] = useState(50)
  const [allBooks, setAllBooks] = useState([])
  const [selectedBooks, setSelectedBooks] = useState(new Set())
  const [randomSeed, setRandomSeed] = useState('')
  const [mapLanguage, setMapLanguage] = useState(
    initialRandomOverrides.mapLanguage || language
  )

  // --- Generate from Settings state ---
  const [fileName, setFileName] = useState('')
  const [fileObj, setFileObj] = useState(null)
  const [finalWidth, setFinalWidth] = useState(2000)
  const [finalHeight, setFinalHeight] = useState(1200)
  const [finalSeed, setFinalSeed] = useState('')

  // --- Generate from Settings: theme overrides ---
  const [backgroundType, setBackgroundType] = useState('')
  const [textures, setTextures] = useState([])
  const [borderTypes, setBorderTypes] = useState([])
  const [textureRef, setTextureRef] = useState('')
  const [backgroundSeed, setBackgroundSeed] = useState('')
  const [drawRegionBoundaries, setDrawRegionBoundaries] = useState(true)
  const [colorizeLand, setColorizeLand] = useState(true)
  const [colorizeOcean, setColorizeOcean] = useState(true)
  const [oceanColorHex, setOceanColorHex] = useState('#a0b5c8')
  const [landColorHex, setLandColorHex] = useState('#c8b09a')
  const [regionBoundaryStyle, setRegionBoundaryStyle] = useState('')
  const [regionBoundaryWidth, setRegionBoundaryWidth] = useState(2.7)
  const [regionBoundaryColorHex, setRegionBoundaryColorHex] = useState('#000000')
  const [drawBorder, setDrawBorder] = useState(true)
  const [drawGridOverlay, setDrawGridOverlay] = useState(false)
  const [finalLandColoringMethod, setFinalLandColoringMethod] = useState('')
  const [borderRef, setBorderRef] = useState('')
  const [borderWidth, setBorderWidth] = useState(125)
  const [borderPosition, setBorderPosition] = useState('')
  const [borderColorOption, setBorderColorOption] = useState('')
  const [borderColorHex, setBorderColorHex] = useState('#000000')
  const [frayedBorder, setFrayedBorder] = useState(false)
  const [frayedBorderBlurLevel, setFrayedBorderBlurLevel] = useState(75)
  const [frayedBorderSize, setFrayedBorderSize] = useState(5)
  const [frayedBorderSeed, setFrayedBorderSeed] = useState('')
  const [drawGrunge, setDrawGrunge] = useState(true)
  const [grungeWidth, setGrungeWidth] = useState(500)
  const [frayedBorderColorHex, setFrayedBorderColorHex] = useState('#5b4a31')
  const [lineStyle, setLineStyle] = useState('')
  const [coastlineWidth, setCoastlineWidth] = useState(2.7)
  const [coastlineColorHex, setCoastlineColorHex] = useState('#000000')
  const [coastShadingLevel, setCoastShadingLevel] = useState(40)
  const [coastShadingColorHex, setCoastShadingColorHex] = useState('#000000')
  const [coastShadingAlpha, setCoastShadingAlpha] = useState(65)
  const [oceanShadingAlpha, setOceanShadingAlpha] = useState(0)
  const [oceanShadingLevel, setOceanShadingLevel] = useState(10)
  const [oceanShadingColorHex, setOceanShadingColorHex] = useState('#4a4a4a')
  const [oceanWavesType, setOceanWavesType] = useState('')
  const [oceanWavesLevel, setOceanWavesLevel] = useState(30)
  const [oceanWavesColorHex, setOceanWavesColorHex] = useState('#5b4a31')
  const [concentricWaveCount, setConcentricWaveCount] = useState(3)
  const [fadeConcentricWaves, setFadeConcentricWaves] = useState(false)
  const [jitterToConcentricWaves, setJitterToConcentricWaves] = useState(false)
  const [brokenLinesForConcentricWaves, setBrokenLinesForConcentricWaves] = useState(false)
  const [drawOceanEffectsInLakes, setDrawOceanEffectsInLakes] = useState(true)
  const [riverColorHex, setRiverColorHex] = useState('#5b4a31')
  const [drawRoads, setDrawRoads] = useState(true)
  const [roadStyle, setRoadStyle] = useState('')
  const [roadWidth, setRoadWidth] = useState(2.7)
  const [roadColorHex, setRoadColorHex] = useState('#000000')
  const [mountainSize, setMountainSize] = useState(7)
  const [hillSize, setHillSize] = useState(7)
  const [duneSize, setDuneSize] = useState(7)
  const [treeHeight, setTreeHeight] = useState(7)
  const [citySize, setCitySize] = useState(7)
  const [drawText, setDrawText] = useState(true)
  const [titleFontFamily, setTitleFontFamily] = useState('')
  const [regionFontFamily, setRegionFontFamily] = useState('')
  const [mountainRangeFontFamily, setMountainRangeFontFamily] = useState('')
  const [otherMountainsFontFamily, setOtherMountainsFontFamily] = useState('')
  const [citiesFontFamily, setCitiesFontFamily] = useState('')
  const [riverFontFamily, setRiverFontFamily] = useState('')
  const [textColorHex, setTextColorHex] = useState('#000000')
  const [drawBoldBackground, setDrawBoldBackground] = useState(true)
  const [boldBackgroundColorHex, setBoldBackgroundColorHex] = useState('#eadcb6')

  // --- Shared state ---
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uiI18n, setUiI18n] = useState({ labels: {}, options: {} })
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

  useEffect(() => {
    Promise.all([loadInitialOptions(), loadUiOptions(requestLanguage)])
      .then(([{ artPacks, books, textures, borderTypes }, i18n]) => {
        setArtPacks(artPacks)
        setAllBooks(books)
        const overrideBooks = Array.isArray(initialRandomOverrides.selectedBooks)
          ? initialRandomOverrides.selectedBooks
          : null
        const validBooks = overrideBooks ? overrideBooks.filter((b) => books.includes(b)) : null
        const initialBooks = validBooks && validBooks.length > 0 ? new Set(validBooks) : new Set(books)
        booksLoadedRef.current = true
        setSelectedBooks(initialBooks)
        setTextures(textures)
        setBorderTypes(borderTypes)
        const frontendLabels = getFrontendLabels(requestLanguage)
        const backendLabels = i18n?.labels || {}
        setUiI18n({
          labels: {
            ...frontendLabels,
            ...backendLabels,
          },
          options: i18n?.options || {},
        })
        const backendOptions = i18n?.options || {}
        // set sensible defaults from backend-provided option lists, but do not override existing user values
        if (backendOptions.strokeTypes && backendOptions.strokeTypes.length > 0) {
          setRegionBoundaryStyle((prev) => prev || backendOptions.strokeTypes[0].value || '')
          setRoadStyle((prev) => prev || backendOptions.strokeTypes[0].value || '')
        }
        if (backendOptions.lineStyles && backendOptions.lineStyles.length > 0) {
          setLineStyle((prev) => prev || backendOptions.lineStyles[0].value || '')
        }
        if (backendOptions.oceanWaveTypes && backendOptions.oceanWaveTypes.length > 0) {
          setOceanWavesType((prev) => prev || backendOptions.oceanWaveTypes[0].value || '')
        }
        if (backendOptions.borderPositions && backendOptions.borderPositions.length > 0) {
          setBorderPosition((prev) => prev || backendOptions.borderPositions[0].value || '')
        }
        if (backendOptions.borderColorOptions && backendOptions.borderColorOptions.length > 0) {
          setBorderColorOption((prev) => prev || backendOptions.borderColorOptions[0].value || '')
        }
      })
      .catch(() => {})
  }, [requestLanguage, initialRandomOverrides])

  // Prefetch a lightweight background preview on first page load so the
  // Customize panel can show an image immediately. Store the blob on
  // `window.__prefetchedBackgroundPreviewBlob` so the preview component
  // can reuse it and avoid an extra round-trip.
  useEffect(() => {
    // Use a global promise to avoid React StrictMode mount/unmount
    // causing an intermediate abort. Store the promise on window so
    // repeated mounts reuse the same in-flight request.
    try {
      if (typeof window === 'undefined') return
      if (window.__prefetchedBackgroundPreviewBlob) return
      if (!window.__prefetchBackgroundPreviewPromise) {
        window.__prefetchBackgroundPreviewPromise = (async () => {
          try {
            const payload = { previewWidth: 520, previewHeight: 170 }
            const res = await fetch(`${API_BASE}/background-preview`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            if (!res.ok) return null
            const blob = await res.blob()
            try { window.__prefetchedBackgroundPreviewBlob = blob } catch (e) {}
            return blob
          } catch (e) {
            return null
          }
        })()
      }
    } catch (e) {}
    // no cleanup: global promise intentionally not aborted
  }, [])

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
              const settingsBlob = new Blob([JSON.stringify(parsedSettings)], {
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
          try { console.debug('[runGenerate] outgoing FormData', entries) } catch (e) {}
        }
      } catch (dbg) { console.warn('FormData debug failed', dbg) }
      // Attempt to build a fresh merged nort payload from current UI state
      // at the moment of POST and replace the outgoing `nortFile` with it.
      try {
        const body = requestOptions.body
        if (body && typeof FormData !== 'undefined' && body instanceof FormData) {
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
                try { console.debug('[runGenerate] replaced nortFile with freshly built merged settings') } catch (e) {}
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
                try { console.debug('[runGenerate] replaced nortFile with cached merged settings') } catch (e2) {}
              } catch (e2) {}
            }
          }
        }
      } catch (dbg) { console.warn('runGenerate merge-replace failed', dbg) }

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
      // Step 1: resolve random settings without rendering
      toast.show('Resolving settings...')
      const resolvePayload = {
        language: requestLanguage,
        mapLanguage: mapLanguage || undefined,
        seed: randomSeed ? Number(randomSeed) : undefined,
        artPack: artPack || undefined,
        dimension: dimension || undefined,
        worldSize: worldSize,
        landShape: landShape || undefined,
        regionCount: regionCount,
        landColoringMethod: landColoringMethod || undefined,
        cityIconType: cityIconType || undefined,
        cityFrequency: cityFrequency,
        books: selectedBooks.size > 0 ? Array.from(selectedBooks) : undefined,
      }
      const resolveRes = await fetch(`${API_BASE}/resolve-random-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolvePayload),
      })
      if (!resolveRes.ok) await handleResponseError(resolveRes)
      // Read raw response text so we preserve the exact .nort serialization
      const resolveText = await resolveRes.text()
      let resolveData = null
      try {
        resolveData = JSON.parse(resolveText)
      } catch (e) {
        // If parsing fails, fall back to empty object
        resolveData = {}
      }
      try { console.debug('[resolveRandomSettings] response (parsed)', resolveData) } catch (e) {}
      const resolvedSettings = resolveData
      // Compute UI-friendly defaults locally from resolved settings so
      // form controls receive normalized values (hex colors, slider values).
      // Do NOT mutate `resolvedSettings` because it will be uploaded back to
      // the server for rendering and the server expects numeric color arrays.
      let uiSettings = Object.assign({}, resolvedSettings)
      try {
        const ui = {}
        if (resolvedSettings.oceanShadingColor) {
          const hex = colorToHex(resolvedSettings.oceanShadingColor)
          ui.oceanShadingColor = hex
          ui.oceanShadingColorHex = hex
          ui.oceanShadingAlpha = 100 - colorToAlphaPercent(resolvedSettings.oceanShadingColor)
        }
        if (resolvedSettings.coastShadingColor) {
          const hex = colorToHex(resolvedSettings.coastShadingColor)
          ui.coastShadingColor = hex
          ui.coastShadingColorHex = hex
          ui.coastShadingAlpha = 100 - colorToAlphaPercent(resolvedSettings.coastShadingColor)
        }
        ui.fadeConcentricWaves = resolvedSettings.fadeConcentricWaves
        ui.brokenLinesForConcentricWaves = resolvedSettings.brokenLinesForConcentricWaves
        ui.hillScale = resolvedSettings.hillScale
        ui.treeHeightScale = resolvedSettings.treeHeightScale
        ui.cityScale = resolvedSettings.cityScale
        ui.mountainScale = resolvedSettings.mountainScale
        ui.duneScale = resolvedSettings.duneScale
        try { lastUiDefaultsRef.current = ui } catch (e) {}
        const allowedUiKeys = new Set([
          'coastShadingColorHex',
          'coastShadingAlpha',
          'oceanShadingColorHex',
          'oceanShadingAlpha',
          'fadeConcentricWaves',
          'brokenLinesForConcentricWaves',
          'hillScale',
          'treeHeightScale',
          'cityScale',
          'mountainScale',
          'duneScale',
        ])
        for (const k of Object.keys(ui)) {
          if (allowedUiKeys.has(k) || k.endsWith('Hex') || k.endsWith('Alpha')) {
            uiSettings[k] = ui[k]
          }
        }
      } catch (e) {
        // suppressed debug: failed to compute uiDefaults
      }
      if (!resolvedSettings || typeof resolvedSettings !== 'object') {
        throw new Error('Server did not return resolved settings.')
      }

      // Step 2: store resolved settings as current source and let the
      // top-level effect apply appliers exactly once when `currentSource`
      // is updated. This avoids applying appliers both here and in the
      // effect (which would cause duplicate side-effects/logging).
      // We still computed `uiSettings` above for potential use elsewhere,
      // but we intentionally do NOT call appliers here.
      // If there is no explicit uploaded file or existing nortContent, store
      // the resolved settings as `currentSource.nortContent` so the Customize
      // panel can be enabled and the user can edit these settings locally.
      // Mark originType='random' so downstream logic knows these came from
      // the random resolver (this is not the server-returned merged .nort).
      try {
        if (!fileObj && !currentSource?.nortContent) {
          // Preserve the raw server-produced .nort content when available
          const serialized = resolveText || JSON.stringify(resolvedSettings)
          setCurrentSource({ type: 'nort-content', name: 'Resolved settings', nortContent: serialized, originType: 'random' })
          try { mergedSettingsRef.current = JSON.parse(serialized) } catch (e) { mergedSettingsRef.current = resolvedSettings }
        }
      } catch (e) {
        // ignore failures setting current source
      }
      // Mark we just ran appliers; a useEffect will log the actual state
      // after React commits the updates (avoid stale-closure logs).
      try {
        lastApplierRunRef.current = Date.now()
      } catch (e) {}

      // Step 3: render map using the resolved nortContent
      toast.show('Generating map...')
      // Prepare outgoing settings for upload: copy original resolved settings
      // but ensure color fields that the UI edits (hex + alpha) are converted
      // back into the numeric strings the backend expects ("r,g,b" or "r,g,b,a").
      const outgoingSettings = Object.assign({}, resolvedSettings)
      try {
        if (coastShadingColorHex) {
          // `coastShadingAlpha` in the UI is a transparency percent (100 = fully transparent).
          // `formatColorString` expects an opacity percent (100 = fully opaque), so invert it.
          const opacityPercent = 100 - Number(coastShadingAlpha || 0)
          outgoingSettings.coastShadingColor = formatColorString(coastShadingColorHex, opacityPercent)
        }
      } catch (e) {
        // fallback to resolvedSettings values if conversion fails
      }

      try {
        if (oceanShadingColorHex) {
          // Use UI transparency slider (100 = fully transparent) to compute opacity
          const oceanOpacityPercent = 100 - Number(oceanShadingAlpha || 0)
          outgoingSettings.oceanShadingColor = formatColorString(oceanShadingColorHex, oceanOpacityPercent)
        }
      } catch (e) {}

      const settingsBlob = new Blob([JSON.stringify(outgoingSettings)], {
        type: 'application/json',
      })
      const renderFormData = new FormData()
      renderFormData.append('nortFile', settingsBlob, 'resolved-settings.nort')
      appendIfSet(renderFormData, 'language', requestLanguage)
      appendIfSet(renderFormData, 'mapLanguage', mapLanguage)
      // Server always returns image bytes; no flag required.
      // For preview/generate requests triggered from "Random Map" we only
      // want the image bytes. Avoid requesting merged .nort content which
      // can trigger a second apply of settings and overwrite UI values.
      const source = { type: 'random', name: 'Random Map' }

      
      await runGenerate(
        {
          method: 'POST',
          body: renderFormData,
        },
        'random-map',
        source,
        'preview',
        toast
      )
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
    try {
      // Handle background type flags that need to be set for server-side processing
      if (backgroundType === 'SolidColor') {
        parsedSettings.solidColorBackground = true
        parsedSettings.generateBackgroundFromTexture = false
      } else if (backgroundType === 'GeneratedFromTexture') {
        parsedSettings.solidColorBackground = false
        parsedSettings.generateBackgroundFromTexture = true
      } else {
        // FractalNoise or unknown - ensure texture flags are off
        parsedSettings.solidColorBackground = false
        parsedSettings.generateBackgroundFromTexture = false
      }

      // Border resource (artPack|name)
      if (borderRef) {
        const parts = borderRef.split('|', 2)
        if (parts.length === 2) {
          parsedSettings.borderResource = { artPack: parts[0], name: parts[1] }
        }
      }
      parsedSettings.borderWidth = Number(borderWidth)
      parsedSettings.borderPosition = borderPosition
      parsedSettings.borderColorOption = borderColorOption
      if (borderColorHex) {
        const hex = borderColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
          const r = parseInt(hex.substring(0, 2), 16)
          const g = parseInt(hex.substring(2, 4), 16)
          const b = parseInt(hex.substring(4, 6), 16)
          parsedSettings.borderColor = `${r},${g},${b}`
        } else {
          parsedSettings.borderColor = borderColorHex
        }
      }

      if (coastlineColorHex) {
        // suppressed debug: appending coastlineColorHex
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
          parsedSettings.frayedBorderColor = `${r2},${g2},${b2}`
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
          parsedSettings.coastlineColor = `${cr},${cg},${cb}`
        } else {
          parsedSettings.coastlineColor = coastlineColorHex
        }
      }

      // Coast shading
      if (Number.isFinite(Number(coastShadingLevel))) parsedSettings.coastShadingLevel = Number(coastShadingLevel)
      if (Number.isFinite(Number(coastShadingAlpha))) parsedSettings.coastShadingAlpha = Number(coastShadingAlpha)
      if (coastShadingColorHex) {
        // UI `coastShadingAlpha` is a transparency percent (100 = fully transparent).
        // Convert to opacity percent for formatColorString (100 = fully opaque).
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
            parsedSettings.coastShadingColor = `${csr},${csg},${csb}`
          } else {
            parsedSettings.coastShadingColor = coastShadingColorHex
          }
        }
      }

      // Ocean shading / waves
      if (Number.isFinite(Number(oceanShadingLevel))) parsedSettings.oceanShadingLevel = Number(oceanShadingLevel)
      if (Number.isFinite(Number(oceanShadingAlpha))) parsedSettings.oceanShadingAlpha = Number(oceanShadingAlpha)
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
            parsedSettings.oceanShadingColor = `${osr},${osg},${osb}`
          } else {
            parsedSettings.oceanShadingColor = oceanShadingColorHex
          }
        }
      }
      if (oceanWavesType) parsedSettings.oceanWavesType = oceanWavesType
      if (Number.isFinite(Number(oceanWavesLevel))) parsedSettings.oceanWavesLevel = Number(oceanWavesLevel)
      if (Number.isFinite(Number(concentricWaveCount))) parsedSettings.concentricWaveCount = Number(concentricWaveCount)
      parsedSettings.fadeConcentricWaves = Boolean(fadeConcentricWaves)
      parsedSettings.jitterToConcentricWaves = Boolean(jitterToConcentricWaves)
      parsedSettings.brokenLinesForConcentricWaves = Boolean(brokenLinesForConcentricWaves)
      if (oceanWavesColorHex) {
        const ow = oceanWavesColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(ow)) {
          const owr = parseInt(ow.substring(0, 2), 16)
          const owg = parseInt(ow.substring(2, 4), 16)
          const owb = parseInt(ow.substring(4, 6), 16)
          parsedSettings.oceanWavesColor = `${owr},${owg},${owb}`
        } else {
          parsedSettings.oceanWavesColor = oceanWavesColorHex
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
          parsedSettings.riverColor = `${rrr},${rrg},${rrb}`
        } else {
          parsedSettings.riverColor = riverColorHex
        }
      }

      // Roads
      // Roads
      parsedSettings.drawRoads = Boolean(drawRoads)
      if (roadStyle) {
        parsedSettings.roadStyle = { type: roadStyle, width: Number.isFinite(Number(roadWidth)) ? Number(roadWidth) : undefined }
      } else if (Number.isFinite(Number(roadWidth))) {
        // only width provided
        parsedSettings.roadStyle = { width: Number(roadWidth) }
      }
      if (roadColorHex) {
        const rh = roadColorHex.replace(/^#/, '')
        if (/^[0-9a-fA-F]{6}$/.test(rh)) {
          const rr = parseInt(rh.substring(0, 2), 16)
          const rg = parseInt(rh.substring(2, 4), 16)
          const rb = parseInt(rh.substring(4, 6), 16)
          parsedSettings.roadColor = `${rr},${rg},${rb}`
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
          parsedSettings.textColor = `${tr},${tg},${tb}`
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
          parsedSettings.boldBackgroundColor = `${br},${bg},${bb}`
        } else {
          parsedSettings.boldBackgroundColor = boldBackgroundColorHex
        }
        // Focused debug: only log coast/ocean shading values
        try {
          console.debug('Merged settings - coast/ocean shading:', {
            coastShadingColor: parsedSettings.coastShadingColor,
            coastShadingAlpha: parsedSettings.coastShadingAlpha,
            oceanShadingColor: parsedSettings.oceanShadingColor,
            oceanShadingAlpha: parsedSettings.oceanShadingAlpha,
          })
        } catch (dbg) {
          // ignore logging errors
        }
      }
      // suppressed: parsedSettings JSON debug
    } catch (e) {
      // Ignore merge failures; fall back to original parsedSettings
    }

    // Ensure map size/seed are stored inside the settings JSON so server only
    // needs to read the uploaded nort content to apply customization.
    if (finalWidth) parsedSettings.width = Number(finalWidth)
    if (finalHeight) parsedSettings.height = Number(finalHeight)
    if (finalSeed) parsedSettings.seed = finalSeed ? Number(finalSeed) : undefined

    // Expose merged settings for debugging and log key UI->merged mappings.
    try {
      if (typeof window !== 'undefined') {
        window.__lastMergedParsedSettings = parsedSettings
        console.debug('Merged settings debug', {
          ui: { borderWidth, coastlineWidth, drawBoldBackground, hillSize },
          merged: { borderWidth: parsedSettings.borderWidth, coastlineWidth: parsedSettings.coastlineWidth, drawBoldBackground: parsedSettings.drawBoldBackground, hillScale: parsedSettings.hillScale },
        })
      }
    } catch (dbg) {}

    const settingsBlob = new Blob([JSON.stringify(parsedSettings)], {
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
    if (finalWidth) fd.append('width', String(finalWidth))
    if (finalHeight) fd.append('height', String(finalHeight))
    if (finalSeed) fd.append('seed', String(finalSeed))
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
    appendIfSet(fd, 'regionBoundaryWidth', regionBoundaryWidth)
    appendIfSet(fd, 'regionBoundaryColorHex', regionBoundaryColorHex)
    fd.append('drawBorder', String(drawBorder))
    fd.append('drawGridOverlay', String(drawGridOverlay))
    fd.append('drawGrunge', String(drawGrunge))
    appendIfSet(fd, 'grungeWidth', grungeWidth)
    appendIfSet(fd, 'lineStyle', lineStyle)
    appendIfSet(fd, 'coastlineWidth', coastlineWidth)
    appendIfSet(fd, 'coastlineColorHex', coastlineColorHex)
    appendIfSet(fd, 'coastShadingLevel', coastShadingLevel)
    appendIfSet(fd, 'coastShadingColorHex', coastShadingColorHex)
    appendIfSet(fd, 'coastShadingAlpha', coastShadingAlpha)
    appendIfSet(fd, 'oceanShadingAlpha', oceanShadingAlpha)
    appendIfSet(fd, 'oceanShadingLevel', oceanShadingLevel)
    appendIfSet(fd, 'oceanShadingColorHex', oceanShadingColorHex)
    appendIfSet(fd, 'oceanWavesType', oceanWavesType)
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
    appendIfSet(fd, 'landColoringMethod', resolveLandColoringMethod(undefined))
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
    // Download in-memory merged settings directly without calling buildNortContentRequest.
    try {
      const mergedSettings = mergedSettingsRef.current
      if (!mergedSettings) {
        throw new Error('No merged settings available to download.')
      }
      const serialized = JSON.stringify(mergedSettings, null, 2)
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
          setWorldSize,
          setLandShape: handleLandShapeChange,
          setRegionCount,
          setLandColoringMethod: handleLandColoringMethodChange,
          setArtPack: handleArtPackChange,
          setCityIconType: handleCityIconTypeChange,
          setCityFrequency,
          setSelectedBooks: handleSelectedBooksChange,
          setRandomSeed,
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
        <span>{uiI18n.labels['ui.section.then'] || 'then'}</span>
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
        }}
        options={{
          textures,
          borderTypes,
          i18n: uiI18n,
        }}
        ui={{
          loading,
        }}
      />

      {error && <div className="error">{error}</div>}
    </div>
  )
}

GenerateForm.propTypes = {
  language: PropTypes.string,
}
