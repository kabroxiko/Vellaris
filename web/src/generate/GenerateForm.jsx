import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import CustomizeSettingsSection from './CustomizeSettingsSection'
import RandomSettingsSection from './RandomSettingsSection'
import { base64ToBlob, colorToHex, parseColorChannels } from './utils'
import { selectCityIconType, fetchJson, handleResponseError, tryParseJson as tryParse } from './helpers'
import { downloadNortContent } from './responseHandlers'
import {
  sanitizeFilenameBase,
  deriveNortFilenameFromContent,
  makeProgressToastController,
} from './sharedHelpers'
import { createSettingsAppliers } from './settingsAppliers'
import { getFrontendLabels } from '../i18n/webLabels'
import useGenerate from './hooks/useGenerate'
import {
  serializeNortObject,
  scaleSliderValue,
  computeGridOverlayAlpha,
  computeConcentricWaveCount,
  setResourceFromRef,
  parseBooleanWithDefault,
  persistCustomizeOverrides,
  loadRandomOverrides,
} from './GenerateForm.helpers'
import {
  applyBackgroundFlagsHoisted,
  applyResourcesAndTopLevelHoisted,
  applyGridAndColoringHoisted,
  applyBordersFrayedAndGrungeHoisted,
  applyCoastOceanAndWavesHoisted,
  applyRoadsAndScalesHoisted,
  applyTextAndBackgroundHoisted,
  mergeColor,
} from './GenerateForm.appliers'
const API_BASE = import.meta?.env?.VITE_API_BASE || '/api'
const RANDOM_OVERRIDES_STORAGE_KEY = 'vellaris-random-manual-overrides'
const CUSTOMIZE_OVERRIDES_STORAGE_KEY = 'vellaris-customize-overrides'
const cityIconTypesRequestByPack = new Map()
const uiOptionsCache = new Map()

// Populate city icon types cache (hoisted to module scope to satisfy S7721)
function populateCityIconTypes(byPack) {
  if (!byPack) return
  for (const pack of Object.keys(byPack)) {
    cityIconTypesRequestByPack.set(pack, Promise.resolve(byPack[pack]))
  }
}

// color helpers imported from sharedHelpers


// Hoisted helpers to apply UI values into parsed settings. These accept a
// context object with needed values and helper functions so they can be
// executed at module scope and keep `mergeUiIntoParsed` simple.
// Applier and background helper functions are moved to GenerateForm.appliers.js

// Helper: parse and set resource (artPack|name)
// Some helpers and appliers were moved to GenerateForm.helpers.js and GenerateForm.appliers.js


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

// Load UI options from backend and cache by language key. Tests spy on
// `helpers.fetchJson` and expect caching behavior, so keep this simple and
// promise-based.
async function loadUiOptions(lang) {
  if (!lang) lang = 'en'
  if (uiOptionsCache.has(lang)) return uiOptionsCache.get(lang)
  const p = fetchJson(`${API_BASE}/ui-options?lang=${encodeURIComponent(lang)}`)
  uiOptionsCache.set(lang, p)
  return p
}

