import { formatColorString } from './utils'
import { hexToRgbaString } from './sharedHelpers'

export function mergeColor(
  parsedSettings,
  key,
  hexStr,
  opacityPercent = 100,
  useFormatter = false
) {
  if (!hexStr) return
  if (useFormatter) {
    const formatted = formatColorString(hexStr, opacityPercent)
    if (formatted) {
      parsedSettings[key] = formatted
      return
    }
  }
  parsedSettings[key] = hexToRgbaString(hexStr, 255)
}

export function applyBackgroundFlagsHoisted(parsedSettings, backgroundType) {
  const bgFlags = {
    SolidColor: {
      solidColorBackground: true,
      generateBackgroundFromTexture: false,
      generateBackground: false,
    },
    GeneratedFromTexture: {
      solidColorBackground: false,
      generateBackgroundFromTexture: true,
      generateBackground: false,
    },
  }
  const flags = bgFlags[backgroundType] || {
    solidColorBackground: false,
    generateBackgroundFromTexture: false,
    generateBackground: true,
  }
  Object.assign(parsedSettings, flags)
}

export function applyResourcesAndTopLevelHoisted(parsedSettings, ctx) {
  const {
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
  } = ctx
  setResourceFromRef(parsedSettings, 'borderResource', borderRef)
  setResourceFromRef(parsedSettings, 'backgroundTextureResource', textureRef)
  if (backgroundSeed) parsedSettings.backgroundRandomSeed = Number(backgroundSeed)
  if (artPack) parsedSettings.artPack = artPack
  if (worldSize !== 'undefined') parsedSettings.worldSize = Number(worldSize)
  if (landShape) parsedSettings.landShape = landShape
  if (Number.isFinite(Number(regionCount))) parsedSettings.regionCount = Number(regionCount)
  if (randomSeed) parsedSettings.randomSeed = Number(randomSeed)
  if (selectedBooks && typeof selectedBooks === 'object' && typeof selectedBooks.size === 'number')
    parsedSettings.books = Array.from(selectedBooks).sort((a, b) =>
      String(a).localeCompare(String(b))
    )
}

export function applyGridAndColoringHoisted(parsedSettings, ctx) {
  const {
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
    getGridOverlayAlpha,
  } = ctx
  const merge = mergeColor

  if (!parsedSettings.regionBoundaryStyle || typeof parsedSettings.regionBoundaryStyle !== 'object')
    parsedSettings.regionBoundaryStyle = {}
  if (regionBoundaryStyle) parsedSettings.regionBoundaryStyle.type = regionBoundaryStyle
  if (Number.isFinite(Number(regionBoundaryWidth)))
    parsedSettings.regionBoundaryStyle.width = Number(regionBoundaryWidth)
  merge(parsedSettings, 'regionBoundaryColor', regionBoundaryColorHex)
  parsedSettings.drawRegionBoundaries = Boolean(drawRegionBoundaries)
  parsedSettings.colorizeLand = Boolean(colorizeLand)
  parsedSettings.colorizeOcean = Boolean(colorizeOcean)
  mergeColor(parsedSettings, 'oceanColor', oceanColorHex, 100, true)
  mergeColor(parsedSettings, 'landColor', landColorHex, 100, true)
  parsedSettings.drawGridOverlay = Boolean(drawGridOverlay)
  if (gridOverlayShape) parsedSettings.gridOverlayShape = gridOverlayShape
  if (Number.isFinite(Number(gridOverlayRowOrColCount)))
    parsedSettings.gridOverlayRowOrColCount = Number(gridOverlayRowOrColCount)
  if (gridOverlayColorHex) {
    const alpha = getGridOverlayAlpha()
    parsedSettings.gridOverlayColor = hexToRgbaString(gridOverlayColorHex, alpha)
  }
  if (gridOverlayXOffset) parsedSettings.gridOverlayXOffset = gridOverlayXOffset
  if (gridOverlayYOffset) parsedSettings.gridOverlayYOffset = gridOverlayYOffset
  if (Number.isFinite(Number(gridOverlayLineWidth)))
    parsedSettings.gridOverlayLineWidth = Number(gridOverlayLineWidth)
  if (gridOverlayLayer) parsedSettings.gridOverlayLayer = gridOverlayLayer
  parsedSettings.drawVoronoiGridOverlayOnlyOnLand = Boolean(drawVoronoiGridOverlayOnlyOnLand)
  const resolvedLandMethod = resolveLandColoringMethod(finalLandColoringMethod)
  if (resolvedLandMethod)
    parsedSettings.drawRegionColors = resolvedLandMethod === 'ColorPoliticalRegions'
}

export function applyBordersFrayedAndGrungeHoisted(parsedSettings, ctx) {
  const {
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
    mergeColor: mergeColorFromCtx,
  } = ctx
  const merge = mergeColorFromCtx || mergeColor
  parsedSettings.borderWidth = Number(borderWidth)
  parsedSettings.borderPosition = borderPosition
  parsedSettings.borderColorOption = borderColorOption
  merge(parsedSettings, 'borderColor', borderColorHex)
  parsedSettings.frayedBorder = Boolean(frayedBorder)
  if (Number.isFinite(Number(frayedBorderBlurLevel)))
    parsedSettings.frayedBorderBlurLevel = Number(frayedBorderBlurLevel)
  if (Number.isFinite(Number(frayedBorderSize)))
    parsedSettings.frayedBorderSize = Number(frayedBorderSize)
  if (frayedBorderSeed) parsedSettings.frayedBorderSeed = Number(frayedBorderSeed)
  parsedSettings.drawGrunge = Boolean(drawGrunge)
  if (Number.isFinite(Number(grungeWidth))) parsedSettings.grungeWidth = Number(grungeWidth)
  merge(parsedSettings, 'frayedBorderColor', frayedBorderColorHex)
}

