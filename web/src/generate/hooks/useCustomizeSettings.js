import { useEffect, useMemo, useReducer } from 'react'
import { persistCustomizeOverrides } from '../GenerateForm.helpers'

function customizeReducer(state, action) {
  return { ...state, [action.key]: action.value }
}

export default function useCustomizeSettings(initialCustomize = {}) {
  const keys = [
    'backgroundType',
    'textureRef',
    'backgroundSeed',
    'drawRegionBoundaries',
    'colorizeLand',
    'colorizeOcean',
    'oceanColorHex',
    'landColorHex',
    'regionBoundaryStyle',
    'regionBoundaryWidth',
    'regionBoundaryColorHex',
    'drawBorder',
    'drawGridOverlay',
    'gridOverlayShape',
    'gridOverlayRowOrColCount',
    'gridOverlayColorHex',
    'gridOverlayXOffset',
    'gridOverlayYOffset',
    'gridOverlayLineWidth',
    'gridOverlayLayer',
    'drawVoronoiGridOverlayOnlyOnLand',
    'finalLandColoringMethod',
    'borderRef',
    'borderWidth',
    'borderPosition',
    'borderColorOption',
    'borderColorHex',
    'frayedBorder',
    'frayedBorderBlurLevel',
    'frayedBorderSize',
    'frayedBorderSeed',
    'drawGrunge',
    'grungeWidth',
    'frayedBorderColorHex',
    'lineStyle',
    'coastlineWidth',
    'coastlineColorHex',
    'coastShadingLevel',
    'coastShadingColorHex',
    'coastShadingAlpha',
    'oceanShadingAlpha',
    'oceanShadingLevel',
    'oceanShadingColorHex',
    'oceanWavesType',
    'oceanWavesLevel',
    'oceanWavesColorHex',
    'oceanWavesAlpha',
    'concentricWaveCount',
    'fadeConcentricWaves',
    'jitterToConcentricWaves',
    'brokenLinesForConcentricWaves',
    'drawOceanEffectsInLakes',
    'riverColorHex',
    'drawRoads',
    'roadStyle',
    'roadWidth',
    'roadColorHex',
    'mountainSize',
    'hillSize',
    'duneSize',
    'treeHeight',
    'citySize',
    'drawText',
    'titleFontFamily',
    'regionFontFamily',
    'mountainRangeFontFamily',
    'otherMountainsFontFamily',
    'citiesFontFamily',
    'riverFontFamily',
    'textColorHex',
    'drawBoldBackground',
    'boldBackgroundColorHex',
  ]

  const initialState = Object.fromEntries(keys.map((k) => [k, initialCustomize[k]]))

  const [state, dispatch] = useReducer(customizeReducer, initialState)

  const values = state

  const setters = Object.fromEntries(
    keys.map((k) => {
      const setterName = 'set' + k.charAt(0).toUpperCase() + k.slice(1)
      return [setterName, (v) => dispatch({ key: k, value: v })]
    })
  )


  const customizeDeps = useMemo(() => keys.map((k) => values[k]), keys.map((k) => values[k]))

  useEffect(() => {
    persistCustomizeOverrides(values)
  }, [customizeDeps])

  return { values, setters, customizeDeps }
}
