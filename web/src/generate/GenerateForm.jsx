import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import CustomizeSettingsSection from './CustomizeSettingsSection'
import RandomSettingsSection from './RandomSettingsSection'
import { base64ToBlob, colorToHex, parseColorChannels } from './utils'
import {
  selectCityIconType,
  handleResponseError,
  tryParseJson as tryParse,
} from './helpers'
import { downloadNortContent } from './responseHandlers'
import {
  deriveNortFilenameFromContent,
  makeProgressToastController,
} from './sharedHelpers'
import useSettingsAppliers from './hooks/useSettingsAppliers'
import { getFrontendLabels } from '../i18n/webLabels'
import useGenerate from './hooks/useGenerate'
import useRandomSettings from './hooks/useRandomSettings'
import {
  serializeNortObject,
  scaleSliderValue,
  computeGridOverlayAlpha,
  computeConcentricWaveCount,
  setResourceFromRef,
  parseBooleanWithDefault,
  loadRandomOverrides,
} from './GenerateForm.helpers'
import useCustomizeSettings from './hooks/useCustomizeSettings'
import useFileHandler from './hooks/useFileHandler'
import useUiOptions, {
  loadUiOptions,
  loadCityIconTypes,
} from './hooks/useUiOptions'
import usePreview from './hooks/usePreview'
import useDoRandomMap from './hooks/useDoRandomMap'
import useRunGenerateFromSource from './hooks/useRunGenerateFromSource'
import {
  mergeColor,
} from './GenerateForm.appliers'
import mergeUiIntoParsed from './mergeUiIntoParsed'
import useNortBuilder from './hooks/useNortBuilder'
import useApplyMergedSettings from './hooks/useApplyMergedSettings'
const API_BASE = import.meta?.env?.VITE_API_BASE || '/api'
const RANDOM_OVERRIDES_STORAGE_KEY = 'vellaris-random-manual-overrides'
const CUSTOMIZE_OVERRIDES_STORAGE_KEY = 'vellaris-customize-overrides'
// Helpers to apply UI values into parsed settings. These accept a
// context object with needed values and helper functions so they can be
// executed at module scope and keep `mergeUiIntoParsed` simple.
// Applier and background helper functions are moved to GenerateForm.appliers.js

