import { colorToHex, parseColorChannels, colorToHexWithAlpha } from './utils'

export function serializeNortObject(obj) {
  function sortRec(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const keys = Object.keys(v).sort((a, b) => String(a).localeCompare(String(b)))
      const out = {}
      for (const k of keys) out[k] = sortRec(v[k])
      return out
    }
    if (Array.isArray(v)) return v.map(sortRec)
    return v
  }

  return JSON.stringify(sortRec(obj), null, 2)
}

export function setResourceFromRef(parsedSettings, key, ref) {
  if (!ref) return
  const parts = ref.split('|', 2)
  if (parts.length === 2) {
    parsedSettings[key] = { artPack: parts[0], name: parts[1] }
  }
}

export function parseBooleanWithDefault(value, mergedRef, priorKey, uiValue) {
  const orig = mergedRef?.current?.[priorKey]
  if (typeof orig === 'boolean' && uiValue === false && orig !== uiValue) {
    return Boolean(orig)
  }
  return Boolean(value)
}

export function scaleSliderValue(
  sliderValue,
  sliderValueFor1Scale = 5,
  scaleMin = 0.5,
  scaleMax = 3
) {
  const v = Number(sliderValue)
  if (!Number.isFinite(v)) return undefined
  const minSlider = 1,
    maxSlider = 15
  if (v <= sliderValueFor1Scale) {
    const slope = (sliderValueFor1Scale - minSlider) / (1 - scaleMin)
    return (v - (sliderValueFor1Scale - slope)) / slope
  } else {
    const slope = (maxSlider - sliderValueFor1Scale) / (scaleMax - 1)
    return (v - (sliderValueFor1Scale - slope * 1)) / slope
  }
}

export function computeGridOverlayAlpha(origColor, uiGridOverlayColor) {
  if (!origColor) return 255
  const origHex = colorToHex(origColor)
  if (
    origHex &&
    uiGridOverlayColor &&
    origHex.toLowerCase() === String(uiGridOverlayColor).toLowerCase()
  ) {
    const ch = parseColorChannels(origColor)
    if (ch?.a !== undefined && Number.isFinite(Number(ch.a))) return Number(ch.a)
  }
  return 255
}

export function computeConcentricWaveCount(origCount, uiConcentricWaveCount) {
  const uiCountNum = Number(uiConcentricWaveCount)
  if (typeof origCount === 'number' && (!Number.isFinite(uiCountNum) || uiCountNum === 0)) {
    return origCount
  } else if (Number.isFinite(uiCountNum)) {
    return uiCountNum
  }
  return Number.isFinite(Number(uiConcentricWaveCount)) ? Number(uiConcentricWaveCount) : undefined
}

export function buildCustomizePayload(values) {
  return {
    backgroundType: values.backgroundType,
    textureRef: values.textureRef,
    backgroundSeed: values.backgroundSeed,
    drawRegionBoundaries: values.drawRegionBoundaries,
    colorizeLand: values.colorizeLand,
    colorizeOcean: values.colorizeOcean,
    oceanColor: values.oceanColor,
    landColor: values.landColor,
    regionBoundaryStyle: values.regionBoundaryStyle,
    regionBoundaryWidth: values.regionBoundaryWidth,
    regionBoundaryColor: values.regionBoundaryColor,
    drawBorder: values.drawBorder,
    drawGridOverlay: values.drawGridOverlay,
    finalLandColoringMethod: values.finalLandColoringMethod,
    borderRef: values.borderRef,
    borderWidth: values.borderWidth,
    borderPosition: values.borderPosition,
    borderColorOption: values.borderColorOption,
    borderColor: values.borderColor,
    frayedBorder: values.frayedBorder,
    frayedBorderBlurLevel: values.frayedBorderBlurLevel,
    frayedBorderSize: values.frayedBorderSize,
    frayedBorderSeed: values.frayedBorderSeed,
    drawGrunge: values.drawGrunge,
    grungeWidth: values.grungeWidth,
    frayedBorderColor: values.frayedBorderColor,
    lineStyle: values.lineStyle,
    coastlineWidth: values.coastlineWidth,
    coastlineColor: values.coastlineColor,
    coastShadingLevel: values.coastShadingLevel,
    coastShadingColor: values.coastShadingColor,
    oceanShadingLevel: values.oceanShadingLevel,
    oceanShadingColor: values.oceanShadingColor,
    oceanWavesType: values.oceanWavesType,
    oceanWavesLevel: values.oceanWavesLevel,
    oceanWavesColor: values.oceanWavesColor,
    concentricWaveCount: values.concentricWaveCount,
    fadeConcentricWaves: values.fadeConcentricWaves,
    jitterToConcentricWaves: values.jitterToConcentricWaves,
    brokenLinesForConcentricWaves: values.brokenLinesForConcentricWaves,
    drawOceanEffectsInLakes: values.drawOceanEffectsInLakes,
    riverColor: values.riverColor,
    drawRoads: values.drawRoads,
    roadStyle: values.roadStyle,
    roadWidth: values.roadWidth,
    roadColor: values.roadColor,
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
    textColor: values.textColor,
    drawBoldBackground: values.drawBoldBackground,
    boldBackgroundColor: values.boldBackgroundColor,
  }
}

export function persistCustomizeOverrides(values) {
  const payload = buildCustomizePayload(values)
  localStorage.setItem('vellaris-customize-overrides', JSON.stringify(payload))
}

export function loadRandomOverrides() {
  const raw = localStorage.getItem('vellaris-random-manual-overrides')
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadCustomizeOverrides() {
  const raw = localStorage.getItem('vellaris-customize-overrides')
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

// Small helper apis used by GenerateForm.applyServerDefaults to avoid
// duplicating simple setter patterns across multiple files.
export function setHex(setter, value) {
  if (value) {
    const h = colorToHexWithAlpha ? colorToHexWithAlpha(value) || colorToHex(value) : colorToHex(value)
    if (h) setter(h)
  }
}

export function setNumber(setter, value) {
  if (Number.isFinite(Number(value))) setter(Number(value))
}

export function setString(setter, value) {
  if (value !== undefined && value !== null) setter(String(value))
}

export function setBoolean(setter, value) {
  if (typeof value === 'boolean') setter(value)
}

export function setAlphaFromValueOrColor(alphaVal, colorVal, setter) {
  if (alphaVal !== undefined && alphaVal !== null) {
    setter(alphaVal)
    return
  }
  if (colorVal) {
    const ch = parseColorChannels(colorVal)
    if (ch?.a !== undefined && Number.isFinite(Number(ch.a))) setter(Number(ch.a))
  }
}

export function convertScaleToSlider(scale) {
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

export function applyRoadStyleHelper(defs, setRoadStyle, setRoadWidth, setRoadColor) {
  if (typeof defs.roadStyle === 'object' && defs.roadStyle !== null) {
    if (typeof defs.roadStyle.type === 'string') setString(setRoadStyle, defs.roadStyle.type)
    if (Number.isFinite(Number(defs.roadStyle.width))) setNumber(setRoadWidth, Number(defs.roadStyle.width))
  } else if (typeof defs.roadStyle === 'string') {
    setString(setRoadStyle, defs.roadStyle)
  }
  if (Number.isFinite(Number(defs.roadWidth))) setNumber(setRoadWidth, defs.roadWidth)
  setHex(setRoadColor, defs.roadColor)
}

export function applyBasicSettings(defs, opts, setters) {
  const {
    setWorldSize,
    setRegionCount,
    setCityFrequency,
    setFinalWidth,
    setFinalHeight,
    setMapLanguage,
    setDimension,
    setLandShape,
  } = setters
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
}
