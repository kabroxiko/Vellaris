import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import CustomizeSettingsSection from './generate/CustomizeSettingsSection'
import RandomSettingsSection from './generate/RandomSettingsSection'
import { base64ToBlob } from './generate/utils'
import { selectCityIconType, fetchJson, handleResponseError } from './generate/helpers'
import { createSettingsAppliers } from './generate/settingsAppliers'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

let initialOptionsPromise = null
const cityIconTypesRequestByPack = new Map()

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

function requestWantsNortContent(requestOptions) {
  if (!requestOptions?.body) return false
  if (typeof requestOptions.body === 'string') {
    try {
      const parsed = JSON.parse(requestOptions.body)
      return !!parsed.returnNortContent
    } catch {
      return false
    }
  }
  if (requestOptions.body instanceof FormData) {
    return requestOptions.body.get('returnNortContent') === 'true'
  }
  return false
}

function cloneRequestWithoutNortContent(requestOptions) {
  if (!requestOptions?.body) return null
  if (typeof requestOptions.body === 'string') {
    try {
      const parsed = JSON.parse(requestOptions.body)
      delete parsed.returnNortContent
      return {
        ...requestOptions,
        body: JSON.stringify(parsed),
      }
    } catch {
      return null
    }
  }
  if (requestOptions.body instanceof FormData) {
    const form = new FormData()
    for (const [key, value] of requestOptions.body.entries()) {
      if (key !== 'returnNortContent') {
        form.append(key, value)
      }
    }
    return {
      ...requestOptions,
      body: form,
    }
  }
  return null
}

function buildLegacyRequestFromJsonBody(parsed) {
  if (!parsed.nortContent) return null
  const form = new FormData()
  const nortBlob = new Blob([parsed.nortContent], { type: 'text/plain' })
  form.append('nortFile', nortBlob, 'generated-settings.nort')
  appendLegacyRequestField(form, 'width', parsed.width)
  appendLegacyRequestField(form, 'height', parsed.height)
  appendLegacyRequestField(form, 'seed', parsed.seed)
  if (parsed.saveNort) form.append('saveNort', 'true')
  form.append('returnImageBytes', 'true')
  return { method: 'POST', body: form }
}

function buildLegacyRequestFromFormDataBody(original) {
  if (!original.get('nortFile')) return null
  const form = new FormData()
  const allowedKeys = new Set(['nortFile', 'width', 'height', 'seed', 'saveNort'])
  for (const [key, value] of original.entries()) {
    if (allowedKeys.has(key)) form.append(key, value)
  }
  form.append('returnImageBytes', 'true')
  return { method: 'POST', body: form }
}

function buildLegacyCompatibleRequest(requestOptions) {
  if (!requestOptions?.body) return null
  if (typeof requestOptions.body === 'string') {
    try {
      return buildLegacyRequestFromJsonBody(JSON.parse(requestOptions.body))
    } catch {
      return null
    }
  }
  if (requestOptions.body instanceof FormData) {
    return buildLegacyRequestFromFormDataBody(requestOptions.body)
  }
  return null
}

function sanitizeNortContentForServer(nortContent) {
  try {
    const parsed = JSON.parse(nortContent)

    const rewrite = (value) => {
      if (!value || typeof value !== 'object') return
      if (Array.isArray(value)) {
        value.forEach(rewrite)
        return
      }

      for (const key of Object.keys(value)) {
        const child = value[key]
        if (key === 'customImagesPath' && typeof child === 'string' && child.length > 0) {
          value[key] = ''
          continue
        }
        if (key === 'artPack' && child === 'custom') {
          value[key] = 'nortantis'
          continue
        }
        if (key === 'backgroundTextureSource' && child === 'File') {
          value[key] = 'Assets'
        }
        if (key === 'backgroundTextureImage' && typeof child === 'string' && child.length > 0) {
          value[key] = ''
        }
        rewrite(child)
      }
    }

    rewrite(parsed)
    return JSON.stringify(parsed)
  } catch {
    return nortContent
  }
}