export function applyCoastOceanAndWavesHoisted(parsedSettings, ctx) {
  const {
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
    oceanWavesAlpha,
    getConcentricWaveCount,
    fadeConcentricWaves,
    jitterToConcentricWaves,
    brokenLinesForConcentricWaves,
    oceanWavesColorHex,
    drawOceanEffectsInLakes,
    riverColorHex,
    parseBooleanWithDefault,
    mergedSettingsRef,
    mergeColor: mergeColorFromCtx,
  } = ctx
  const merge = mergeColorFromCtx || mergeColor
  if (lineStyle) parsedSettings.lineStyle = lineStyle
  if (Number.isFinite(Number(coastlineWidth)))
    parsedSettings.coastlineWidth = Number(coastlineWidth)
  merge(parsedSettings, 'coastlineColor', coastlineColorHex)
  if (Number.isFinite(Number(coastShadingLevel)))
    parsedSettings.coastShadingLevel = Number(coastShadingLevel)
  if (coastShadingColorHex) {
    const opacityPercent = 100 - Number(coastShadingAlpha ?? 0)
    merge(parsedSettings, 'coastShadingColor', coastShadingColorHex, opacityPercent, true)
  }
  if (Number.isFinite(Number(oceanShadingLevel)))
    parsedSettings.oceanShadingLevel = Number(oceanShadingLevel)
  if (oceanShadingColorHex) {
    const oceanOpacityPercent = 100 - Number(oceanShadingAlpha ?? 0)
    merge(parsedSettings, 'oceanShadingColor', oceanShadingColorHex, oceanOpacityPercent, true)
  }
  if (oceanWavesType) parsedSettings.oceanEffect = oceanWavesType
  if (Number.isFinite(Number(oceanWavesLevel)))
    parsedSettings.oceanWavesLevel = Number(oceanWavesLevel)
  parsedSettings.concentricWaveCount = getConcentricWaveCount()
  parsedSettings.fadeConcentricWaves = Boolean(fadeConcentricWaves)
  parsedSettings.jitterToConcentricWaves = parseBooleanWithDefault(
    jitterToConcentricWaves,
    mergedSettingsRef,
    'jitterToConcentricWaves',
    jitterToConcentricWaves
  )
  parsedSettings.brokenLinesForConcentricWaves = parseBooleanWithDefault(
    brokenLinesForConcentricWaves,
    mergedSettingsRef,
    'brokenLinesForConcentricWaves',
    brokenLinesForConcentricWaves
  )
  if (oceanWavesColorHex) {
    const opacityPercent = 100 - Number(oceanWavesAlpha ?? 0)
    merge(parsedSettings, 'oceanWavesColor', oceanWavesColorHex, opacityPercent, true)
  }
  parsedSettings.drawOceanEffectsInLakes = Boolean(drawOceanEffectsInLakes)
  merge(parsedSettings, 'riverColor', riverColorHex)
}

export function applyRoadsAndScalesHoisted(parsedSettings, ctx) {
  const {
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
    mergeColor: mergeColorFromCtx,
  } = ctx
  const merge = mergeColorFromCtx || mergeColor
  parsedSettings.drawRoads = Boolean(drawRoads)
  if (roadStyle) {
    parsedSettings.roadStyle = {
      type: roadStyle,
      width: Number.isFinite(Number(roadWidth)) ? Number(roadWidth) : undefined,
    }
  } else if (Number.isFinite(Number(roadWidth))) {
    parsedSettings.roadStyle = { width: Number(roadWidth) }
  }
  merge(parsedSettings, 'roadColor', roadColorHex)
  if (Number.isFinite(Number(mountainSize)))
    parsedSettings.mountainScale = scaleSliderValue(mountainSize)
  if (Number.isFinite(Number(hillSize))) parsedSettings.hillScale = scaleSliderValue(hillSize)
  if (Number.isFinite(Number(duneSize))) parsedSettings.duneScale = scaleSliderValue(duneSize)
  if (Number.isFinite(Number(treeHeight)))
    parsedSettings.treeHeightScale = 0.1 + Number(treeHeight) * 0.05
  if (Number.isFinite(Number(citySize))) parsedSettings.cityScale = scaleSliderValue(citySize)
}

export function applyTextAndBackgroundHoisted(parsedSettings, ctx) {
  const {
    drawText,
    textColorHex,
    drawBoldBackground,
    boldBackgroundColorHex,
    mergeColor: mergeColorFromCtx,
  } = ctx
  const merge = mergeColorFromCtx || mergeColor
  parsedSettings.drawText = Boolean(drawText)
  merge(parsedSettings, 'textColor', textColorHex)
  parsedSettings.drawBoldBackground = Boolean(drawBoldBackground)
  merge(parsedSettings, 'boldBackgroundColor', boldBackgroundColorHex)
}
