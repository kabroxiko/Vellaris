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
    regionBoundaryColor: opts.regionBoundaryColor,
    drawRegionBoundaries: opts.drawRegionBoundaries,
    colorizeLand: opts.colorizeLand,
    colorizeOcean: opts.colorizeOcean,
    oceanColor: opts.oceanColor,
    landColor: opts.landColor,
    drawGridOverlay: opts.drawGridOverlay,
    gridOverlayShape: opts.gridOverlayShape,
    gridOverlayRowOrColCount: opts.gridOverlayRowOrColCount,
    gridOverlayColor: opts.gridOverlayColor,
    gridOverlayXOffset: opts.gridOverlayXOffset,
    gridOverlayYOffset: opts.gridOverlayYOffset,
    gridOverlayLineWidth: opts.gridOverlayLineWidth,
    gridOverlayLayer: opts.gridOverlayLayer,
    drawVoronoiGridOverlayOnlyOnLand: opts.drawVoronoiGridOverlayOnlyOnLand,
    landColoringMethod: opts.landColoringMethod,
    mergeColor: opts.mergeColor,
    getGridOverlayAlpha: opts.getGridOverlayAlpha,
  })

  applyBordersFrayedAndGrungeHoisted(parsedSettings, {
    borderWidth: opts.borderWidth,
    borderPosition: opts.borderPosition,
    borderColorOption: opts.borderColorOption,
    borderColor: opts.borderColor,
    frayedBorder: opts.frayedBorder,
    frayedBorderBlurLevel: opts.frayedBorderBlurLevel,
    frayedBorderSize: opts.frayedBorderSize,
    frayedBorderSeed: opts.frayedBorderSeed,
    drawGrunge: opts.drawGrunge,
    grungeWidth: opts.grungeWidth,
    frayedBorderColor: opts.frayedBorderColor,
    mergeColor: opts.mergeColor,
  })

  applyCoastOceanAndWavesHoisted(parsedSettings, {
    lineStyle: opts.lineStyle,
    coastlineWidth: opts.coastlineWidth,
    coastlineColor: opts.coastlineColor,
    coastShadingLevel: opts.coastShadingLevel,
    coastShadingColor: opts.coastShadingColor,
    oceanShadingLevel: opts.oceanShadingLevel,
    oceanShadingColor: opts.oceanShadingColor,
    oceanWavesType: opts.oceanWavesType,
    oceanWavesLevel: opts.oceanWavesLevel,
    getConcentricWaveCount: opts.getConcentricWaveCount,
    fadeConcentricWaves: opts.fadeConcentricWaves,
    jitterToConcentricWaves: opts.jitterToConcentricWaves,
    brokenLinesForConcentricWaves: opts.brokenLinesForConcentricWaves,
    mergeColor: opts.mergeColor,
    oceanWavesColor: opts.oceanWavesColor,
    drawOceanEffectsInLakes: opts.drawOceanEffectsInLakes,
    riverColor: opts.riverColor,
    parseBooleanWithDefault: opts.parseBooleanWithDefault,
    mergedSettingsRef: opts.mergedSettingsRef,
  })

  applyRoadsAndScalesHoisted(parsedSettings, {
    drawRoads: opts.drawRoads,
    roadStyle: opts.roadStyle,
    roadWidth: opts.roadWidth,
    mergeColor: opts.mergeColor,
    roadColor: opts.roadColor,
    mountainSize: opts.mountainSize,
    hillSize: opts.hillSize,
    duneSize: opts.duneSize,
    treeHeight: opts.treeHeight,
    citySize: opts.citySize,
    scaleSliderValue: opts.scaleSliderValue,
  })

  applyTextAndBackgroundHoisted(parsedSettings, {
    drawText: opts.drawText,
    textColor: opts.textColor,
    drawBoldBackground: opts.drawBoldBackground,
    boldBackgroundColor: opts.boldBackgroundColor,
    mergeColor: opts.mergeColor,
    titleFontFamily: opts.titleFontFamily,
    regionFontFamily: opts.regionFontFamily,
    mountainRangeFontFamily: opts.mountainRangeFontFamily,
    otherMountainsFontFamily: opts.otherMountainsFontFamily,
    citiesFontFamily: opts.citiesFontFamily,
    riverFontFamily: opts.riverFontFamily,
  })
}