function GenerateForm({ uiLanguage = 'en' }) {
  const initialRandomOverrides = useMemo(() => loadRandomOverrides(), [])
  // Always start with empty customize overrides so UI resets to backend defaults on load
  const initialCustomize = useMemo(() => ({}), [])
  const [currentSource, setCurrentSource] = useState(null)
  const requestLanguage = uiLanguage

  // Initialize UI for language using the useUiOptions hook
  const {
    initializeUiForLanguage,
    artPacks,
    setArtPacks,
    textures,
    setTextures,
    borderTypes,
    setBorderTypes,
    allBooks,
    setAllBooks,
    uiI18n,
    setUiI18n,
    uiLoaded,
  } = useUiOptions()

  // Delegate UI initialization to hook; pass callbacks that affect GenerateForm state
  useEffect(() => {
    initializeUiForLanguage(requestLanguage, {
      initialRandomOverrides,
      setSelectedBooks,
      booksLoadedRef,
      setArtPack,
      artPack,
      cityIconType,
      handleCityIconTypesLoaded,
      requestLanguage,
      applyOptionDefaults: (opts, defs) => {
        if (!opts) return
        if (!backgroundType && Array.isArray(opts.backgroundTypes) && opts.backgroundTypes.length > 0)
          setBackgroundType(opts.backgroundTypes[0].value)
        if (
          !finalLandColoringMethod &&
          Array.isArray(opts.finalLandColoringMethods) &&
          opts.finalLandColoringMethods.length > 0
        )
          setFinalLandColoringMethod(opts.finalLandColoringMethods[0].value)
        if (!regionBoundaryStyle && Array.isArray(opts.lineStyles) && opts.lineStyles.length > 0)
          setRegionBoundaryStyle(opts.lineStyles[0].value)
        if (defs) applyServerDefaults(defs, opts)
      },
      lastUiDefaultsRef,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestLanguage])

  // --- Random Map state ---
  const [artPack, setArtPack] = useState(initialRandomOverrides.artPack)
  const [dimension, setDimension] = useState(initialRandomOverrides.dimension)
  const [worldSize, setWorldSize] = useState(0)
  const [landShape, setLandShape] = useState(initialRandomOverrides.landShape)
  const [regionCount, setRegionCount] = useState(0)
  const [landColoringMethod, setLandColoringMethod] = useState(
    initialRandomOverrides.landColoringMethod
  )
  const [cityIconTypes, setCityIconTypes] = useState([])
  const [cityIconType, setCityIconType] = useState(initialRandomOverrides.cityIconType)
  const [cityFrequency, setCityFrequency] = useState(0)
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
  const { values: customizeValues, setters: customizeSetters } =
    useCustomizeSettings(initialCustomize)

  const {
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
    gridOverlayShape,
    gridOverlayRowOrColCount,
    gridOverlayColorHex,
    gridOverlayXOffset,
    gridOverlayYOffset,
    gridOverlayLineWidth,
    gridOverlayLayer,
    drawVoronoiGridOverlayOnlyOnLand,
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
  } = customizeValues

  const {
    setBackgroundType,
    setTextureRef,
    setBackgroundSeed,
    setDrawRegionBoundaries,
    setColorizeLand,
    setColorizeOcean,
    setOceanColorHex,
    setLandColorHex,
    setRegionBoundaryStyle,
    setRegionBoundaryWidth,
    setRegionBoundaryColorHex,
    setDrawBorder,
    setDrawGridOverlay,
    setGridOverlayShape,
    setGridOverlayRowOrColCount,
    setGridOverlayColorHex,
    setGridOverlayXOffset,
    setGridOverlayYOffset,
    setGridOverlayLineWidth,
    setGridOverlayLayer,
    setDrawVoronoiGridOverlayOnlyOnLand,
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
    setOceanShadingAlpha,
    setOceanShadingLevel,
    setOceanShadingColorHex,
    setOceanWavesType,
    setOceanWavesLevel,
    setOceanWavesColorHex,
    setOceanWavesAlpha,
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
  } = customizeSetters

  // --- Shared state ---
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [customizationDirty, setCustomizationDirty] = useState(false)
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false)
  const dropRef = useRef(null)
  const lastApplierRunRef = useRef(0)
  
  const lastUiDefaultsRef = useRef(null)
  // In-memory canonical merged settings received from server (random/file/or generate)
  const mergedSettingsRef = useRef(null)
  const handleSuccessRef = useRef(null)

  const runGenerate = useGenerate({
    apiBase: API_BASE,
    handleResponseError,
    base64ToBlob,
    downloadNortContent,
    tryParse,
    serializeNortObject,
    handleSuccessRef,
    setError,
    setLoading,
  })

  // Hook: random overrides and helper handlers
  const {
    randomOverrides,
    updateRandomOverride,
    makeRandomHandler,
    booksLoadedRef,
    handleSelectedBooksChange: hookHandleSelectedBooksChange,
  } = useRandomSettings(initialRandomOverrides)

  const handleSelectedBooksChange = useCallback(
    (booksSet) => {
      setSelectedBooks(booksSet)
      hookHandleSelectedBooksChange(booksSet, setSelectedBooks)
    },
    [hookHandleSelectedBooksChange]
  )

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

  // `useCustomizeSettings` manages/collects and persists customize values.

  // Load UI option labels and resource lists on mount so the Customize
  // panel can display meaningful options instead of random placeholder
  // text. If the user has no saved customize overrides, apply sensible
  // defaults from the server-provided options.
  useEffect(() => {
    initializeUiForLanguage(requestLanguage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestLanguage])

  // Apply backend `defaults` to the UI using the existing setters.
  function applyServerDefaults(defs, opts) {
    // Helper setters shared across appliers
    const setHex = (setter, value) => {
      if (value) {
        const h = colorToHex(value)
        if (h) setter(h)
      }
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
        if (Number.isFinite(Number(defs.roadStyle.width)))
          setNumber(setRoadWidth, Number(defs.roadStyle.width))
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
        setNumber(
          setCityFrequency,
          (Number(defs.cityProbability) / Number(opts.maxCityProbability)) * 100
        )
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
      if (defs.gridOverlayXOffset !== undefined && defs.gridOverlayXOffset !== null)
        setGridOverlayXOffset(defs.gridOverlayXOffset)
      if (defs.gridOverlayYOffset !== undefined && defs.gridOverlayYOffset !== null)
        setGridOverlayYOffset(defs.gridOverlayYOffset)
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
      setAlphaFromValueOrColor(
        defs.coastShadingAlpha,
        defs.coastShadingColor,
        setNumber.bind(null, setCoastShadingAlpha)
      )
      setAlphaFromValueOrColor(
        defs.oceanShadingAlpha,
        defs.oceanShadingColor,
        setNumber.bind(null, setOceanShadingAlpha)
      )
      setNumber(setOceanShadingLevel, defs.oceanShadingLevel)
      setHex(setOceanShadingColorHex, defs.oceanShadingColor)
      setString(setOceanWavesType, defs.oceanWavesType)
      setNumber(setOceanWavesLevel, defs.oceanWavesLevel)
      setHex(setOceanWavesColorHex, defs.oceanWavesColor)
      setAlphaFromValueOrColor(
        defs.oceanWavesAlpha,
        defs.oceanWavesColor,
        setNumber.bind(null, setOceanWavesAlpha)
      )
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
      if (
        defs[scaleProp] !== undefined &&
        defs[scaleProp] !== null &&
        Number.isFinite(Number(defs[scaleProp]))
      ) {
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
      if (
        defs.treeHeightScale !== undefined &&
        defs.treeHeightScale !== null &&
        Number.isFinite(Number(defs.treeHeightScale))
      ) {
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
      const backendDefaultFont =
        opts?.defaultFontFamily ??
        (Array.isArray(opts?.fonts) && opts.fonts.length > 0 ? opts.fonts[0] : null)
      if (backendDefaultFont) {
        const fontSetters = [
          [titleFontFamily, setTitleFontFamily],
          [regionFontFamily, setRegionFontFamily],
          [mountainRangeFontFamily, setMountainRangeFontFamily],
          [otherMountainsFontFamily, setOtherMountainsFontFamily],
          [citiesFontFamily, setCitiesFontFamily],
          [riverFontFamily, setRiverFontFamily],
        ]
        fontSetters.forEach(([current, setter]) => {
          if (!current) setter(backendDefaultFont)
        })
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
  const generateFromNortContent = async (nortContent, toast) => {
    toast.show('ui.generating')
    const parsedReturned = tryParse(nortContent)
    if (parsedReturned && Object.hasOwn(randomOverrides, 'mapLanguage') && mapLanguage)
      parsedReturned.language = mapLanguage
    if (parsedReturned && Object.hasOwn(randomOverrides, 'cityIconType') && cityIconType)
      parsedReturned.cityIconSetName = cityIconType
    const bodyPayload = parsedReturned ?? tryParse(nortContent)
    await runGenerate(
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      },
      'random-map',
      { type: 'random', name: 'Random Map', nortContent },
      'preview',
      toast
    )
  }

  const handleDimensionChange = makeRandomHandler(setDimension, 'dimension')
  const handleLandShapeChange = makeRandomHandler(setLandShape, 'landShape')
  const handleLandColoringMethodChange = makeRandomHandler(
    setLandColoringMethod,
    'landColoringMethod'
  )
  const handleArtPackChange = makeRandomHandler(setArtPack, 'artPack')
  const handleCityIconTypeChange = makeRandomHandler(setCityIconType, 'cityIconType')
  const handleCityFrequencyChange = makeRandomHandler(setCityFrequency, 'cityFrequency')
  const handleMapLanguageChange = makeRandomHandler(setMapLanguage, 'mapLanguage')
  const handleRandomSeedChange = makeRandomHandler(setRandomSeed, 'randomSeed')

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

  const { appliersRef } = useSettingsAppliers(
    {
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
    customizeValues,
    customizeDeps
  )

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

  // preview state and handlers moved to usePreview hook
  const { preview, handleSuccess, openPreviewModal, handleDownloadMap } = usePreview({
    mergedSettingsRef,
    setCurrentSource,
    setHasGeneratedOnce,
    setCustomizationDirty,
    setFileName,
    labels: uiI18n?.labels,
  })

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
    loadCityIconTypes(pack).then((types) => handleCityIconTypesLoaded(types, cityIconType))
  }, [artPack])
  // Apply merged settings from a loaded source to the UI controls.
  // Moved into a dedicated hook for clarity and testability.
  useApplyMergedSettings({
    currentSource,
    tryParse,
    appliersRef,
    mergedSettingsRef,
    lastApplierRunRef,
  })

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
    if (typeof ms.fadeConcentricWaves === 'boolean' && !fadeConcentricWaves)
      setFadeConcentricWaves(Boolean(ms.fadeConcentricWaves))
    if (typeof ms.jitterToConcentricWaves === 'boolean' && !jitterToConcentricWaves)
      setJitterToConcentricWaves(Boolean(ms.jitterToConcentricWaves))
    if (typeof ms.brokenLinesForConcentricWaves === 'boolean' && !brokenLinesForConcentricWaves)
      setBrokenLinesForConcentricWaves(Boolean(ms.brokenLinesForConcentricWaves))
  }, [oceanWavesType])

  const { handleFileInput, onDrop } = useFileHandler({
    requestLanguage,
    runGenerate,
    setFileName,
    setFileObj,
    setCurrentSource,
    tryParse,
  })

  // handleSuccess implemented by usePreview
  // expose handleSuccess to the generate hook
  handleSuccessRef.current = handleSuccess

  // processGenerateResponse and runGenerate are provided by the `useGenerate` hook.

  // `runGenerate` is provided by the `useGenerate` hook above.

  // Build the random configuration payload from current UI state and manual overrides
  const buildRandomCfg = () => {
    const isManual = (k) => Object.hasOwn(randomOverrides, k)
    const cfg = {}

    const appliers = [
      [
        'mapLanguage',
        () => {
          cfg.language = mapLanguage
        },
      ],
      [
        'randomSeed',
        () => {
          cfg.randomSeed = randomSeed ? Number(randomSeed) : undefined
        },
      ],
      [
        'artPack',
        () => {
          cfg.artPack = artPack
        },
      ],
      [
        'dimension',
        () => {
          cfg.dimension = dimension
        },
      ],
      [
        'worldSize',
        () => {
          cfg.worldSize = worldSize
        },
      ],
      [
        'landShape',
        () => {
          cfg.landShape = landShape
        },
      ],
      [
        'regionCount',
        () => {
          cfg.regionCount = regionCount
        },
      ],
      [
        'landColoringMethod',
        () => {
          cfg.drawRegionColors = landColoringMethod
            ? landColoringMethod === 'ColorPoliticalRegions'
            : undefined
        },
      ],
      [
        'cityFrequency',
        () => {
          cfg.cityFrequency = cityFrequency
        },
      ],
      [
        'cityIconType',
        () => {
          cfg.cityIconSetName = cityIconType
        },
      ],
      [
        'selectedBooks',
        () => {
          if (selectedBooks && selectedBooks.size > 0) cfg.books = Array.from(selectedBooks)
        },
      ],
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
    await doRandomMap(toast)
      .catch((err) => {
        setError(err.message)
        globalThis.showToast?.({ key: 'ui.toast.error', params: { msg: err.message } }, { type: 'error', duration: 6000 })
      })
      .finally(() => {
        setLoading(false)
        toast.hide()
      })
  }

  const { doRandomMap } = useDoRandomMap({
    buildRandomCfg,
    fetchResolvedNort,
    applyReturnedSettingsToUi,
    generateFromNortContent,
    uiI18n,
    runGenerate,
  })

  function resolveLandColoringMethod(fallbackMethod) {
    // Server-side region shading expects region index data; when texture land colorization
    // is disabled, forcing SingleColor avoids an invalid drawRegionColors combination.
    if (backgroundType === 'GeneratedFromTexture' && !colorizeLand) {
      return 'SingleColor'
    }
    return finalLandColoringMethod ?? fallbackMethod
  }

  // Use helper functions
  // Helper: preserve grid overlay alpha from prior settings if color unchanged
  function getGridOverlayAlpha() {
    return computeGridOverlayAlpha(
      mergedSettingsRef?.current?.gridOverlayColor,
      gridOverlayColorHex
    )
  }

  // Helper: handle wave count preservation
  function getConcentricWaveCount() {
    return computeConcentricWaveCount(
      mergedSettingsRef?.current?.concentricWaveCount,
      concentricWaveCount
    )
  }

  // Merge current UI theme/visual settings into a parsed settings object.
  // Implemented in mergeUiIntoParsed.js and called with a context object.

  const { buildNortContentRequest } =
    useNortBuilder({
      mergedSettingsRef,
      currentSource,
      tryParse,
      serializeNortObject,
      mergeUiIntoParsed,
      getGridOverlayAlpha,
      getConcentricWaveCount,
      updateSettingsWithDimensions: null,
      preview,
      mapLanguage,
      // all UI values required by mergeUiIntoParsed are passed via GenerateForm when calling mergeUiIntoParsed
      backgroundType,
      setResourceFromRef,
      borderRef,
      textureRef,
      backgroundSeed,
      artPack,
      worldSize,
      landShape,
      regionCount,
      randomSeed,
      selectedBooks,
      regionBoundaryStyle,
      regionBoundaryWidth,
      regionBoundaryColorHex,
      drawRegionBoundaries,
      colorizeLand,
      colorizeOcean,
      oceanColorHex,
      landColorHex,
      drawGridOverlay,
      gridOverlayShape,
      gridOverlayRowOrColCount,
      gridOverlayColorHex,
      gridOverlayXOffset,
      gridOverlayYOffset,
      gridOverlayLineWidth,
      gridOverlayLayer,
      drawVoronoiGridOverlayOnlyOnLand,
      resolveLandColoringMethod,
      finalLandColoringMethod,
      mergeColor,
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
      oceanShadingColorHex,
      oceanShadingAlpha,
      oceanWavesType,
      oceanWavesLevel,
      fadeConcentricWaves,
      jitterToConcentricWaves,
      brokenLinesForConcentricWaves,
      oceanWavesColorHex,
      drawOceanEffectsInLakes,
      riverColorHex,
      parseBooleanWithDefault,
      drawRoads,
      roadStyle,
      roadWidth,
      roadColorHex,
      mountainSize,
      hillSize,
      duneSize,
      treeHeight,
      citySize,
      scaleSliderValue,
      drawText,
      textColorHex,
      drawBoldBackground,
      boldBackgroundColorHex,
      finalWidth,
      finalHeight,
      finalSeed,
    })

  

  

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
      globalThis.showToast?.('ui.toast.cannotDownloadMergedSettings', { type: 'warning', duration: 6000 })
      return
    }
    const body = result.requestOptions?.body
    if (!body) {
      globalThis.showToast?.('ui.toast.cannotDownloadMergedSettings', { type: 'warning', duration: 6000 })
      return
    }

    // We now send JSON bodies. Parse the JSON and extract the `settings` object.
    let serialized
    if (typeof body === 'string') {
      // Body is a raw .nort JSON (no wrapper).
      const parsed = tryParse(body)
      if (!parsed) {
        globalThis.showToast?.('ui.toast.cannotDownloadMergedSettings', { type: 'warning', duration: 6000 })
        return
      }
      serialized = serializeNortObject(parsed)
    } else if (typeof body === 'object') {
      // Fallback: if callers supply a FormData-like object, attempt to read nortFile
      if (typeof body.get === 'function') {
        const nf = body.get('nortFile')
        if (!nf || typeof nf.text !== 'function') {
          globalThis.showToast?.(
            'Cannot download merged settings. Open the Customize panel and save settings locally first.',
            { type: 'warning', duration: 6000 }
          )
          return
        }
        serialized = await nf.text()
      } else {
        globalThis.showToast?.('ui.toast.cannotDownloadMergedSettings', { type: 'warning', duration: 6000 })
        return
      }
    } else {
      globalThis.showToast?.(
        'Cannot download merged settings. Open the Customize panel and save settings locally first.',
        { type: 'warning', duration: 6000 }
      )
      return
    }

    const derived = deriveNortFilenameFromContent(serialized)
    const baseName = derived ?? currentSource?.name ?? 'generated-settings'
    downloadNortContent(serialized, baseName)
    globalThis.showToast?.('ui.toast.settingsDownloaded', { type: 'success', duration: 3000 })
  }

  const { runGenerateFromCurrentSource } = useRunGenerateFromSource({
    fileObj,
    currentSource,
    buildNortContentRequest,
    runGenerate,
    setError,
    setLoading,
  })

  // Expose helpers to globalThis for tests
  if (typeof globalThis !== 'undefined') {
    try {
      globalThis.__test_buildNortContentRequest = buildNortContentRequest
      globalThis.__test_handleGenerateAndSaveNort = handleGenerateAndSaveNort
    } catch (e) {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug(
          'GenerateForm: cannot expose test hooks on globalThis — assignment skipped',
          e
        )
      }
    }
  }

  // preview handlers provided by usePreview
  // instrumentation removed

  if (!uiLoaded) {
    return <div className="generate-form loading">{uiI18n.labels['ui.loading']}</div>
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

GenerateForm.propTypes = {
  uiLanguage: PropTypes.string,
}
