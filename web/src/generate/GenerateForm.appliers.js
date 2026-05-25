import { formatColorString, colorToHexWithAlpha, colorToHex } from './utils'

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
  parsedSettings[key] = colorToHexWithAlpha(hexStr) || colorToHex(hexStr) || hexStr
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
    regionBoundaryColor,
    drawRegionBoundaries,
    colorizeLand,
    colorizeOcean,
    oceanColor,
    landColor,
    drawGridOverlay,
    gridOverlayShape,
    gridOverlayRowOrColCount,
    gridOverlayColor,
    gridOverlayXOffset,
    gridOverlayYOffset,
    gridOverlayLineWidth,
    gridOverlayLayer,
    drawVoronoiGridOverlayOnlyOnLand,
    landColoringMethod,
    mergeColor,
    getGridOverlayAlpha,
  } = ctx
  const merge = mergeColor

  if (!parsedSettings.regionBoundaryStyle || typeof parsedSettings.regionBoundaryStyle !== 'object')
    parsedSettings.regionBoundaryStyle = {}
  if (regionBoundaryStyle) parsedSettings.regionBoundaryStyle.type = regionBoundaryStyle
  if (Number.isFinite(Number(regionBoundaryWidth)))
    parsedSettings.regionBoundaryStyle.width = Number(regionBoundaryWidth)
  merge(parsedSettings, 'regionBoundaryColor', regionBoundaryColor)
  parsedSettings.drawRegionBoundaries = Boolean(drawRegionBoundaries)
  parsedSettings.colorizeLand = Boolean(colorizeLand)
  parsedSettings.colorizeOcean = Boolean(colorizeOcean)
  mergeColor(parsedSettings, 'oceanColor', oceanColor, 100, true)
  mergeColor(parsedSettings, 'landColor', landColor, 100, true)
  parsedSettings.drawGridOverlay = Boolean(drawGridOverlay)
  if (gridOverlayShape) parsedSettings.gridOverlayShape = gridOverlayShape
  if (Number.isFinite(Number(gridOverlayRowOrColCount)))
    parsedSettings.gridOverlayRowOrColCount = Number(gridOverlayRowOrColCount)
  if (gridOverlayColor) {
    const alpha = getGridOverlayAlpha()
    parsedSettings.gridOverlayColor =
      colorToHexWithAlpha(gridOverlayColor, alpha) ||
      colorToHex(gridOverlayColor) ||
      gridOverlayColor
  }
  if (gridOverlayXOffset) parsedSettings.gridOverlayXOffset = gridOverlayXOffset
  if (gridOverlayYOffset) parsedSettings.gridOverlayYOffset = gridOverlayYOffset
  if (Number.isFinite(Number(gridOverlayLineWidth)))
    parsedSettings.gridOverlayLineWidth = Number(gridOverlayLineWidth)
  if (gridOverlayLayer) parsedSettings.gridOverlayLayer = gridOverlayLayer
  parsedSettings.drawVoronoiGridOverlayOnlyOnLand = Boolean(drawVoronoiGridOverlayOnlyOnLand)
  const resolvedLandMethod = landColoringMethod
  if (resolvedLandMethod)
    parsedSettings.drawRegionColors = resolvedLandMethod === 'ColorPoliticalRegions'
}

export function applyBordersFrayedAndGrungeHoisted(parsedSettings, ctx) {
  const {
    borderWidth,
    borderPosition,
    borderColorOption,
    borderColor,
    frayedBorder,
    frayedBorderBlurLevel,
    frayedBorderSize,
    frayedBorderSeed,
    drawGrunge,
    grungeWidth,
    frayedBorderColor,
    mergeColor: mergeColorFromCtx,
  } = ctx
  const merge = mergeColorFromCtx || mergeColor
  parsedSettings.borderWidth = Number(borderWidth)
  parsedSettings.borderPosition = borderPosition
  parsedSettings.borderColorOption = borderColorOption
  merge(parsedSettings, 'borderColor', borderColor)
  parsedSettings.frayedBorder = Boolean(frayedBorder)
  if (Number.isFinite(Number(frayedBorderBlurLevel)))
    parsedSettings.frayedBorderBlurLevel = Number(frayedBorderBlurLevel)
  if (Number.isFinite(Number(frayedBorderSize)))
    parsedSettings.frayedBorderSize = Number(frayedBorderSize)
  if (frayedBorderSeed) parsedSettings.frayedBorderSeed = Number(frayedBorderSeed)
  parsedSettings.drawGrunge = Boolean(drawGrunge)
  if (Number.isFinite(Number(grungeWidth))) parsedSettings.grungeWidth = Number(grungeWidth)
  merge(parsedSettings, 'frayedBorderColor', frayedBorderColor)
}

export function applyCoastOceanAndWavesHoisted(parsedSettings, ctx) {
  const {
    lineStyle,
    coastlineWidth,
    coastlineColor,
    coastShadingLevel,
    coastShadingColor,
    oceanShadingLevel,
    oceanShadingColor,
    oceanWavesType,
    oceanWavesLevel,
    oceanWavesColor,
    getConcentricWaveCount,
    fadeConcentricWaves,
    jitterToConcentricWaves,
    brokenLinesForConcentricWaves,
    // oceanWavesColor handled above
    drawOceanEffectsInLakes,
    riverColor,
    parseBooleanWithDefault,
    mergedSettingsRef,
    mergeColor: mergeColorFromCtx,
  } = ctx
  const merge = mergeColorFromCtx || mergeColor
  if (lineStyle) parsedSettings.lineStyle = lineStyle
  if (Number.isFinite(Number(coastlineWidth)))
    parsedSettings.coastlineWidth = Number(coastlineWidth)
  merge(parsedSettings, 'coastlineColor', coastlineColor)
  if (Number.isFinite(Number(coastShadingLevel)))
    parsedSettings.coastShadingLevel = Number(coastShadingLevel)
  if (coastShadingColor) parsedSettings.coastShadingColor = coastShadingColor
  if (Number.isFinite(Number(oceanShadingLevel)))
    parsedSettings.oceanShadingLevel = Number(oceanShadingLevel)
  if (oceanShadingColor) parsedSettings.oceanShadingColor = oceanShadingColor
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
  if (oceanWavesColor) merge(parsedSettings, 'oceanWavesColor', oceanWavesColor, 100, true)
  parsedSettings.drawOceanEffectsInLakes = Boolean(drawOceanEffectsInLakes)
  merge(parsedSettings, 'riverColor', riverColor)
}

export function applyRoadsAndScalesHoisted(parsedSettings, ctx) {
  const {
    drawRoads,
    roadStyle,
    roadWidth,
    roadColor,
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
  merge(parsedSettings, 'roadColor', roadColor)
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
    textColor,
    drawBoldBackground,
    boldBackgroundColor,
    mergeColor: mergeColorFromCtx,
  } = ctx
  const merge = mergeColorFromCtx || mergeColor
  parsedSettings.drawText = Boolean(drawText)
  merge(parsedSettings, 'textColor', textColor)
  parsedSettings.drawBoldBackground = Boolean(drawBoldBackground)
  merge(parsedSettings, 'boldBackgroundColor', boldBackgroundColor)
}
