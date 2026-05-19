import {
  applyBackgroundFlagsHoisted,
  applyResourcesAndTopLevelHoisted,
  applyGridAndColoringHoisted,
  applyBordersFrayedAndGrungeHoisted,
  applyCoastOceanAndWavesHoisted,
  applyRoadsAndScalesHoisted,
  applyTextAndBackgroundHoisted,
} from './GenerateForm.appliers'

export default function mergeUiIntoParsed(parsedSettings, opts) {
  applyBackgroundFlagsHoisted(parsedSettings, opts.backgroundType)

  applyResourcesAndTopLevelHoisted(parsedSettings, {
    setResourceFromRef: opts.setResourceFromRef,
    borderRef: opts.borderRef,
    textureRef: opts.textureRef,
    backgroundSeed: opts.backgroundSeed,
    artPack: opts.artPack,
    worldSize: opts.worldSize,
    landShape: opts.landShape,
    regionCount: opts.regionCount,
    randomSeed: opts.randomSeed,
    selectedBooks: opts.selectedBooks,
  })

  applyGridAndColoringHoisted(parsedSettings, {
    regionBoundaryStyle: opts.regionBoundaryStyle,
    regionBoundaryWidth: opts.regionBoundaryWidth,
    regionBoundaryColorHex: opts.regionBoundaryColorHex,
    drawRegionBoundaries: opts.drawRegionBoundaries,
    colorizeLand: opts.colorizeLand,
    colorizeOcean: opts.colorizeOcean,
    oceanColorHex: opts.oceanColorHex,
    landColorHex: opts.landColorHex,
    drawGridOverlay: opts.drawGridOverlay,
    gridOverlayShape: opts.gridOverlayShape,
    gridOverlayRowOrColCount: opts.gridOverlayRowOrColCount,
    gridOverlayColorHex: opts.gridOverlayColorHex,
    gridOverlayXOffset: opts.gridOverlayXOffset,
    gridOverlayYOffset: opts.gridOverlayYOffset,
    gridOverlayLineWidth: opts.gridOverlayLineWidth,
    gridOverlayLayer: opts.gridOverlayLayer,
    drawVoronoiGridOverlayOnlyOnLand: opts.drawVoronoiGridOverlayOnlyOnLand,
    resolveLandColoringMethod: opts.resolveLandColoringMethod,
    finalLandColoringMethod: opts.finalLandColoringMethod,
    mergeColor: opts.mergeColor,
    getGridOverlayAlpha: opts.getGridOverlayAlpha,
  })

  applyBordersFrayedAndGrungeHoisted(parsedSettings, {
    borderWidth: opts.borderWidth,
    borderPosition: opts.borderPosition,
    borderColorOption: opts.borderColorOption,
    borderColorHex: opts.borderColorHex,
    frayedBorder: opts.frayedBorder,
    frayedBorderBlurLevel: opts.frayedBorderBlurLevel,
    frayedBorderSize: opts.frayedBorderSize,
    frayedBorderSeed: opts.frayedBorderSeed,
    drawGrunge: opts.drawGrunge,
    grungeWidth: opts.grungeWidth,
    frayedBorderColorHex: opts.frayedBorderColorHex,
    mergeColor: opts.mergeColor,
  })

  applyCoastOceanAndWavesHoisted(parsedSettings, {
    lineStyle: opts.lineStyle,
    coastlineWidth: opts.coastlineWidth,
    coastlineColorHex: opts.coastlineColorHex,
    coastShadingLevel: opts.coastShadingLevel,
    coastShadingColorHex: opts.coastShadingColorHex,
    coastShadingAlpha: opts.coastShadingAlpha,
    oceanShadingLevel: opts.oceanShadingLevel,
    oceanShadingColorHex: opts.oceanShadingColorHex,
    oceanShadingAlpha: opts.oceanShadingAlpha,
    oceanWavesType: opts.oceanWavesType,
    oceanWavesLevel: opts.oceanWavesLevel,
    getConcentricWaveCount: opts.getConcentricWaveCount,
    fadeConcentricWaves: opts.fadeConcentricWaves,
    jitterToConcentricWaves: opts.jitterToConcentricWaves,
    brokenLinesForConcentricWaves: opts.brokenLinesForConcentricWaves,
    mergeColor: opts.mergeColor,
    oceanWavesColorHex: opts.oceanWavesColorHex,
    drawOceanEffectsInLakes: opts.drawOceanEffectsInLakes,
    riverColorHex: opts.riverColorHex,
    parseBooleanWithDefault: opts.parseBooleanWithDefault,
    mergedSettingsRef: opts.mergedSettingsRef,
  })

  applyRoadsAndScalesHoisted(parsedSettings, {
    drawRoads: opts.drawRoads,
    roadStyle: opts.roadStyle,
    roadWidth: opts.roadWidth,
    mergeColor: opts.mergeColor,
    roadColorHex: opts.roadColorHex,
    mountainSize: opts.mountainSize,
    hillSize: opts.hillSize,
    duneSize: opts.duneSize,
    treeHeight: opts.treeHeight,
    citySize: opts.citySize,
    scaleSliderValue: opts.scaleSliderValue,
  })

  applyTextAndBackgroundHoisted(parsedSettings, {
    drawText: opts.drawText,
    textColorHex: opts.textColorHex,
    drawBoldBackground: opts.drawBoldBackground,
    boldBackgroundColorHex: opts.boldBackgroundColorHex,
    mergeColor: opts.mergeColor,
  })
}
