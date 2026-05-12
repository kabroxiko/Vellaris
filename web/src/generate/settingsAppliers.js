import { colorToHex, colorToAlphaPercent, fontSpecToFamily } from './utils'
import { seedStringOrEmpty, stringValueOrEmpty, dimensionFromSize } from './helpers'

// Lightweight runtime instrumentation to record where applier functions
// are created and invoked. Useful for debugging duplicate invocation
// paths under React StrictMode. Inspect via `globalThis.__applierCallCache`.
const applierCallCache = new Map()

// NOTE: `setIfChanged` is defined inside `createSettingsAppliers` so it
// can access the `currentValues` parameter for idempotent comparisons.

function inverseGetSliderFromScale(scale) {
  const sliderValueFor1Scale = 5
  const scaleMax = 3
  const scaleMin = 0.5
  const minScaleSliderValue = 1
  const maxScaleSliderValue = 15

  const s = Number(scale)
  if (!Number.isFinite(s)) return undefined
  const v1Slope = (sliderValueFor1Scale - minScaleSliderValue) / (1 - scaleMin)
  const v1YIntercept = sliderValueFor1Scale - v1Slope
  const v2Slope = (maxScaleSliderValue - sliderValueFor1Scale) / (scaleMax - 1)
  const v2YIntercept = sliderValueFor1Scale - v2Slope * 1
  let v
  if (s <= 1) {
    v = v1Slope * s + v1YIntercept
  } else {
    v = v2Slope * s + v2YIntercept
  }
  v = Math.round(v)
  if (v < minScaleSliderValue) v = minScaleSliderValue
  if (v > maxScaleSliderValue) v = maxScaleSliderValue
  return v
}

function inverseGetTreeHeightSliderFromScale(scale) {
  const s = Number(scale)
  if (!Number.isFinite(s)) return undefined
  // forward: treeScale = 0.1 + v * 0.05 -> inverse: v = (scale - 0.1)/0.05
  let v = (s - 0.1) / 0.05
  v = Math.round(v)
  if (v < 1) v = 1
  if (v > 15) v = 15
  return v
}