function buildSanitizedNortContentRequest(requestOptions) {
  if (!requestOptions?.body || typeof requestOptions.body !== 'string') return null
  try {
    const parsed = JSON.parse(requestOptions.body)
    if (!parsed.nortContent) return null
    parsed.nortContent = sanitizeNortContentForServer(parsed.nortContent)
    delete parsed.returnNortContent
    return {
      ...requestOptions,
      body: JSON.stringify(parsed),
    }
  } catch {
    return null
  }
}

function downloadNortContent(nortContent, baseName) {
  const filename = `${baseName || 'generated-settings'}.nort`
  const blob = new Blob([nortContent], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function appendIfSet(fd, key, value) {
  if (value !== null && value !== undefined && value !== '') fd.append(key, String(value))
}

function appendLegacyRequestField(form, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    form.append(key, String(value))
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

async function retryWithCompatibilityFallbacks(res, requestOptions, outputMode, showProgressToast) {
  if (outputMode === 'nort-only') return res
  if (!res.ok && res.status >= 500 && requestWantsNortContent(requestOptions)) {
    const fallbackRequestOptions = cloneRequestWithoutNortContent(requestOptions)
    if (fallbackRequestOptions) {
      console.warn(
        'Primary /generate failed with returnNortContent; retrying without it for compatibility.'
      )
      showProgressToast('Retrying generation with compatibility mode...')
      res = await fetch(`${API_BASE}/generate`, fallbackRequestOptions)
    }
  }
  if (!res.ok && res.status >= 500) {
    const legacyRequestOptions = buildLegacyCompatibleRequest(requestOptions)
    if (legacyRequestOptions) {
      console.warn('Compatibility retry: using legacy-safe /generate request.')
      showProgressToast('Retrying generation with legacy compatibility...')
      res = await fetch(`${API_BASE}/generate`, legacyRequestOptions)
    }
  }
  if (!res.ok && res.status >= 500) {
    const sanitizedNortRequestOptions = buildSanitizedNortContentRequest(requestOptions)
    if (sanitizedNortRequestOptions) {
      console.warn('Compatibility retry: sanitizing custom image references in nortContent.')
      showProgressToast('Retrying generation after sanitizing settings...')
      res = await fetch(`${API_BASE}/generate`, sanitizedNortRequestOptions)
    }
  }
  return res
}

export default function GenerateForm() {
  const [preview, setPreview] = useState(null)
  const [currentSource, setCurrentSource] = useState(null)

  // --- Random Map state ---
  const [artPacks, setArtPacks] = useState([])
  const [artPack, setArtPack] = useState('')
  const [dimension, setDimension] = useState('')
  const [worldSize, setWorldSize] = useState(16000)
  const [landShape, setLandShape] = useState('')
  const [regionCount, setRegionCount] = useState(10)
  const [landColoringMethod, setLandColoringMethod] = useState('')
  const [cityIconTypes, setCityIconTypes] = useState([])
  const [cityIconType, setCityIconType] = useState('')
  const [cityFrequency, setCityFrequency] = useState(50)
  const [allBooks, setAllBooks] = useState([])
  const [selectedBooks, setSelectedBooks] = useState(new Set())
  const [randomSeed, setRandomSeed] = useState('')

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
  const [regionBoundaryStyle, setRegionBoundaryStyle] = useState('Dots')
  const [regionBoundaryWidth, setRegionBoundaryWidth] = useState(2.7)
  const [regionBoundaryColorHex, setRegionBoundaryColorHex] = useState('#000000')
  const [drawBorder, setDrawBorder] = useState(true)
  const [drawGridOverlay, setDrawGridOverlay] = useState(false)
  const [finalLandColoringMethod, setFinalLandColoringMethod] = useState('')
  const [borderRef, setBorderRef] = useState('')
  const [borderWidth, setBorderWidth] = useState(125)
  const [borderPosition, setBorderPosition] = useState('Outside_map')
  const [borderColorOption, setBorderColorOption] = useState('Ocean_color')
  const [borderColorHex, setBorderColorHex] = useState('#000000')
  const [frayedBorder, setFrayedBorder] = useState(false)
  const [frayedBorderBlurLevel, setFrayedBorderBlurLevel] = useState(75)
  const [frayedBorderSize, setFrayedBorderSize] = useState(5)
  const [frayedBorderSeed, setFrayedBorderSeed] = useState('')
  const [drawGrunge, setDrawGrunge] = useState(true)
  const [grungeWidth, setGrungeWidth] = useState(500)
  const [frayedBorderColorHex, setFrayedBorderColorHex] = useState('#5b4a31')
  const [lineStyle, setLineStyle] = useState('Jagged')
  const [coastlineWidth, setCoastlineWidth] = useState(2.7)
  const [coastlineColorHex, setCoastlineColorHex] = useState('#000000')
  const [coastShadingLevel, setCoastShadingLevel] = useState(40)
  const [coastShadingColorHex, setCoastShadingColorHex] = useState('#000000')
  const [coastShadingAlpha, setCoastShadingAlpha] = useState(65)
  const [oceanShadingLevel, setOceanShadingLevel] = useState(10)
  const [oceanShadingColorHex, setOceanShadingColorHex] = useState('#4a4a4a')
  const [oceanWavesType, setOceanWavesType] = useState('Ripples')
  const [oceanWavesLevel, setOceanWavesLevel] = useState(30)
  const [oceanWavesColorHex, setOceanWavesColorHex] = useState('#5b4a31')
  const [drawOceanEffectsInLakes, setDrawOceanEffectsInLakes] = useState(true)
  const [riverColorHex, setRiverColorHex] = useState('#5b4a31')
  const [drawRoads, setDrawRoads] = useState(true)
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
  const dropRef = useRef(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const appliers = useMemo(() => createSettingsAppliers({
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
    setOceanShadingColorHex,
    setOceanWavesType,
    setOceanWavesLevel,
    setOceanWavesColorHex,
    setDrawOceanEffectsInLakes,
    setRiverColorHex,
    setDrawRoads,
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
  }), []) // setters from useState are stable references

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url)
      }
    }
  }, [preview])

  useEffect(() => {
    loadInitialOptions()
      .then(({ artPacks, books, textures, borderTypes }) => {
        setArtPacks(artPacks)
        setAllBooks(books)
        setSelectedBooks(new Set(books))
        setTextures(textures)
        setBorderTypes(borderTypes)
      })
      .catch(() => {})
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
      const settings = JSON.parse(currentSource.nortContent)
      appliers.applyMapSizeAndSeedSettings(settings)
      appliers.applyBackgroundTypeSettings(settings)
      appliers.applyColorAndBoundarySettings(settings)
      appliers.applyBorderSettings(settings)
      appliers.applyFrayedBorderSettings(settings)
      appliers.applyCoastlineSettings(settings)
      appliers.applyOceanSettings(settings)
      appliers.applyTextSettings(settings)
    } catch {
      // Ignore parse failures; form keeps current values.
    }
  }, [currentSource?.nortContent, appliers])

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
          const payload = {
            nortContent: text,
            returnImageBytes: true,
          }
          await runGenerate(
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
            f.name.replace(/\.[^.]+$/, ''),
            source
          )
        })
        .catch(() => {
          // Ignore read errors; upload path still works through FormData.
        })
    },
    [runGenerate]
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
      setCurrentSource({
        type: 'nort-content',
        name: source?.name || fileName || 'Generated settings',
        nortContent,
      })
    } else if (source) {
      setCurrentSource(source)
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
    downloadNortContent(data.nortContent, baseName)
    setCurrentSource({
      type: 'nort-content',
      name: source?.name || fileName || 'Generated settings',
      nortContent: data.nortContent,
    })
    globalThis.showToast?.('Settings file downloaded', { type: 'success', duration: 3000 })
  }

  async function runGenerate(requestOptions, baseName, source, outputMode = 'preview') {
    setError(null)
    setLoading(true)
    let progressToastId = null

    const showProgressToast = (message) => {
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

    try {
      showProgressToast(outputMode === 'nort-only' ? 'Preparing settings...' : 'Generating map..')
      let res = await fetch(`${API_BASE}/generate`, requestOptions)
      res = await retryWithCompatibilityFallbacks(
        res,
        requestOptions,
        outputMode,
        showProgressToast
      )
      if (!res.ok) await handleResponseError(res)
      const contentType = res.headers.get('content-type') || ''
      const bytes = await readResponseBytesWithProgress(res, () => {
        showProgressToast(
          outputMode === 'nort-only' ? 'Downloading settings...' : 'Downloading map...'
        )
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
      try {
        if (progressToastId) globalThis.hideToast?.(progressToastId)
      } catch (e) {
        console.warn('hideToast failed', e)
      }
    }
  }

  async function handleRandomMap(evt) {
    evt.preventDefault()
    const payload = {
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
      returnImageBytes: true,
      returnNortContent: true,
    }
    const source = {
      type: 'random',
      name: 'Random Map',
      payload: {
        seed: payload.seed,
        artPack: payload.artPack,
        dimension: payload.dimension,
        worldSize: payload.worldSize,
        landShape: payload.landShape,
        regionCount: payload.regionCount,
        landColoringMethod: payload.landColoringMethod,
        cityIconType: payload.cityIconType,
        cityFrequency: payload.cityFrequency,
        books: payload.books,
      },
    }
    await runGenerate(
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'random-map',
      source
    )
  }

  function resolveLandColoringMethod(fallbackMethod) {
    // Server-side region shading expects region index data; when texture land colorization
    // is disabled, forcing SingleColor avoids an invalid drawRegionColors combination.
    if (backgroundType === 'GeneratedFromTexture' && !colorizeLand) {
      return 'SingleColor'
    }
    return finalLandColoringMethod || fallbackMethod || undefined
  }

  function buildNortContentRequest({ forceSaveNort = false, returnNortContent = false } = {}) {
    const payload = {
      nortContent: currentSource.nortContent,
      width: finalWidth || undefined,
      height: finalHeight || undefined,
      seed: finalSeed ? Number(finalSeed) : undefined,
      backgroundType: backgroundType || undefined,
      textureRef: textureRef || undefined,
      backgroundSeed: backgroundSeed ? Number(backgroundSeed) : undefined,
      drawRegionBoundaries,
      colorizeLand,
      colorizeOcean,
      oceanColorHex,
      landColorHex,
      regionBoundaryStyle: regionBoundaryStyle || undefined,
      regionBoundaryWidth,
      regionBoundaryColorHex,
      drawBorder,
      drawGridOverlay,
      landColoringMethod: resolveLandColoringMethod(undefined),
      titleFontFamily: titleFontFamily || undefined,
      regionFontFamily: regionFontFamily || undefined,
      mountainRangeFontFamily: mountainRangeFontFamily || undefined,
      otherMountainsFontFamily: otherMountainsFontFamily || undefined,
      citiesFontFamily: citiesFontFamily || undefined,
      riverFontFamily: riverFontFamily || undefined,
      saveNort: forceSaveNort || undefined,
      returnImageBytes: true,
      returnNortContent: returnNortContent || undefined,
    }
    return {
      requestOptions: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      baseName: (preview?.filename || 'generated-map.png').replace(/\.png$/, ''),
      source: {
        type: currentSource.type,
        name: currentSource.name,
        nortContent: currentSource.nortContent,
      },
    }
  }

  function buildRandomRequest({ forceSaveNort = false, returnNortContent = false } = {}) {
    const payload = {
      ...currentSource.payload,
      width: finalWidth || undefined,
      height: finalHeight || undefined,
      seed: finalSeed ? Number(finalSeed) : currentSource.payload.seed,
      backgroundType: backgroundType || undefined,
      textureRef: textureRef || undefined,
      backgroundSeed: backgroundSeed ? Number(backgroundSeed) : undefined,
      drawRegionBoundaries,
      colorizeLand,
      colorizeOcean,
      oceanColorHex,
      landColorHex,
      regionBoundaryStyle: regionBoundaryStyle || undefined,
      regionBoundaryWidth,
      regionBoundaryColorHex,
      drawBorder,
      drawGridOverlay,
      landColoringMethod: resolveLandColoringMethod(currentSource.payload.landColoringMethod),
      titleFontFamily: titleFontFamily || undefined,
      regionFontFamily: regionFontFamily || undefined,
      mountainRangeFontFamily: mountainRangeFontFamily || undefined,
      otherMountainsFontFamily: otherMountainsFontFamily || undefined,
      citiesFontFamily: citiesFontFamily || undefined,
      riverFontFamily: riverFontFamily || undefined,
      saveNort: forceSaveNort || undefined,
      returnImageBytes: true,
      returnNortContent: returnNortContent || undefined,
    }
    return {
      requestOptions: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      baseName: (preview?.filename || 'random-map-final.png').replace(/\.png$/, ''),
      source: {
        type: 'random',
        name: currentSource.name || 'Random Map',
        payload: {
          ...currentSource.payload,
          seed: payload.seed,
          landColoringMethod: payload.landColoringMethod,
        },
      },
    }
  }

  function buildFileRequest({ forceSaveNort = false, returnNortContent = false } = {}) {
    const fd = new FormData()
    fd.append('nortFile', fileObj, fileObj.name)
    if (finalWidth) fd.append('width', String(finalWidth))
    if (finalHeight) fd.append('height', String(finalHeight))
    if (finalSeed) fd.append('seed', String(finalSeed))
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
    appendIfSet(fd, 'landColoringMethod', resolveLandColoringMethod(undefined))
    appendIfSet(fd, 'titleFontFamily', titleFontFamily)
    appendIfSet(fd, 'regionFontFamily', regionFontFamily)
    appendIfSet(fd, 'mountainRangeFontFamily', mountainRangeFontFamily)
    appendIfSet(fd, 'otherMountainsFontFamily', otherMountainsFontFamily)
    appendIfSet(fd, 'citiesFontFamily', citiesFontFamily)
    appendIfSet(fd, 'riverFontFamily', riverFontFamily)
    fd.append('returnImageBytes', 'true')
    if (returnNortContent) fd.append('returnNortContent', 'true')
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

  async function handleGenerateFromSettingsAndSaveNort(evt) {
    evt.preventDefault()
    if (currentSource?.nortContent) {
      const baseName = currentSource.name || 'generated-settings'
      downloadNortContent(currentSource.nortContent, baseName)
      globalThis.showToast?.('Settings file downloaded', { type: 'success', duration: 3000 })
      return
    }
    await runGenerateFromCurrentSource({ returnNortContent: true }, 'nort-only')
  }

  async function runGenerateFromCurrentSource(requestBehavior = {}, outputMode = 'preview') {
    let result = null

    if (currentSource?.nortContent) {
      result = buildNortContentRequest(requestBehavior)
    } else if (currentSource?.type === 'random' && currentSource?.payload) {
      result = buildRandomRequest(requestBehavior)
    } else if (fileObj) {
      result = buildFileRequest(requestBehavior)
    } else {
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
          fileName,
        }}
        handlers={{
          setDimension,
          setWorldSize,
          setLandShape,
          setRegionCount,
          setLandColoringMethod,
          setArtPack,
          setCityIconType,
          setCityFrequency,
          setSelectedBooks,
          setRandomSeed,
          handleRandomMap,
          handleFileInput,
          onDrop,
        }}
        options={{
          artPacks,
          cityIconTypes,
          allBooks,
        }}
        ui={{
          loading,
          dropRef,
        }}
      />

      <div className="section-divider">
        <span>then</span>
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
          oceanShadingLevel,
          oceanShadingColorHex,
          oceanWavesType,
          oceanWavesLevel,
          oceanWavesColorHex,
          drawOceanEffectsInLakes,
          riverColorHex,
          drawRoads,
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
          setOceanShadingLevel,
          setOceanShadingColorHex,
          setOceanWavesType,
          setOceanWavesLevel,
          setOceanWavesColorHex,
          setDrawOceanEffectsInLakes,
          setRiverColorHex,
          setDrawRoads,
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
          handleGenerateAndSaveNort: handleGenerateFromSettingsAndSaveNort,
          openPreviewModal,
          handleDownloadMap,
        }}
        options={{
          textures,
          borderTypes,
        }}
        ui={{
          loading,
        }}
      />

      {error && <div className="error">{error}</div>}
    </div>
  )
}
