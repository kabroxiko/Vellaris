import { useEffect, useMemo, useState } from 'react'
import { persistCustomizeOverrides } from '../GenerateForm.helpers'

export default function useCustomizeSettings(initialCustomize = {}) {
  const [backgroundType, setBackgroundType] = useState(initialCustomize.backgroundType)
  const [textureRef, setTextureRef] = useState(initialCustomize.textureRef)
  const [backgroundSeed, setBackgroundSeed] = useState(initialCustomize.backgroundSeed)
  const [drawRegionBoundaries, setDrawRegionBoundaries] = useState(
    initialCustomize.drawRegionBoundaries
  )
  const [colorizeLand, setColorizeLand] = useState(initialCustomize.colorizeLand)
  const [colorizeOcean, setColorizeOcean] = useState(initialCustomize.colorizeOcean)
  const [oceanColorHex, setOceanColorHex] = useState(initialCustomize.oceanColorHex)
  const [landColorHex, setLandColorHex] = useState(initialCustomize.landColorHex)
  const [regionBoundaryStyle, setRegionBoundaryStyle] = useState(
    initialCustomize.regionBoundaryStyle
  )
  const [regionBoundaryWidth, setRegionBoundaryWidth] = useState(
    initialCustomize.regionBoundaryWidth
  )
  const [regionBoundaryColorHex, setRegionBoundaryColorHex] = useState(
    initialCustomize.regionBoundaryColorHex
  )
  const [drawBorder, setDrawBorder] = useState(initialCustomize.drawBorder)
  const [drawGridOverlay, setDrawGridOverlay] = useState(initialCustomize.drawGridOverlay)
  const [gridOverlayShape, setGridOverlayShape] = useState(initialCustomize.gridOverlayShape)
  const [gridOverlayRowOrColCount, setGridOverlayRowOrColCount] = useState(
    initialCustomize.gridOverlayRowOrColCount
  )
  const [gridOverlayColorHex, setGridOverlayColorHex] = useState(
    initialCustomize.gridOverlayColorHex
  )
  const [gridOverlayXOffset, setGridOverlayXOffset] = useState(initialCustomize.gridOverlayXOffset)
  const [gridOverlayYOffset, setGridOverlayYOffset] = useState(initialCustomize.gridOverlayYOffset)
  const [gridOverlayLineWidth, setGridOverlayLineWidth] = useState(
    initialCustomize.gridOverlayLineWidth
  )
  const [gridOverlayLayer, setGridOverlayLayer] = useState(initialCustomize.gridOverlayLayer)
  const [drawVoronoiGridOverlayOnlyOnLand, setDrawVoronoiGridOverlayOnlyOnLand] = useState(
    initialCustomize.drawVoronoiGridOverlayOnlyOnLand
  )

  const [finalLandColoringMethod, setFinalLandColoringMethod] = useState(
    initialCustomize.finalLandColoringMethod
  )
  const [borderRef, setBorderRef] = useState(initialCustomize.borderRef)
  const [borderWidth, setBorderWidth] = useState(initialCustomize.borderWidth)
  const [borderPosition, setBorderPosition] = useState(initialCustomize.borderPosition)
  const [borderColorOption, setBorderColorOption] = useState(initialCustomize.borderColorOption)
  const [borderColorHex, setBorderColorHex] = useState(initialCustomize.borderColorHex)
  const [frayedBorder, setFrayedBorder] = useState(initialCustomize.frayedBorder)
  const [frayedBorderBlurLevel, setFrayedBorderBlurLevel] = useState(
    initialCustomize.frayedBorderBlurLevel
  )
  const [frayedBorderSize, setFrayedBorderSize] = useState(initialCustomize.frayedBorderSize)
  const [frayedBorderSeed, setFrayedBorderSeed] = useState(initialCustomize.frayedBorderSeed)
  const [drawGrunge, setDrawGrunge] = useState(initialCustomize.drawGrunge)
  const [grungeWidth, setGrungeWidth] = useState(initialCustomize.grungeWidth)
  const [frayedBorderColorHex, setFrayedBorderColorHex] = useState(
    initialCustomize.frayedBorderColorHex
  )
  const [lineStyle, setLineStyle] = useState(initialCustomize.lineStyle)
  const [coastlineWidth, setCoastlineWidth] = useState(initialCustomize.coastlineWidth)
  const [coastlineColorHex, setCoastlineColorHex] = useState(initialCustomize.coastlineColorHex)
  const [coastShadingLevel, setCoastShadingLevel] = useState(initialCustomize.coastShadingLevel)
  const [coastShadingColorHex, setCoastShadingColorHex] = useState(
    initialCustomize.coastShadingColorHex
  )
  const [coastShadingAlpha, setCoastShadingAlpha] = useState(initialCustomize.coastShadingAlpha)
  const [oceanShadingAlpha, setOceanShadingAlpha] = useState(initialCustomize.oceanShadingAlpha)
  const [oceanShadingLevel, setOceanShadingLevel] = useState(initialCustomize.oceanShadingLevel)
  const [oceanShadingColorHex, setOceanShadingColorHex] = useState(
    initialCustomize.oceanShadingColorHex
  )
  const [oceanWavesType, setOceanWavesType] = useState(initialCustomize.oceanWavesType)
  const [oceanWavesLevel, setOceanWavesLevel] = useState(initialCustomize.oceanWavesLevel)
  const [oceanWavesColorHex, setOceanWavesColorHex] = useState(initialCustomize.oceanWavesColorHex)
  const [oceanWavesAlpha, setOceanWavesAlpha] = useState(initialCustomize.oceanWavesAlpha)
  const [concentricWaveCount, setConcentricWaveCount] = useState(
    initialCustomize.concentricWaveCount
  )
  const [fadeConcentricWaves, setFadeConcentricWaves] = useState(
    initialCustomize.fadeConcentricWaves
  )
  const [jitterToConcentricWaves, setJitterToConcentricWaves] = useState(
    initialCustomize.jitterToConcentricWaves
  )
  const [brokenLinesForConcentricWaves, setBrokenLinesForConcentricWaves] = useState(
    initialCustomize.brokenLinesForConcentricWaves
  )
  const [drawOceanEffectsInLakes, setDrawOceanEffectsInLakes] = useState(
    initialCustomize.drawOceanEffectsInLakes
  )
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
  const [mountainRangeFontFamily, setMountainRangeFontFamily] = useState(
    initialCustomize.mountainRangeFontFamily
  )
  const [otherMountainsFontFamily, setOtherMountainsFontFamily] = useState(
    initialCustomize.otherMountainsFontFamily
  )
  const [citiesFontFamily, setCitiesFontFamily] = useState(initialCustomize.citiesFontFamily)
  const [riverFontFamily, setRiverFontFamily] = useState(initialCustomize.riverFontFamily)
  const [textColorHex, setTextColorHex] = useState(initialCustomize.textColorHex)
  const [drawBoldBackground, setDrawBoldBackground] = useState(initialCustomize.drawBoldBackground)
  const [boldBackgroundColorHex, setBoldBackgroundColorHex] = useState(
    initialCustomize.boldBackgroundColorHex
  )

  const values = {
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
  }

  const setters = {
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
  }

  const customizeDeps = useMemo(
    () => [
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
    ],
    [
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
  )

  useEffect(() => {
    persistCustomizeOverrides(values)
  }, [customizeDeps])

  return { values, setters, customizeDeps }
}
