import { colorToHex, colorToAlphaPercent, fontSpecToFamily } from './utils'
import { seedStringOrEmpty, stringValueOrEmpty, dimensionFromSize } from './helpers'

export function createSettingsAppliers(setters) {
  return {
    applyMapSizeAndSeedSettings(settings) {
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
        setFinalWidth(Number(settings.generatedWidth))
      if (Number.isFinite(Number(settings.generatedHeight)))
        setFinalHeight(Number(settings.generatedHeight))
      const seedStr = seedStringOrEmpty(settings.randomSeed)
      if (seedStr) {
        setFinalSeed(seedStr)
        setRandomSeed(seedStr)
      }
      setArtPack(stringValueOrEmpty(settings.artPack))
      setLandShape(stringValueOrEmpty(settings.landShape))
      if (Number.isFinite(Number(settings.regionCount)))
        setRegionCount(Number(settings.regionCount))
      if (Number.isFinite(Number(settings.worldSize))) setWorldSize(Number(settings.worldSize))
      setCityIconType(
        stringValueOrEmpty(settings.cityIconSetName) ||
          stringValueOrEmpty(settings.cityIconTypeName)
      )
      if (Array.isArray(settings.books) && settings.books.length > 0)
        setSelectedBooks(new Set(settings.books))
      const width = Number(settings.generatedWidth)
      const height = Number(settings.generatedHeight)
      if (Number.isFinite(width) && Number.isFinite(height))
        setDimension(dimensionFromSize(width, height))
    },

    applyRegionBoundaryStyle(regionStyle) {
      const { setRegionBoundaryStyle, setRegionBoundaryWidth } = setters
      if (typeof regionStyle === 'string' && regionStyle) {
        setRegionBoundaryStyle(regionStyle)
        return
      }
      if (!regionStyle || typeof regionStyle !== 'object') return
      if (typeof regionStyle.type === 'string') setRegionBoundaryStyle(regionStyle.type)
      if (Number.isFinite(Number(regionStyle.width)))
        setRegionBoundaryWidth(Number(regionStyle.width))
    },

    applyBackgroundTypeSettings(settings) {
      const {
        setBackgroundType,
        setTextureRef,
        setBackgroundSeed,
        setDrawRegionBoundaries,
        setColorizeLand,
        setColorizeOcean,
      } = setters

      if (settings.solidColorBackground === true) setBackgroundType('SolidColor')
      else if (settings.generateBackgroundFromTexture === true)
        setBackgroundType('GeneratedFromTexture')
      else setBackgroundType('FractalNoise')
      if (settings.backgroundTextureResource?.artPack && settings.backgroundTextureResource?.name) {
        setTextureRef(
          `${settings.backgroundTextureResource.artPack}|${settings.backgroundTextureResource.name}`
        )
      } else {
        setTextureRef('')
      }
      setBackgroundSeed(seedStringOrEmpty(settings.backgroundRandomSeed))
      if (typeof settings.drawRegionBoundaries === 'boolean')
        setDrawRegionBoundaries(settings.drawRegionBoundaries)
      if (typeof settings.colorizeLand === 'boolean') setColorizeLand(settings.colorizeLand)
      if (typeof settings.colorizeOcean === 'boolean') setColorizeOcean(settings.colorizeOcean)
    },

    applyColorAndBoundarySettings(settings) {
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
      if (oceanHex) setOceanColorHex(oceanHex)
      const landHex = colorToHex(settings.landColor)
      if (landHex) setLandColorHex(landHex)
      const boundaryHex = colorToHex(settings.regionBoundaryColor)
      if (boundaryHex) setRegionBoundaryColorHex(boundaryHex)
      this.applyRegionBoundaryStyle(settings.regionBoundaryStyle)
      if (typeof settings.drawBorder === 'boolean') setDrawBorder(settings.drawBorder)
      if (typeof settings.drawGridOverlay === 'boolean')
        setDrawGridOverlay(settings.drawGridOverlay)
      if (typeof settings.drawRegionColors === 'boolean') {
        const method = settings.drawRegionColors ? 'ColorPoliticalRegions' : 'SingleColor'
        setLandColoringMethod(method)
        setFinalLandColoringMethod(method)
      }
    },

    applyBorderSettings(settings) {
      const {
        setBorderRef,
        setBorderWidth,
        setBorderPosition,
        setBorderColorOption,
        setBorderColorHex,
      } = setters

      if (settings.borderResource?.artPack && settings.borderResource?.name) {
        setBorderRef(`${settings.borderResource.artPack}|${settings.borderResource.name}`)
      } else {
        setBorderRef('')
      }
      if (Number.isFinite(Number(settings.borderWidth)))
        setBorderWidth(Number(settings.borderWidth))
      if (typeof settings.borderPosition === 'string' && settings.borderPosition)
        setBorderPosition(settings.borderPosition)
      if (typeof settings.borderColorOption === 'string' && settings.borderColorOption)
        setBorderColorOption(settings.borderColorOption)
      const borderHex = colorToHex(settings.borderColor)
      if (borderHex) setBorderColorHex(borderHex)
    },

    applyFrayedBorderSettings(settings) {
      const {
        setFrayedBorder,
        setFrayedBorderBlurLevel,
        setFrayedBorderSize,
        setFrayedBorderSeed,
        setDrawGrunge,
        setGrungeWidth,
        setFrayedBorderColorHex,
      } = setters

      if (typeof settings.frayedBorder === 'boolean') setFrayedBorder(settings.frayedBorder)
      if (Number.isFinite(Number(settings.frayedBorderBlurLevel)))
        setFrayedBorderBlurLevel(Number(settings.frayedBorderBlurLevel))
      if (Number.isFinite(Number(settings.frayedBorderSize)))
        setFrayedBorderSize(Number(settings.frayedBorderSize))
      setFrayedBorderSeed(seedStringOrEmpty(settings.frayedBorderSeed))
      if (typeof settings.drawGrunge === 'boolean') setDrawGrunge(settings.drawGrunge)
      if (Number.isFinite(Number(settings.grungeWidth)))
        setGrungeWidth(Number(settings.grungeWidth))
      const frayedBorderHex = colorToHex(settings.frayedBorderColor)
      if (frayedBorderHex) setFrayedBorderColorHex(frayedBorderHex)
    },

    applyCoastlineSettings(settings) {
      const {
        setLineStyle,
        setCoastlineWidth,
        setCoastlineColorHex,
        setCoastShadingLevel,
        setCoastShadingColorHex,
        setCoastShadingAlpha,
      } = setters

      if (typeof settings.lineStyle === 'string' && settings.lineStyle)
        setLineStyle(settings.lineStyle)
      if (Number.isFinite(Number(settings.coastlineWidth)))
        setCoastlineWidth(Number(settings.coastlineWidth))
      const coastlineHex = colorToHex(settings.coastlineColor)
      if (coastlineHex) {
        setCoastlineColorHex(coastlineHex)
      }
      if (Number.isFinite(Number(settings.coastShadingLevel)))
        setCoastShadingLevel(Number(settings.coastShadingLevel))
      const coastShadingHex = colorToHex(settings.coastShadingColor)
      if (coastShadingHex) {
        setCoastShadingColorHex(coastShadingHex)
      }
      setCoastShadingAlpha(colorToAlphaPercent(settings.coastShadingColor, 100))
    },

    applyOceanSettings(settings) {
      const {
        setOceanShadingLevel,
        setOceanShadingColorHex,
        setOceanWavesType,
        setOceanWavesLevel,
        setOceanWavesColorHex,
        setDrawOceanEffectsInLakes,
        setRiverColorHex,
      } = setters

      if (Number.isFinite(Number(settings.oceanShadingLevel)))
        setOceanShadingLevel(Number(settings.oceanShadingLevel))
      const oceanShadingHex = colorToHex(settings.oceanShadingColor)
      if (oceanShadingHex) setOceanShadingColorHex(oceanShadingHex)
      if (typeof settings.oceanWavesType === 'string' && settings.oceanWavesType)
        setOceanWavesType(settings.oceanWavesType)
      if (Number.isFinite(Number(settings.oceanWavesLevel)))
        setOceanWavesLevel(Number(settings.oceanWavesLevel))
      const oceanWavesHex = colorToHex(settings.oceanWavesColor)
      if (oceanWavesHex) setOceanWavesColorHex(oceanWavesHex)
      if (typeof settings.drawOceanEffectsInLakes === 'boolean')
        setDrawOceanEffectsInLakes(settings.drawOceanEffectsInLakes)
      const riverHex = colorToHex(settings.riverColor)
      if (riverHex) setRiverColorHex(riverHex)
    },

    applyTextSettings(settings) {
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

      if (typeof settings.drawRoads === 'boolean') setDrawRoads(settings.drawRoads)
      if (typeof settings.drawText === 'boolean') setDrawText(settings.drawText)
      setTitleFontFamily(fontSpecToFamily(settings.titleFont))
      setRegionFontFamily(fontSpecToFamily(settings.regionFont))
      setMountainRangeFontFamily(fontSpecToFamily(settings.mountainRangeFont))
      setOtherMountainsFontFamily(fontSpecToFamily(settings.otherMountainsFont))
      setCitiesFontFamily(fontSpecToFamily(settings.citiesFont))
      setRiverFontFamily(fontSpecToFamily(settings.riverFont))
      const textHex = colorToHex(settings.textColor)
      if (textHex) setTextColorHex(textHex)
      if (typeof settings.drawBoldBackground === 'boolean')
        setDrawBoldBackground(settings.drawBoldBackground)
      const boldBackgroundHex = colorToHex(settings.boldBackgroundColor)
      if (boldBackgroundHex) setBoldBackgroundColorHex(boldBackgroundHex)
    },

    applyRoadAndScaleSettings(settings) {
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

      if (typeof settings.drawRoads === 'boolean') setDrawRoads(settings.drawRoads)

      // roadStyle may be an object {type, width} or a string
      if (typeof settings.roadStyle === 'string' && settings.roadStyle) {
        setRoadStyle(settings.roadStyle)
      } else if (settings.roadStyle && typeof settings.roadStyle === 'object') {
        if (typeof settings.roadStyle.type === 'string') setRoadStyle(settings.roadStyle.type)
        if (Number.isFinite(Number(settings.roadStyle.width))) setRoadWidth(Number(settings.roadStyle.width))
      }

      if (Number.isFinite(Number(settings.roadWidth))) setRoadWidth(Number(settings.roadWidth))
      const roadHex = colorToHex(settings.roadColor)
      if (roadHex) setRoadColorHex(roadHex)

      if (Number.isFinite(Number(settings.mountainScale))) setMountainSize(Number(settings.mountainScale))
      if (Number.isFinite(Number(settings.hillScale))) setHillSize(Number(settings.hillScale))
      if (Number.isFinite(Number(settings.duneScale))) setDuneSize(Number(settings.duneScale))
      if (Number.isFinite(Number(settings.treeHeightScale))) setTreeHeight(Number(settings.treeHeightScale))
      if (Number.isFinite(Number(settings.cityScale))) setCitySize(Number(settings.cityScale))
    },
  }
}
