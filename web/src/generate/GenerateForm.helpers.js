import { colorToHex, parseColorChannels } from './utils'

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

export function scaleSliderValue(sliderValue, sliderValueFor1Scale = 5, scaleMin = 0.5, scaleMax = 3) {
  const v = Number(sliderValue)
  if (!Number.isFinite(v)) return undefined
  const minSlider = 1, maxSlider = 15
  if (v <= sliderValueFor1Scale) {
    const slope = (sliderValueFor1Scale - minSlider) / (1 - scaleMin)
    return (v - (sliderValueFor1Scale - slope)) / slope
  } else {
    const slope = (maxSlider - sliderValueFor1Scale) / (scaleMax - 1)
    return (v - (sliderValueFor1Scale - slope * 1)) / slope
  }
}

export function computeGridOverlayAlpha(origColor, uiGridOverlayColorHex) {
  if (!origColor) return 255
  const origHex = colorToHex(origColor)
  if (origHex && uiGridOverlayColorHex && origHex.toLowerCase() === String(uiGridOverlayColorHex).toLowerCase()) {
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

export function persistCustomizeOverrides(values) {
  const payload = buildCustomizePayload(values)
  localStorage.setItem('vellaris-customize-overrides', JSON.stringify(payload))
}

export function loadRandomOverrides() {
  const raw = localStorage.getItem('vellaris-random-manual-overrides')
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch {
    return {}
  }
}

export function loadCustomizeOverrides() {
  const raw = localStorage.getItem('vellaris-customize-overrides')
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch {
    return {}
  }
}