function GenerateForm({ uiLanguage = 'en' }) {
  const initialRandomOverrides = useMemo(() => loadRandomOverrides(), [])
  // Always start with empty customize overrides so UI resets to backend defaults on load
  const initialCustomize = useMemo(() => ({}), [])
  const [preview, setPreview] = useState(null)
  const [currentSource, setCurrentSource] = useState(null)
  const requestLanguage = uiLanguage
  
  // Helpers for initial UI population to keep handleInitialUiOpts concise
  // use module-scoped `populateCityIconTypes` (hoisted) to satisfy S7721

  function computeInitialBooks(uiOpts) {
    const overrideBooks = Array.isArray(initialRandomOverrides.selectedBooks) ? initialRandomOverrides.selectedBooks : null
    const validBooks = overrideBooks ? overrideBooks.filter((b) => uiOpts.books?.includes(b)) : null
    let initialBooks
    if (validBooks?.length > 0) initialBooks = new Set(validBooks)
    else if (Array.isArray(uiOpts?.books)) initialBooks = new Set(uiOpts.books)
    else initialBooks = new Set()
    booksLoadedRef.current = true
    setSelectedBooks(initialBooks)
  }

  async function chooseArtPackAndLoad(uiOpts, defs) {
      const determinePackAndPreferred = (uiOptsLocal, defsLocal) => {
        const firstArtPack = Array.isArray(uiOptsLocal.artPacks) && uiOptsLocal.artPacks.length > 0 ? uiOptsLocal.artPacks[0] : null
        const chosenPack = artPack ?? firstArtPack ?? 'nortantis'
        const preferredCityDefault = defsLocal ? String(defsLocal.cityIconType ?? defsLocal.cityIconSetName ?? cityIconType) : cityIconType
        return { chosenPack, firstArtPack, preferredCityDefault }
      }

    const { chosenPack, firstArtPack, preferredCityDefault } = determinePackAndPreferred(uiOpts, defs)
    if (!artPack && firstArtPack) setArtPack(firstArtPack)
    const types = await loadCityIconTypes(chosenPack)
    handleCityIconTypesLoaded(types, preferredCityDefault)
  }

  async function mergeAndSetUiI18n(uiOpts) {
    const mergedLabels = await getMergedLabels(uiOpts)
    setUiI18n({ labels: mergedLabels, options: uiOpts.options })
  }

  async function getMergedLabels(uiOpts) {
    const frontendLabels = await getFrontendLabels(requestLanguage)
    const backendLabels = uiOpts?.labels
    if (backendLabels) return { ...frontendLabels, ...backendLabels }
    return frontendLabels
  }

  function setUiListsFromOptions(uiOpts) {
    setArtPacks(uiOpts?.artPacks)
    setAllBooks(uiOpts?.books)
    setTextures(uiOpts?.textures)
    setBorderTypes(uiOpts?.borderTypes)
  }

  function applyOptionDefaults(opts, defs) {
    if (!opts) return
    if (!backgroundType && Array.isArray(opts.backgroundTypes) && opts.backgroundTypes.length > 0) setBackgroundType(opts.backgroundTypes[0].value)
    if (!finalLandColoringMethod && Array.isArray(opts.finalLandColoringMethods) && opts.finalLandColoringMethods.length > 0) setFinalLandColoringMethod(opts.finalLandColoringMethods[0].value)
    if (!regionBoundaryStyle && Array.isArray(opts.lineStyles) && opts.lineStyles.length > 0) setRegionBoundaryStyle(opts.lineStyles[0].value)
    if (defs) applyServerDefaults(defs, opts)
  }

  async function handleInitialUiOpts(uiOpts) {
    setUiListsFromOptions(uiOpts)
    const defs = uiOpts.defaults

    populateCityIconTypes(uiOpts.cityIconTypesByPack)
    computeInitialBooks(uiOpts)
    await chooseArtPackAndLoad(uiOpts, defs)
    await mergeAndSetUiI18n(uiOpts)

    // Apply server option defaults and backend `defaults` so UI resets to canonical backend values on load.
    applyOptionDefaults(uiOpts.options, defs)

    // Persist the raw backend defaults so we can later force-apply them to the UI once the settings appliers are available.
    lastUiDefaultsRef.current = uiOpts.defaults ?? null
  }

  // --- Random Map state ---
  const [artPacks, setArtPacks] = useState([])
  const [artPack, setArtPack] = useState(initialRandomOverrides.artPack)
  const [dimension, setDimension] = useState(initialRandomOverrides.dimension)
  const [worldSize, setWorldSize] = useState(0)
  const [landShape, setLandShape] = useState(initialRandomOverrides.landShape)
  const [regionCount, setRegionCount] = useState(0)
  const [landColoringMethod, setLandColoringMethod] = useState(initialRandomOverrides.landColoringMethod)
  const [cityIconTypes, setCityIconTypes] = useState([])
  const [cityIconType, setCityIconType] = useState(initialRandomOverrides.cityIconType)
  const [cityFrequency, setCityFrequency] = useState(0)
  const [allBooks, setAllBooks] = useState([])
  const [selectedBooks, setSelectedBooks] = useState(new Set())
  const [randomSeed, setRandomSeed] = useState('')
  const [mapLanguage, setMapLanguage] = useState(initialRandomOverrides.mapLanguage ?? uiLanguage)

  // --- Generate from Settings state ---
  const [fileName, setFileName] = useState('')
  const [fileObj, setFileObj] = useState(null)
  const [finalWidth, setFinalWidth] = useState(0)
  const [finalHeight, setFinalHeight] = useState(0)
  const [finalSeed, setFinalSeed] = useState('')

  // --- Generate from Settings: theme overrides ---
  const [backgroundType, setBackgroundType] = useState(initialCustomize.backgroundType)
  const [textures, setTextures] = useState([])
  const [borderTypes, setBorderTypes] = useState([])
  const [textureRef, setTextureRef] = useState(initialCustomize.textureRef)
  const [backgroundSeed, setBackgroundSeed] = useState(initialCustomize.backgroundSeed)
  const [drawRegionBoundaries, setDrawRegionBoundaries] = useState(initialCustomize.drawRegionBoundaries)
  const [colorizeLand, setColorizeLand] = useState(initialCustomize.colorizeLand)
  const [colorizeOcean, setColorizeOcean] = useState(initialCustomize.colorizeOcean)
  const [oceanColorHex, setOceanColorHex] = useState(initialCustomize.oceanColorHex)
  const [landColorHex, setLandColorHex] = useState(initialCustomize.landColorHex)
  const [regionBoundaryStyle, setRegionBoundaryStyle] = useState(initialCustomize.regionBoundaryStyle)
  const [regionBoundaryWidth, setRegionBoundaryWidth] = useState(initialCustomize.regionBoundaryWidth)
  const [regionBoundaryColorHex, setRegionBoundaryColorHex] = useState(initialCustomize.regionBoundaryColorHex)
  const [drawBorder, setDrawBorder] = useState(initialCustomize.drawBorder)
  const [drawGridOverlay, setDrawGridOverlay] = useState(initialCustomize.drawGridOverlay)
  const [gridOverlayShape, setGridOverlayShape] = useState(initialCustomize.gridOverlayShape)
  const [gridOverlayRowOrColCount, setGridOverlayRowOrColCount] = useState(initialCustomize.gridOverlayRowOrColCount)
  const [gridOverlayColorHex, setGridOverlayColorHex] = useState(initialCustomize.gridOverlayColorHex)
  const [gridOverlayXOffset, setGridOverlayXOffset] = useState(initialCustomize.gridOverlayXOffset)
  const [gridOverlayYOffset, setGridOverlayYOffset] = useState(initialCustomize.gridOverlayYOffset)
  const [gridOverlayLineWidth, setGridOverlayLineWidth] = useState(initialCustomize.gridOverlayLineWidth)
  const [gridOverlayLayer, setGridOverlayLayer] = useState(initialCustomize.gridOverlayLayer)
  const [drawVoronoiGridOverlayOnlyOnLand, setDrawVoronoiGridOverlayOnlyOnLand] = useState(initialCustomize.drawVoronoiGridOverlayOnlyOnLand)
  
  const [finalLandColoringMethod, setFinalLandColoringMethod] = useState(initialCustomize.finalLandColoringMethod)
  const [borderRef, setBorderRef] = useState(initialCustomize.borderRef)
  const [borderWidth, setBorderWidth] = useState(initialCustomize.borderWidth)
  const [borderPosition, setBorderPosition] = useState(initialCustomize.borderPosition)
  const [borderColorOption, setBorderColorOption] = useState(initialCustomize.borderColorOption)
  const [borderColorHex, setBorderColorHex] = useState(initialCustomize.borderColorHex)
  const [frayedBorder, setFrayedBorder] = useState(initialCustomize.frayedBorder)
  const [frayedBorderBlurLevel, setFrayedBorderBlurLevel] = useState(initialCustomize.frayedBorderBlurLevel)
  const [frayedBorderSize, setFrayedBorderSize] = useState(initialCustomize.frayedBorderSize)
  const [frayedBorderSeed, setFrayedBorderSeed] = useState(initialCustomize.frayedBorderSeed)
  const [drawGrunge, setDrawGrunge] = useState(initialCustomize.drawGrunge)
  
  const [grungeWidth, setGrungeWidth] = useState(initialCustomize.grungeWidth)
  const [frayedBorderColorHex, setFrayedBorderColorHex] = useState(initialCustomize.frayedBorderColorHex)
  const [lineStyle, setLineStyle] = useState(initialCustomize.lineStyle)
  const [coastlineWidth, setCoastlineWidth] = useState(initialCustomize.coastlineWidth)
  const [coastlineColorHex, setCoastlineColorHex] = useState(initialCustomize.coastlineColorHex)
  const [coastShadingLevel, setCoastShadingLevel] = useState(initialCustomize.coastShadingLevel)
  const [coastShadingColorHex, setCoastShadingColorHex] = useState(initialCustomize.coastShadingColorHex)
  const [coastShadingAlpha, setCoastShadingAlpha] = useState(initialCustomize.coastShadingAlpha)
  const [oceanShadingAlpha, setOceanShadingAlpha] = useState(initialCustomize.oceanShadingAlpha)
  const [oceanShadingLevel, setOceanShadingLevel] = useState(initialCustomize.oceanShadingLevel)
  const [oceanShadingColorHex, setOceanShadingColorHex] = useState(initialCustomize.oceanShadingColorHex)
  const [oceanWavesType, setOceanWavesType] = useState(initialCustomize.oceanWavesType)
  const [oceanWavesLevel, setOceanWavesLevel] = useState(initialCustomize.oceanWavesLevel)
  const [oceanWavesColorHex, setOceanWavesColorHex] = useState(initialCustomize.oceanWavesColorHex)
  const [oceanWavesAlpha, setOceanWavesAlpha] = useState(initialCustomize.oceanWavesAlpha)
  const [concentricWaveCount, setConcentricWaveCount] = useState(initialCustomize.concentricWaveCount)
  const [fadeConcentricWaves, setFadeConcentricWaves] = useState(initialCustomize.fadeConcentricWaves)
  const [jitterToConcentricWaves, setJitterToConcentricWaves] = useState(initialCustomize.jitterToConcentricWaves)
  const [brokenLinesForConcentricWaves, setBrokenLinesForConcentricWaves] = useState(initialCustomize.brokenLinesForConcentricWaves)
  const [drawOceanEffectsInLakes, setDrawOceanEffectsInLakes] = useState(initialCustomize.drawOceanEffectsInLakes)
  const [riverColorHex, setRiverColorHex] = useState(initialCustomize.riverColorHex)
  const [drawRoads, setDrawRoads] = useState(initialCustomize.drawRoads)
  const [roadStyle, setRoadStyle] = useState(initialCustomize.roadStyle)
  const [roadWidth, setRoadWidth] = useState(initialCustomize.roadWidth)
  const [roadColorHex, setRoadColorHex] = useState(initialCustomize.roadColorHex)
  const [mountainSize, setMountainSize] = useState(initialCustomize.mountainSize)
  const [hillSize, setHillSize] = useState(initialCustomize.hillSize)
  const [duneSize, setDuneSize] = useState(initialCustomize.duneSize)
  const [treeHeight, setTreeHeight] = useState(initialCustomize.treeHeight)
  const [citySize, setCitySize] = useState(initialCustomize.citySize)
  const [drawText, setDrawText] = useState(initialCustomize.drawText)
  const [titleFontFamily, setTitleFontFamily] = useState(initialCustomize.titleFontFamily)
  const [regionFontFamily, setRegionFontFamily] = useState(initialCustomize.regionFontFamily)
  const [mountainRangeFontFamily, setMountainRangeFontFamily] = useState(initialCustomize.mountainRangeFontFamily)
  const [otherMountainsFontFamily, setOtherMountainsFontFamily] = useState(initialCustomize.otherMountainsFontFamily)
  const [citiesFontFamily, setCitiesFontFamily] = useState(initialCustomize.citiesFontFamily)
  const [riverFontFamily, setRiverFontFamily] = useState(initialCustomize.riverFontFamily)
  const [textColorHex, setTextColorHex] = useState(initialCustomize.textColorHex)
  const [drawBoldBackground, setDrawBoldBackground] = useState(initialCustomize.drawBoldBackground)
  const [boldBackgroundColorHex, setBoldBackgroundColorHex] = useState(initialCustomize.boldBackgroundColorHex)

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
  const handleSuccessRef = useRef(null)

  const runGenerate = useGenerate({ apiBase: API_BASE, handleResponseError, base64ToBlob, downloadNortContent, tryParse, serializeNortObject, handleSuccessRef, setError, setLoading })

  const customizeDeps = [
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
  ]

  // Collect all current customize-related values into a single object so
  // multiple call-sites can reuse the same shape without duplicating lists.
  function collectCustomizeValues() {
    return {
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
      regionBoundaryStyle,
      regionBoundaryWidth,
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
    }
  }

  // Debug: log when key border/grunge state values change so we can
  // confirm setters updated the React state.
  useEffect(() => {
    // state-change: border/grunge (debug suppressed)
  }, [borderWidth, grungeWidth, drawGrunge])

  useEffect(() => {
    localStorage.setItem(RANDOM_OVERRIDES_STORAGE_KEY, JSON.stringify(randomOverrides))
  }, [randomOverrides])

  // Persist Customize panel values so they are restored on next load
  useEffect(() => {
    persistCustomizeOverrides(collectCustomizeValues())
  }, customizeDeps)

  // Load UI option labels and resource lists on mount so the Customize
  // panel can display meaningful options instead of random placeholder
  // text. If the user has no saved customize overrides, apply sensible
  // defaults from the server-provided options.
  useEffect(() => {
    initializeUiForLanguage(requestLanguage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestLanguage])

  // (debug logging removed)

  async function initializeUiForLanguage(lang) {
    const uiOpts = await loadUiOptions(lang)
    if (uiOpts) await handleInitialUiOpts(uiOpts)
    setUiLoaded(true)
  }


  // Apply backend `defaults` to the UI using the existing setters.
  function applyServerDefaults(defs, opts) {
    // Helper setters shared across appliers
    const setHex = (setter, value) => { if (value) { const h = colorToHex(value); if (h) setter(h) } }
    const setNumber = (setter, value) => { if (Number.isFinite(Number(value))) setter(Number(value)) }
    const setString = (setter, value) => { if (value !== undefined && value !== null) setter(String(value)) }
    const setBoolean = (setter, value) => { if (typeof value === 'boolean') setter(value) }

    // Helper to set alpha either from explicit alpha value or by parsing color channels
    const setAlphaFromValueOrColor = (alphaVal, colorVal, setter) => {
      if (alphaVal !== undefined && alphaVal !== null) {
        setter(alphaVal)
        return
      }
      if (colorVal) {
        const ch = parseColorChannels(colorVal)
        if (ch?.a !== undefined && Number.isFinite(Number(ch.a))) setter(Number(ch.a))
      }
    }

    // Convert a scale (e.g. 0.5-3) to the UI slider range [1..15]
    const convertScaleToSlider = (scale) => {
      const s = Number(scale)
      if (!Number.isFinite(s)) return undefined
      const sliderValueFor1Scale = 5
      const scaleMax = 3
      const scaleMin = 0.5
      const minScaleSliderValue = 1
      const maxScaleSliderValue = 15
      const v1Slope = (sliderValueFor1Scale - minScaleSliderValue) / (1 - scaleMin)
      const v1YIntercept = sliderValueFor1Scale - v1Slope
      const v2Slope = (maxScaleSliderValue - sliderValueFor1Scale) / (scaleMax - 1)
      const v2YIntercept = sliderValueFor1Scale - v2Slope * 1
      let v
      if (s <= 1) v = v1Slope * s + v1YIntercept
      else v = v2Slope * s + v2YIntercept
      v = Math.round(v)
      if (v < minScaleSliderValue) v = minScaleSliderValue
      if (v > maxScaleSliderValue) v = maxScaleSliderValue
      return v
    }

    // Handle flexible roadStyle formats and color/width properties
    const applyRoadStyleHelper = (defs) => {
      if (typeof defs.roadStyle === 'object' && defs.roadStyle !== null) {
        if (typeof defs.roadStyle.type === 'string') setString(setRoadStyle, defs.roadStyle.type)
        if (Number.isFinite(Number(defs.roadStyle.width))) setNumber(setRoadWidth, Number(defs.roadStyle.width))
      } else if (typeof defs.roadStyle === 'string') {
        setString(setRoadStyle, defs.roadStyle)
      }
      if (Number.isFinite(Number(defs.roadWidth))) setNumber(setRoadWidth, defs.roadWidth)
      setHex(setRoadColorHex, defs.roadColor)
    }

    const applyBasicSettings = (defs, opts) => {
      setNumber(setWorldSize, defs.worldSize)
      setNumber(setRegionCount, defs.regionCount)
      if (defs.cityProbability !== undefined && opts?.maxCityProbability !== undefined) {
        setNumber(setCityFrequency, (Number(defs.cityProbability) / Number(opts.maxCityProbability)) * 100)
      }
      setNumber(setFinalWidth, defs.generatedWidth)
      setNumber(setFinalHeight, defs.generatedHeight)
      setString(setMapLanguage, defs.mapLanguage)
      setString(setDimension, defs.dimension)
      setString(setLandShape, defs.landShape)
      setString(setArtPack, defs.artPack)
      setString(setCityIconType, defs.cityIconType ?? defs.cityIconSetName)
    }

    const applyGridAndBorders = (defs) => {
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
    }

    const applyOceanAndRoads = (defs) => {
      setNumber(setCoastShadingLevel, defs.coastShadingLevel)
      setHex(setCoastShadingColorHex, defs.coastShadingColor)
      setAlphaFromValueOrColor(defs.coastShadingAlpha, defs.coastShadingColor, setNumber.bind(null, setCoastShadingAlpha))
      setAlphaFromValueOrColor(defs.oceanShadingAlpha, defs.oceanShadingColor, setNumber.bind(null, setOceanShadingAlpha))
      setNumber(setOceanShadingLevel, defs.oceanShadingLevel)
      setHex(setOceanShadingColorHex, defs.oceanShadingColor)
      setString(setOceanWavesType, defs.oceanWavesType)
      setNumber(setOceanWavesLevel, defs.oceanWavesLevel)
      setHex(setOceanWavesColorHex, defs.oceanWavesColor)
      setAlphaFromValueOrColor(defs.oceanWavesAlpha, defs.oceanWavesColor, setNumber.bind(null, setOceanWavesAlpha))
      setNumber(setConcentricWaveCount, defs.concentricWaveCount)
      setBoolean(setFadeConcentricWaves, defs.fadeConcentricWaves)
      setBoolean(setJitterToConcentricWaves, defs.jitterToConcentricWaves)
      setBoolean(setBrokenLinesForConcentricWaves, defs.brokenLinesForConcentricWaves)
      setBoolean(setDrawOceanEffectsInLakes, defs.drawOceanEffectsInLakes)
      setHex(setRiverColorHex, defs.riverColor)
      setBoolean(setDrawRoads, defs.drawRoads)
      applyRoadStyleHelper(defs)
    }

    // Apply a scale-or-size mapping for standard elements
    const applyScaleOrSize = (scaleProp, sizeProp, setter) => {
      if (defs[scaleProp] !== undefined && defs[scaleProp] !== null && Number.isFinite(Number(defs[scaleProp]))) {
        const v = convertScaleToSlider(defs[scaleProp])
        if (v !== undefined) setter(v)
      } else if (Number.isFinite(Number(defs[sizeProp]))) {
        setter(defs[sizeProp])
      }
    }

    const applySizeMappings = (defs) => {
        applyScaleOrSize('mountainScale', 'mountainSize', (v) => setNumber(setMountainSize, v))
        applyScaleOrSize('hillScale', 'hillSize', (v) => setNumber(setHillSize, v))
        applyScaleOrSize('duneScale', 'duneSize', (v) => setNumber(setDuneSize, v))
        if (defs.treeHeightScale !== undefined && defs.treeHeightScale !== null && Number.isFinite(Number(defs.treeHeightScale))) {
          const s = Number(defs.treeHeightScale)
          let v = Math.round((s - 0.1) / 0.05)
          if (v < 1) v = 1
          if (v > 15) v = 15
          setNumber(setTreeHeight, v)
        } else if (Number.isFinite(Number(defs.treeHeight))) {
          setNumber(setTreeHeight, defs.treeHeight)
        }
        applyScaleOrSize('cityScale', 'citySize', (v) => setNumber(setCitySize, v))

    }

    const applyTextAndFonts = (defs, opts) => {
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
      const backendDefaultFont = opts?.defaultFontFamily ?? (Array.isArray(opts?.fonts) && opts.fonts.length > 0 ? opts.fonts[0] : null)
      if (backendDefaultFont) {
        const fontSetters = [
          [titleFontFamily, setTitleFontFamily],
          [regionFontFamily, setRegionFontFamily],
          [mountainRangeFontFamily, setMountainRangeFontFamily],
          [otherMountainsFontFamily, setOtherMountainsFontFamily],
          [citiesFontFamily, setCitiesFontFamily],
          [riverFontFamily, setRiverFontFamily],
        ]
        fontSetters.forEach(([current, setter]) => { if (!current) setter(backendDefaultFont) })
      }
      if (Array.isArray(defs.books)) setSelectedBooks(new Set(defs.books))
    }

    // Delegate to smaller appliers
    applyBasicSettings(defs, opts)
    applyGridAndBorders(defs)
    applyOceanAndRoads(defs)
    applySizeMappings(defs)
    applyTextAndFonts(defs, opts)
  }

  // Generate from a .nort JSON string by POSTing it to the generate endpoint.
  // Hoisted to component scope so callers outside `applyServerDefaults` can use it.
  const generateFromNortContent = async (nortContent, toast) => {
    toast.show(uiI18n?.labels?.['ui.generating'])
    const parsedReturned = tryParse(nortContent)
    if (parsedReturned && Object.hasOwn(randomOverrides, 'mapLanguage') && mapLanguage) parsedReturned.language = mapLanguage
    if (parsedReturned && Object.hasOwn(randomOverrides, 'cityIconType') && cityIconType) parsedReturned.cityIconSetName = cityIconType
    const bodyPayload = parsedReturned ?? tryParse(nortContent)
    await runGenerate({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPayload) }, 'random-map', { type: 'random', name: 'Random Map', nortContent }, 'preview', toast)
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
        // Re-fetch ui-options (no seed support) so lists reflect any
        // backend-generated defaults—server will ignore any seed.
        const uiOpts = await loadUiOptions(requestLanguage)
        if (!uiOpts) return
        setArtPacks(uiOpts.artPacks)
        setAllBooks(uiOpts.books)
        setTextures(uiOpts.textures)
        setBorderTypes(uiOpts.borderTypes)
        const defs = uiOpts.defaults

        const byPack = uiOpts.cityIconTypesByPack
        if (byPack) {
          for (const pack of Object.keys(byPack)) {
            cityIconTypesRequestByPack.set(pack, Promise.resolve(byPack[pack]))
          }
        }

        // Merge backend i18n labels with frontend labels
        const frontendLabels = await getFrontendLabels(requestLanguage)
        const backendLabels = uiOpts.labels
        const mergedLabels = { ...frontendLabels }
        if (backendLabels) Object.assign(mergedLabels, backendLabels)
        // Pass backend options through exactly as received (no mapping).
        setUiI18n({ labels: mergedLabels, options: uiOpts.options })

        // Persist the raw backend defaults so appliers can apply them
        lastUiDefaultsRef.current = defs

        // update to the newly-seeded canonical values returned by the
        // server. Use the same appliers as initial-load so behaviour is
        // consistent.
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
          lastApplierRunRef.current = Date.now()
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
      collectCustomizeValues()),
    customizeDeps
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

    lastApplierRunRef.current = Date.now()
    // GenerateForm: applied ui-options.defaults via appliers (debug suppressed)

    // If a merged `.nort` settings object is present (e.g., user loaded a
    // .nort file or server returned merged settings), re-apply those
    // settings so `.nort` customization values take precedence over the
    // canonical `ui-options.defaults`. Do not synthesize any values here;
    // only apply explicit values found in the `.nort` payload.
    const merged = mergedSettingsRef.current
    if (merged && typeof merged === 'object') {
      ap.applyMapSizeAndSeedSettings(merged)
      ap.applyBackgroundTypeSettings(merged)
      ap.applyColorAndBoundarySettings(merged)
      ap.applyBorderSettings(merged)
      ap.applyFrayedBorderSettings(merged)
      ap.applyCoastlineSettings(merged)
      ap.applyOceanSettings(merged)
      ap.applyRoadAndScaleSettings(merged)
      ap.applyTextSettings(merged)
      lastApplierRunRef.current = Date.now()
      // GenerateForm: re-applied merged .nort settings via appliers (debug suppressed)
    }

    // Ensure the Random Seed input starts empty on initial load per UX rules.
    // The backend may provide a canonical `randomSeed` for reproducible
    // generation, but the UI should present an empty seed so users opt-in
    // to supplying a manual seed. Clear the state and remove any stored
    // override for `randomSeed`.
    // Fill the Random Seed input with the backend-provided canonical
    // seed when present so the UI reflects the generated preset.
    const seedVal = defs?.randomSeed == null ? '' : String(defs.randomSeed)
    setRandomSeed(seedVal)
    updateRandomOverride('randomSeed', seedVal || null)

    // Ensure font family controls are initialized to backend canonical
    // default if available.
    const opts = uiI18n.options
    let backendDefaultFont = null
    if (opts?.defaultFontFamily) backendDefaultFont = opts.defaultFontFamily
    else if (Array.isArray(opts?.fonts) && opts.fonts.length > 0) backendDefaultFont = opts.fonts[0]
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
    const pack = artPack ?? 'nortantis'
    loadCityIconTypes(pack)
      .then((types) => handleCityIconTypesLoaded(types, cityIconType))
      
  }, [artPack])

  useEffect(() => {
    if (!currentSource?.nortContent) return
    // Parse the current source content and apply appliers. Do not perform
    // ad-hoc, case-by-case merges here — the canonical merged settings
    // are stored in `mergedSettingsRef` and UI helper values (hex/alpha)
    // are derived from canonical numeric colors where appropriate.
    let settings = tryParse(currentSource.nortContent)
    if (!settings) {
      globalThis.showToast?.('Loaded settings file is not valid JSON.', { type: 'warning', duration: 6000 })
      return
    }
    // mark origin so appliers can log which source triggered them
    settings.__applierSource = 'currentSource'
    // Always apply map size and seed settings so the Random panel
    // reflects server-resolved values (width, height, seed, worldSize, etc.).
    appliersRef.current.applyMapSizeAndSeedSettings(settings)
    appliersRef.current.applyBackgroundTypeSettings(settings)
    appliersRef.current.applyColorAndBoundarySettings(settings)
    appliersRef.current.applyBorderSettings(settings)
    appliersRef.current.applyFrayedBorderSettings(settings)
    appliersRef.current.applyCoastlineSettings(settings)
    appliersRef.current.applyOceanSettings(settings)
    appliersRef.current.applyRoadAndScaleSettings(settings)
    appliersRef.current.applyTextSettings(settings)
    lastApplierRunRef.current = Date.now()
  }, [currentSource?.nortContent, currentSource?.originType])

  // When the user switches wave type to show concentric controls, prefer
  // values from the last-loaded/merged settings if the UI still has the
  // initial defaults. This ensures a loaded `.nort`'s concentric settings
  // become visible when the controls are revealed.
  useEffect(() => {
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
          let parsedSettings = tryParse(text)
          if (!parsedSettings) throw new Error('Loaded settings file is not valid JSON.')
          const _p = tryParse(text)
          mergedSettingsRef.current = _p ?? parsedSettings
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
      if (nortContent) {
        const derived = deriveNortFilenameFromContent(nortContent)
        if (derived) filenameBase = derived
      }
      const filename = `${sanitizeFilenameBase(filenameBase, 'vellaris-map')}.png`
      return {
        url,
        filename,
            sourceLabel: source?.type === 'random' ? 'Random Map' : (source?.name ?? fileName ?? 'Generated from Settings'),
      }
    })
    if (nortContent) {
          // suppressed debug: handleSuccess nortContent details
      setCurrentSource({
        type: 'nort-content',
        name: source?.name ?? fileName ?? 'Generated settings',
        nortContent,
        originType: source?.type,
      })
      const parsed = tryParse(nortContent)
      if (parsed) mergedSettingsRef.current = parsed
    } else if (source) {
      // Do not overwrite currentSource when server did not return merged
      // nortContent. In particular, generating from the Customize panel
      // should not reset custom control values by replacing the source
      // with a bare `source` object. If the previous `currentSource` had
      // a `nortContent` blob (and thus the UI has state derived from it),
      // keep it.
      setCurrentSource((prev) => {
        if (source?.type === 'random' && prev?.nortContent) return prev
        // If the source we're about to set already contains nortContent,
        // avoid clobbering the previous source which may have UI overrides.
        if (source?.nortContent && prev?.nortContent) return prev
        return source
      })
    }
    globalThis.showToast?.('Map generated', { type: 'success', duration: 3000 })
    // Mark that a generation completed successfully and clear dirty flag
    setHasGeneratedOnce(true)
    setCustomizationDirty(false)
  }
  // expose handleSuccess to the generate hook
  handleSuccessRef.current = handleSuccess

  // processGenerateResponse and runGenerate are provided by the `useGenerate` hook.

  // `runGenerate` is provided by the `useGenerate` hook above.

  // Build the random configuration payload from current UI state and manual overrides
  const buildRandomCfg = () => {
    const isManual = (k) => Object.hasOwn(randomOverrides, k)
    const cfg = {}

    const appliers = [
      ['mapLanguage', () => { cfg.language = mapLanguage }],
      ['randomSeed', () => { cfg.randomSeed = randomSeed ? Number(randomSeed) : undefined }],
      ['artPack', () => { cfg.artPack = artPack }],
      ['dimension', () => { cfg.dimension = dimension }],
      ['worldSize', () => { cfg.worldSize = worldSize }],
      ['landShape', () => { cfg.landShape = landShape }],
      ['regionCount', () => { cfg.regionCount = regionCount }],
      ['landColoringMethod', () => { cfg.drawRegionColors = landColoringMethod ? (landColoringMethod === 'ColorPoliticalRegions') : undefined }],
      ['cityFrequency', () => { cfg.cityFrequency = cityFrequency }],
      ['cityIconType', () => { cfg.cityIconSetName = cityIconType }],
      ['selectedBooks', () => { if (selectedBooks && selectedBooks.size > 0) cfg.books = Array.from(selectedBooks) }],
    ]

    for (const [key, apply] of appliers) {
      if (isManual(key)) apply()
    }

    return cfg
  }

  const fetchResolvedNort = async (cfg) => {
    const settingsRes = await fetch(`${API_BASE}/generate-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    if (!settingsRes.ok) await handleResponseError(settingsRes)
    const resolvedTxt = await settingsRes.text()
    return resolvedTxt
  }
  const applyReturnedSettingsToUi = (nortContent) => {
    const parsed = tryParse(nortContent)
    if (parsed) mergedSettingsRef.current = parsed
    appliersRef.current.applyMapSizeAndSeedSettings(mergedSettingsRef.current)
    appliersRef.current.applyBackgroundTypeSettings(mergedSettingsRef.current)
  }

  async function handleRandomMap(evt) {
    evt.preventDefault()
    setError(null)
    setLoading(true)
    const toast = makeProgressToastController()
    await doRandomMap(toast).catch((err) => {
      setError(err.message)
      globalThis.showToast?.(err.message, { type: 'error', duration: 6000 })
    }).finally(() => {
      setLoading(false)
      toast.hide()
    })
  }

  const doRandomMap = async (toast) => {
    // Build, resolve, and request the generated map using small helpers
    toast.show(uiI18n?.labels?.['ui.preparing'] || 'Preparing map settings...')
    const cfg = buildRandomCfg()
    const nortContent = await fetchResolvedNort(cfg)
    applyReturnedSettingsToUi(nortContent)
    // Now request final image by POSTing the returned .nort JSON
    await generateFromNortContent(nortContent, toast)
  }

  function resolveLandColoringMethod(fallbackMethod) {
    // Server-side region shading expects region index data; when texture land colorization
    // is disabled, forcing SingleColor avoids an invalid drawRegionColors combination.
    if (backgroundType === 'GeneratedFromTexture' && !colorizeLand) {
      return 'SingleColor'
    }
    return finalLandColoringMethod ?? fallbackMethod
  }

  // use hoisted helpers (parseHexColor, hexToRgbaString, mergeColor,
  // setResourceFromRef, parseBooleanWithDefault, scaleSliderValue,
  // exposeSettingsForDebugging) to satisfy S7721
  // Helper: preserve grid overlay alpha from prior settings if color unchanged
  function getGridOverlayAlpha() {
    return computeGridOverlayAlpha(mergedSettingsRef?.current?.gridOverlayColor, gridOverlayColorHex)
  }

  // Helper: handle wave count preservation
  function getConcentricWaveCount() {
    return computeConcentricWaveCount(mergedSettingsRef?.current?.concentricWaveCount, concentricWaveCount)
  }

  

  // Merge current UI theme/visual settings into a parsed settings object.
  // Reused by buildNortContentRequest and random-map outgoing settings.
  function mergeUiIntoParsed(parsedSettings) {
      // Execute hoisted helpers with a context object to avoid nesting
      applyBackgroundFlagsHoisted(parsedSettings, backgroundType)
      applyResourcesAndTopLevelHoisted(parsedSettings, { setResourceFromRef, borderRef, textureRef, backgroundSeed, artPack, worldSize, landShape, regionCount, randomSeed, selectedBooks })
      applyGridAndColoringHoisted(parsedSettings, { regionBoundaryStyle, regionBoundaryWidth, regionBoundaryColorHex, drawRegionBoundaries, colorizeLand, colorizeOcean, oceanColorHex, landColorHex, drawGridOverlay, gridOverlayShape, gridOverlayRowOrColCount, gridOverlayColorHex, gridOverlayXOffset, gridOverlayYOffset, gridOverlayLineWidth, gridOverlayLayer, drawVoronoiGridOverlayOnlyOnLand, resolveLandColoringMethod, finalLandColoringMethod, mergeColor, getGridOverlayAlpha })
      applyBordersFrayedAndGrungeHoisted(parsedSettings, { borderWidth, borderPosition, borderColorOption, borderColorHex, frayedBorder, frayedBorderBlurLevel, frayedBorderSize, frayedBorderSeed, drawGrunge, grungeWidth, frayedBorderColorHex, mergeColor })
      applyCoastOceanAndWavesHoisted(parsedSettings, { lineStyle, coastlineWidth, coastlineColorHex, coastShadingLevel, coastShadingColorHex, coastShadingAlpha, oceanShadingLevel, oceanShadingColorHex, oceanShadingAlpha, oceanWavesType, oceanWavesLevel, getConcentricWaveCount, fadeConcentricWaves, jitterToConcentricWaves, brokenLinesForConcentricWaves, mergeColor, oceanWavesColorHex, drawOceanEffectsInLakes, riverColorHex, parseBooleanWithDefault, mergedSettingsRef })
      applyRoadsAndScalesHoisted(parsedSettings, { drawRoads, roadStyle, roadWidth, mergeColor, roadColorHex, mountainSize, hillSize, duneSize, treeHeight, citySize, scaleSliderValue })
      applyTextAndBackgroundHoisted(parsedSettings, { drawText, textColorHex, drawBoldBackground, boldBackgroundColorHex, mergeColor })
  }

  function parseNortSettings(explicitNortContent) {
    if (explicitNortContent) {
      return tryParse(explicitNortContent)
    }
    if (mergedSettingsRef?.current) {
      return cloneMergedSettings()
    }
    return tryParse(currentSource?.nortContent)
  }

  function cloneMergedSettings() {
    if (!mergedSettingsRef?.current) return null
    if (typeof structuredClone === 'function') return structuredClone(mergedSettingsRef.current)
    const str = JSON.stringify(mergedSettingsRef.current)
    const parsed = tryParse(str)
    return parsed ?? mergedSettingsRef.current
  }

  function updateSettingsWithDimensions(parsedSettings) {
    if (finalWidth) parsedSettings.generatedWidth = Number(finalWidth)
    if (finalHeight) parsedSettings.generatedHeight = Number(finalHeight)
    if (finalSeed) parsedSettings.randomSeed = Number(finalSeed)
  }

  // use hoisted `exposeSettingsForDebugging` to satisfy S7721

  function buildNortContentRequest({ explicitNortContent = null } = {}) {
    let parsedSettings = parseNortSettings(explicitNortContent)
    if (!parsedSettings) throw new Error('Current settings are not valid JSON.')

    mergeUiIntoParsed(parsedSettings)

    updateSettingsWithDimensions(parsedSettings)

    if (mapLanguage) parsedSettings.language = mapLanguage
    serializeNortObject(parsedSettings)

    return {
      requestOptions: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedSettings),
      },
      baseName: (preview?.filename ?? 'generated-map.png').replace(/\.png$/, ''),
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
    let result
    try {
      result = buildNortContentRequest()
    } catch (err) {
      const message = err?.message ?? 'Cannot download merged settings.'
      globalThis.showToast?.(message, { type: 'warning', duration: 6000 })
      return
    }
    const body = result.requestOptions?.body
    if (!body) {
      globalThis.showToast?.('Cannot download merged settings. Open the Customize panel and save settings locally first.', { type: 'warning', duration: 6000 })
      return
    }

    // We now send JSON bodies. Parse the JSON and extract the `settings` object.
    let serialized
    if (typeof body === 'string') {
      // Body is a raw .nort JSON (no wrapper).
      const parsed = tryParse(body)
      if (!parsed) {
        globalThis.showToast?.('Cannot download merged settings. Open the Customize panel and save settings locally first.', { type: 'warning', duration: 6000 })
        return
      }
      serialized = serializeNortObject(parsed)
    } else if (typeof body === 'object') {
      // Fallback: if callers supply a FormData-like object, attempt to read nortFile
      if (typeof body.get === 'function') {
        const nf = body.get('nortFile')
        if (!nf || typeof nf.text !== 'function') {
          globalThis.showToast?.('Cannot download merged settings. Open the Customize panel and save settings locally first.', { type: 'warning', duration: 6000 })
          return
        }
        serialized = await nf.text()
      } else {
        globalThis.showToast?.('Cannot download merged settings. Open the Customize panel and save settings locally first.', { type: 'warning', duration: 6000 })
        return
      }
    } else {
      globalThis.showToast?.('Cannot download merged settings. Open the Customize panel and save settings locally first.', { type: 'warning', duration: 6000 })
      return
    }

    const derived = deriveNortFilenameFromContent(serialized)
    const baseName = derived ?? currentSource?.name ?? 'generated-settings'
    downloadNortContent(serialized, baseName)
    globalThis.showToast?.('Settings file downloaded', { type: 'success', duration: 3000 })
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
        const text = await fileObj.text()
        result = buildNortContentRequest({ ...effectiveRequestBehavior, explicitNortContent: text })
      } else if (currentSource?.nortContent) {
        result = buildNortContentRequest(effectiveRequestBehavior)
      } else {
        return
      }
    } catch (err) {
      const message = err?.message ?? 'Failed to prepare map request.'
      setError(message)
      globalThis.showToast?.(message, { type: 'error', duration: 6000 })
      return
    }

    await runGenerate(result.requestOptions, result.baseName, result.source, outputMode)
  }

  // Expose internal helpers for unit tests (test harness uses these)
  if (typeof globalThis !== 'undefined') {
    try {
      globalThis.__test_buildNortContentRequest = buildNortContentRequest
      globalThis.__test_handleGenerateAndSaveNort = handleGenerateAndSaveNort
    } catch (e) {
      // ignore in environments that disallow global assignment
    }
  }

  function openPreviewModal() {
    if (!preview?.url) return
    globalThis.openModal?.(preview.url, preview.filename)
  }

  function handleDownloadMap() {
    if (!preview?.url) return
    const anchor = document.createElement('a')
    anchor.href = preview.url
    anchor.download = preview.filename ?? 'vellaris-map.png'
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
          landColoringMethods: uiI18n?.options?.landColoringMethods,
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
            if (hasGeneratedOnce) setCustomizationDirty(true)
          },
        }}
        options={{
          textures,
          borderTypes,
          i18n: uiI18n,
          landColoringMethods: uiI18n?.options?.landColoringMethods,
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

// Named exports for tests
export { serializeNortObject, scaleSliderValue, loadRandomOverrides, loadUiOptions }
export { buildCustomizePayload, loadCustomizeOverrides } from './GenerateForm.helpers'
// Additional exports for testing
export { persistCustomizeOverrides, applyBackgroundFlagsHoisted, setResourceFromRef, parseBooleanWithDefault, computeGridOverlayAlpha, computeConcentricWaveCount }
// Export additional hoisted appliers for unit testing
export { applyResourcesAndTopLevelHoisted, applyGridAndColoringHoisted, applyBordersFrayedAndGrungeHoisted, applyCoastOceanAndWavesHoisted, applyRoadsAndScalesHoisted, applyTextAndBackgroundHoisted }

GenerateForm.propTypes = {
  uiLanguage: PropTypes.string,
}