export function createSettingsAppliers(setters, currentValues = {}) {

  // Per-applier instrumentation: record creation and calls.
  const randomPart = (() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      return crypto.randomUUID().replaceAll('-', '').slice(0, 8)
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const arr = new Uint8Array(6)
      crypto.getRandomValues(arr)
      return Array.from(arr, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8)
    }
    throw new Error('crypto unavailable: randomPart requires crypto.randomUUID or crypto.getRandomValues')
  })()
  const applierId = `applier-${Date.now()}-${randomPart}`
  const createdStack = (new Error('applier-created')).stack
  applierCallCache.set(applierId, { createdAt: Date.now(), createdStack, calls: [] })
    if (typeof globalThis !== 'undefined') {
      globalThis.__applierCallCache = applierCallCache
    }

      const recordCall = (name) => {
        const info = applierCallCache.get(applierId) || { createdAt: Date.now(), createdStack, calls: [] }
        const entry = { name, ts: Date.now(), stack: (new Error(`applier:${name}`)).stack }
        info.calls.push(entry)
        applierCallCache.set(applierId, info)
      }

    function setIfChanged(setter, key, newValue) {
      const oldValue = currentValues ? currentValues[key] : undefined
      // Normalize numbers vs strings where reasonable
      if (typeof newValue === 'number' || (typeof newValue === 'string' && !Number.isNaN(Number(newValue)))) {
        const nOld = Number(oldValue)
        const nNew = Number(newValue)
        if (Number.isFinite(nOld) && Number.isFinite(nNew) && Object.is(nOld, nNew)) return
      }
      if (Object.is(oldValue, newValue)) return
      // Guard against invalid setter references (e.g., undefined or non-function)
      if (typeof setter !== 'function') {
        // setter is not a function (debug suppressed)
        return
      }
      // Instrument setter invocation
      try {
        recordCall(`set:${key}`)
        setter(newValue)
        recordCall(`set:${key}:done`)
      } catch (e) {
        console.error(`setter failed for ${key}`, e)
        // attempt a string fallback if possible
        recordCall(`set:${key}:string-fallback`)
        if (typeof setter === 'function') setter(String(newValue))
        recordCall(`set:${key}:string-fallback-done`)
      }
    }

    // Helper: apply a color value that may be an rgba string (preferred)
    // or a fallback hex. If an rgba string is provided, extract the
    // color hex and alpha percent and set both values via setters.
    function applyColorWithAlpha(rgbaOrNull, fallbackHex, setHexSetter, setAlphaSetter, alphaInvert = true) {
      if (rgbaOrNull) {
        const hex = colorToHex(rgbaOrNull)
        if (hex) setIfChanged(setHexSetter, (setHexSetter.name || 'colorHex'), hex)
        const alphaPercent = colorToAlphaPercent(rgbaOrNull, 100)
        const alphaValue = alphaInvert ? 100 - alphaPercent : alphaPercent
        setIfChanged(setAlphaSetter, (setAlphaSetter.name || 'alpha'), Number(alphaValue))
        return
      }
      if (fallbackHex) {
        setIfChanged(setHexSetter, (setHexSetter.name || 'colorHex'), fallbackHex)
      }
    }

    // Helper: map a scale/size value using the provided mapper and apply via setter
    function applyScaleSetting(val, setter, keyName, mapper) {
      if (!Number.isFinite(Number(val))) return
      const v = mapper(val)
      if (v !== undefined) setIfChanged(setter, keyName, v)
    }

  return {
    applyMapSizeAndSeedSettings(settings) {
      recordCall('applyMapSizeAndSeedSettings')
      const {
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
      } = setters

      if (Number.isFinite(Number(settings.generatedWidth)))
        setIfChanged(setFinalWidth, 'finalWidth', Number(settings.generatedWidth))
      if (Number.isFinite(Number(settings.generatedHeight)))
        setIfChanged(setFinalHeight, 'finalHeight', Number(settings.generatedHeight))
      const seedStr = seedStringOrEmpty(settings.randomSeed)
      if (seedStr) {
        setIfChanged(setFinalSeed, 'finalSeed', seedStr)
        setIfChanged(setRandomSeed, 'randomSeed', seedStr)
      }
      setIfChanged(setArtPack, 'artPack', stringValueOrEmpty(settings.artPack))
      setIfChanged(setLandShape, 'landShape', stringValueOrEmpty(settings.landShape))
      if (Number.isFinite(Number(settings.regionCount)))
        setIfChanged(setRegionCount, 'regionCount', Number(settings.regionCount))
      if (Number.isFinite(Number(settings.worldSize))) setIfChanged(setWorldSize, 'worldSize', Number(settings.worldSize))
      setIfChanged(setCityIconType, 'cityIconType', stringValueOrEmpty(settings.cityIconSetName))
      if (Array.isArray(settings.books) && settings.books.length > 0)
        setIfChanged(setSelectedBooks, 'selectedBooks', new Set(settings.books))
      const width = Number(settings.generatedWidth)
      const height = Number(settings.generatedHeight)
      if (Number.isFinite(width) && Number.isFinite(height))
        setIfChanged(setDimension, 'dimension', dimensionFromSize(width, height))
    },

    applyRegionBoundaryStyle(regionStyle) {
      const { setRegionBoundaryStyle, setRegionBoundaryWidth } = setters
      if (typeof regionStyle === 'string' && regionStyle) {
        setIfChanged(setRegionBoundaryStyle, 'regionBoundaryStyle', regionStyle)
        return
      }
      if (!regionStyle || typeof regionStyle !== 'object') return
      if (typeof regionStyle.type === 'string') setIfChanged(setRegionBoundaryStyle, 'regionBoundaryStyle', regionStyle.type)
      if (Number.isFinite(Number(regionStyle.width)))
        setIfChanged(setRegionBoundaryWidth, 'regionBoundaryWidth', Number(regionStyle.width))
    },

    applyBackgroundTypeSettings(settings) {
      recordCall('applyBackgroundTypeSettings')
      const {
        setBackgroundType,
        setTextureRef,
        setBackgroundSeed,
        setDrawRegionBoundaries,
        setColorizeLand,
        setColorizeOcean,
      } = setters

      if (settings.solidColorBackground === true) setIfChanged(setBackgroundType, 'backgroundType', 'SolidColor')
      else if (settings.generateBackgroundFromTexture === true)
        setIfChanged(setBackgroundType, 'backgroundType', 'GeneratedFromTexture')
      else setIfChanged(setBackgroundType, 'backgroundType', 'FractalNoise')
      if (settings.backgroundTextureResource?.artPack && settings.backgroundTextureResource?.name) {
        setIfChanged(setTextureRef, 'textureRef', `${settings.backgroundTextureResource.artPack}|${settings.backgroundTextureResource.name}`)
      } else {
        setIfChanged(setTextureRef, 'textureRef', '')
      }
      setIfChanged(setBackgroundSeed, 'backgroundSeed', seedStringOrEmpty(settings.backgroundRandomSeed))
      if (typeof settings.drawRegionBoundaries === 'boolean')
        setIfChanged(setDrawRegionBoundaries, 'drawRegionBoundaries', settings.drawRegionBoundaries)
      if (typeof settings.colorizeLand === 'boolean') setIfChanged(setColorizeLand, 'colorizeLand', settings.colorizeLand)
      if (typeof settings.colorizeOcean === 'boolean') setIfChanged(setColorizeOcean, 'colorizeOcean', settings.colorizeOcean)
    },

    applyColorAndBoundarySettings(settings) {
      recordCall('applyColorAndBoundarySettings')
      const {
        setOceanColorHex,
        setLandColorHex,
        setRegionBoundaryColorHex,
        setDrawBorder,
        setDrawGridOverlay,
        setLandColoringMethod,
        setFinalLandColoringMethod,
      } = setters

      const oceanHex = colorToHex(settings.oceanColor)
      if (oceanHex) setIfChanged(setOceanColorHex, 'oceanColorHex', oceanHex)
      const landHex = colorToHex(settings.landColor)
      if (landHex) setIfChanged(setLandColorHex, 'landColorHex', landHex)
      const boundaryHex = colorToHex(settings.regionBoundaryColor)
      if (boundaryHex) setIfChanged(setRegionBoundaryColorHex, 'regionBoundaryColorHex', boundaryHex)
      this.applyRegionBoundaryStyle(settings.regionBoundaryStyle)
      if (typeof settings.drawBorder === 'boolean') setIfChanged(setDrawBorder, 'drawBorder', settings.drawBorder)
      if (typeof settings.drawGridOverlay === 'boolean')
        setIfChanged(setDrawGridOverlay, 'drawGridOverlay', settings.drawGridOverlay)
      if (typeof settings.drawRegionColors === 'boolean') {
        const method = settings.drawRegionColors ? 'ColorPoliticalRegions' : 'SingleColor'
        setIfChanged(setLandColoringMethod, 'landColoringMethod', method)
        setIfChanged(setFinalLandColoringMethod, 'finalLandColoringMethod', method)
      }
    },

    applyBorderSettings(settings) {
      recordCall('applyBorderSettings')
      const {
        setBorderRef,
        setBorderWidth,
        setBorderPosition,
        setBorderColorOption,
        setBorderColorHex,
      } = setters

      if (settings.borderResource?.artPack && settings.borderResource?.name) {
        setIfChanged(setBorderRef, 'borderRef', `${settings.borderResource.artPack}|${settings.borderResource.name}`)
      } else {
        setIfChanged(setBorderRef, 'borderRef', '')
      }
      if (Number.isFinite(Number(settings.borderWidth)))
        setIfChanged(setBorderWidth, 'borderWidth', Number(settings.borderWidth))
      if (typeof settings.borderPosition === 'string' && settings.borderPosition)
        setIfChanged(setBorderPosition, 'borderPosition', settings.borderPosition)
      if (typeof settings.borderColorOption === 'string' && settings.borderColorOption)
        setIfChanged(setBorderColorOption, 'borderColorOption', settings.borderColorOption)
      const borderHex = colorToHex(settings.borderColor)
      if (borderHex) setIfChanged(setBorderColorHex, 'borderColorHex', borderHex)
    },

    applyFrayedBorderSettings(settings) {
      recordCall('applyFrayedBorderSettings')
      const {
        setFrayedBorder,
        setFrayedBorderBlurLevel,
        setFrayedBorderSize,
        setFrayedBorderSeed,
        setDrawGrunge,
        setGrungeWidth,
        setFrayedBorderColorHex,
      } = setters

      if (typeof settings.frayedBorder === 'boolean') setIfChanged(setFrayedBorder, 'frayedBorder', settings.frayedBorder)
      if (Number.isFinite(Number(settings.frayedBorderBlurLevel)))
        setIfChanged(setFrayedBorderBlurLevel, 'frayedBorderBlurLevel', Number(settings.frayedBorderBlurLevel))
      if (Number.isFinite(Number(settings.frayedBorderSize)))
        setIfChanged(setFrayedBorderSize, 'frayedBorderSize', Number(settings.frayedBorderSize))
      setIfChanged(setFrayedBorderSeed, 'frayedBorderSeed', seedStringOrEmpty(settings.frayedBorderSeed))
      if (typeof settings.drawGrunge === 'boolean') setIfChanged(setDrawGrunge, 'drawGrunge', settings.drawGrunge)
      if (Number.isFinite(Number(settings.grungeWidth)))
        setIfChanged(setGrungeWidth, 'grungeWidth', Number(settings.grungeWidth))
      const frayedBorderHex = colorToHex(settings.frayedBorderColor)
      if (frayedBorderHex) setIfChanged(setFrayedBorderColorHex, 'frayedBorderColorHex', frayedBorderHex)
    },

    applyCoastlineSettings(settings) {
      recordCall('applyCoastlineSettings')
      const {
        setLineStyle,
        setCoastlineWidth,
        setCoastlineColorHex,
        setCoastShadingLevel,
        setCoastShadingColorHex,
        setCoastShadingAlpha,
      } = setters

      if (typeof settings.lineStyle === 'string' && settings.lineStyle)
        setIfChanged(setLineStyle, 'lineStyle', settings.lineStyle)
      if (Number.isFinite(Number(settings.coastlineWidth)))
        setIfChanged(setCoastlineWidth, 'coastlineWidth', Number(settings.coastlineWidth))
      const coastlineHex = colorToHex(settings.coastlineColor)
      if (coastlineHex) {
        setIfChanged(setCoastlineColorHex, 'coastlineColorHex', coastlineHex)
      }
      if (Number.isFinite(Number(settings.coastShadingLevel)))
        setIfChanged(setCoastShadingLevel, 'coastShadingLevel', Number(settings.coastShadingLevel))
      // Prefer numeric RGBA fields from backend (always use rgba when present).
      // suppressed verbose coast shading debug logs

      applyColorWithAlpha(settings.coastShadingColor, settings.coastShadingColorHex || null, setCoastShadingColorHex, setCoastShadingAlpha, true)
    },

    applyGridOverlaySettings(settings) {
      recordCall('applyGridOverlaySettings')
      const {
        setDrawGridOverlay,
        setGridOverlayShape,
        setGridOverlayRowOrColCount,
        setGridOverlayColorHex,
        setGridOverlayXOffset,
        setGridOverlayYOffset,
        setGridOverlayLineWidth,
        setGridOverlayLayer,
        setDrawVoronoiGridOverlayOnlyOnLand,
      } = setters

      if (typeof settings.drawGridOverlay === 'boolean') setIfChanged(setDrawGridOverlay, 'drawGridOverlay', settings.drawGridOverlay)
      if (typeof settings.gridOverlayShape === 'string') setIfChanged(setGridOverlayShape, 'gridOverlayShape', settings.gridOverlayShape)
      if (Number.isFinite(Number(settings.gridOverlayRowOrColCount))) setIfChanged(setGridOverlayRowOrColCount, 'gridOverlayRowOrColCount', Number(settings.gridOverlayRowOrColCount))
      if (settings.gridOverlayColor) {
        const hex = colorToHex(settings.gridOverlayColor)
        if (hex) setIfChanged(setGridOverlayColorHex, 'gridOverlayColorHex', hex)
      }
      if (typeof settings.gridOverlayXOffset === 'string') setIfChanged(setGridOverlayXOffset, 'gridOverlayXOffset', settings.gridOverlayXOffset)
      if (typeof settings.gridOverlayYOffset === 'string') setIfChanged(setGridOverlayYOffset, 'gridOverlayYOffset', settings.gridOverlayYOffset)
      if (Number.isFinite(Number(settings.gridOverlayLineWidth))) setIfChanged(setGridOverlayLineWidth, 'gridOverlayLineWidth', Number(settings.gridOverlayLineWidth))
      if (typeof settings.gridOverlayLayer === 'string') setIfChanged(setGridOverlayLayer, 'gridOverlayLayer', settings.gridOverlayLayer)
      if (typeof settings.drawVoronoiGridOverlayOnlyOnLand === 'boolean') setIfChanged(setDrawVoronoiGridOverlayOnlyOnLand, 'drawVoronoiGridOverlayOnlyOnLand', settings.drawVoronoiGridOverlayOnlyOnLand)
    },

    applyOceanSettings(settings) {
      recordCall('applyOceanSettings')
      const {
        setOceanShadingLevel,
        setOceanShadingAlpha,
        setOceanShadingColorHex,
        setOceanWavesType,
        setOceanWavesLevel,
        setOceanWavesAlpha,
        setOceanWavesColorHex,
        setDrawOceanEffectsInLakes,
        setRiverColorHex,
        setConcentricWaveCount,
        setFadeConcentricWaves,
        setJitterToConcentricWaves,
        setBrokenLinesForConcentricWaves,
      } = setters

      if (Number.isFinite(Number(settings.oceanShadingLevel)))
          setIfChanged(setOceanShadingLevel, 'oceanShadingLevel', Number(settings.oceanShadingLevel))
      // suppressed verbose ocean shading debug logs
      // Prefer numeric RGBA fields from backend (always use rgba when present).
      applyColorWithAlpha(settings.oceanShadingColor, settings.oceanShadingColorHex || null, setOceanShadingColorHex, setOceanShadingAlpha, true)
      // Prefer the newer `oceanWavesType` field, but fall back to the
      // legacy `oceanEffect` when present so uploaded .nort files that
      // contain `oceanEffect` still update the UI correctly.
      if (typeof settings.oceanWavesType === 'string' && settings.oceanWavesType) {
        setIfChanged(setOceanWavesType, 'oceanWavesType', settings.oceanWavesType)
      } else if (typeof settings.oceanEffect === 'string' && settings.oceanEffect) {
        setIfChanged(setOceanWavesType, 'oceanWavesType', settings.oceanEffect)
      }
      if (Number.isFinite(Number(settings.oceanWavesLevel)))
        setIfChanged(setOceanWavesLevel, 'oceanWavesLevel', Number(settings.oceanWavesLevel))
      const oceanWavesHex = colorToHex(settings.oceanWavesColor)
      if (oceanWavesHex) setIfChanged(setOceanWavesColorHex, 'oceanWavesColorHex', oceanWavesHex)
      if (settings.oceanWavesColor) {
        const wavesOpacityPercent = colorToAlphaPercent(settings.oceanWavesColor, 100)
        setIfChanged(setOceanWavesAlpha, 'oceanWavesAlpha', 100 - wavesOpacityPercent)
      }
      if (typeof settings.drawOceanEffectsInLakes === 'boolean')
        setIfChanged(setDrawOceanEffectsInLakes, 'drawOceanEffectsInLakes', settings.drawOceanEffectsInLakes)
      const riverHex = colorToHex(settings.riverColor)
      if (riverHex) setIfChanged(setRiverColorHex, 'riverColorHex', riverHex)

      if (Number.isFinite(Number(settings.concentricWaveCount)))
        setIfChanged(setConcentricWaveCount, 'concentricWaveCount', Number(settings.concentricWaveCount))
      if (typeof settings.fadeConcentricWaves === 'boolean')
        setIfChanged(setFadeConcentricWaves, 'fadeConcentricWaves', settings.fadeConcentricWaves)
      if (typeof settings.jitterToConcentricWaves === 'boolean')
        setIfChanged(setJitterToConcentricWaves, 'jitterToConcentricWaves', settings.jitterToConcentricWaves)
      if (typeof settings.brokenLinesForConcentricWaves === 'boolean')
        setIfChanged(setBrokenLinesForConcentricWaves, 'brokenLinesForConcentricWaves', settings.brokenLinesForConcentricWaves)
    },

    applyTextSettings(settings) {
      recordCall('applyTextSettings')
      const {
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
      } = setters

      if (typeof settings.drawRoads === 'boolean') setIfChanged(setDrawRoads, 'drawRoads', settings.drawRoads)
      if (typeof settings.drawText === 'boolean') setIfChanged(setDrawText, 'drawText', settings.drawText)
      setIfChanged(setTitleFontFamily, 'titleFontFamily', fontSpecToFamily(settings.titleFont))
      setIfChanged(setRegionFontFamily, 'regionFontFamily', fontSpecToFamily(settings.regionFont))
      setIfChanged(setMountainRangeFontFamily, 'mountainRangeFontFamily', fontSpecToFamily(settings.mountainRangeFont))
      setIfChanged(setOtherMountainsFontFamily, 'otherMountainsFontFamily', fontSpecToFamily(settings.otherMountainsFont))
      setIfChanged(setCitiesFontFamily, 'citiesFontFamily', fontSpecToFamily(settings.citiesFont))
      setIfChanged(setRiverFontFamily, 'riverFontFamily', fontSpecToFamily(settings.riverFont))
      const textHex = colorToHex(settings.textColor)
      if (textHex) setIfChanged(setTextColorHex, 'textColorHex', textHex)
      if (typeof settings.drawBoldBackground === 'boolean')
        setIfChanged(setDrawBoldBackground, 'drawBoldBackground', settings.drawBoldBackground)
      const boldBackgroundHex = colorToHex(settings.boldBackgroundColor)
      if (boldBackgroundHex) setIfChanged(setBoldBackgroundColorHex, 'boldBackgroundColorHex', boldBackgroundHex)
    },

    applyRoadAndScaleSettings(settings) {
      recordCall('applyRoadAndScaleSettings')
      const {
        setDrawRoads,
        setRoadStyle,
        setRoadWidth,
        setRoadColorHex,
        setMountainSize,
        setHillSize,
        setDuneSize,
        setTreeHeight,
        setCitySize,
      } = setters

      if (typeof settings.drawRoads === 'boolean') setIfChanged(setDrawRoads, 'drawRoads', settings.drawRoads)

      // roadStyle may be an object {type, width} or a string
      if (typeof settings.roadStyle === 'string' && settings.roadStyle) {
        setIfChanged(setRoadStyle, 'roadStyle', settings.roadStyle)
      } else if (settings.roadStyle && typeof settings.roadStyle === 'object') {
        if (typeof settings.roadStyle.type === 'string') setIfChanged(setRoadStyle, 'roadStyle', settings.roadStyle.type)
        if (Number.isFinite(Number(settings.roadStyle.width))) setIfChanged(setRoadWidth, 'roadWidth', Number(settings.roadStyle.width))
      }

      if (Number.isFinite(Number(settings.roadWidth))) setIfChanged(setRoadWidth, 'roadWidth', Number(settings.roadWidth))
      const roadHex = colorToHex(settings.roadColor)
      if (roadHex) setIfChanged(setRoadColorHex, 'roadColorHex', roadHex)

      // Reuse the module-level helper implementations for conversion
      // from scale to slider values (avoid duplicate implementations).

      applyScaleSetting(settings.mountainScale ?? settings.mountainSize, setMountainSize, 'mountainSize', inverseGetSliderFromScale)
      applyScaleSetting(settings.hillScale ?? settings.hillSize, setHillSize, 'hillSize', inverseGetSliderFromScale)
      applyScaleSetting(settings.duneScale ?? settings.duneSize, setDuneSize, 'duneSize', inverseGetSliderFromScale)
      applyScaleSetting(settings.treeHeightScale ?? settings.treeHeight, setTreeHeight, 'treeHeight', inverseGetTreeHeightSliderFromScale)
      applyScaleSetting(settings.cityScale ?? settings.citySize, setCitySize, 'citySize', inverseGetSliderFromScale)
    },
  }
}
