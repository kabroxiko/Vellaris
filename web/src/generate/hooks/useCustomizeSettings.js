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
    'oceanColor',
    'landColor',
    'regionBoundaryStyle',
    'regionBoundaryWidth',
    'regionBoundaryColor',
    'drawBorder',
    'drawGridOverlay',
    'gridOverlayShape',
    'gridOverlayRowOrColCount',
    'gridOverlayColor',
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
    'borderColor',
    'frayedBorder',
    'frayedBorderBlurLevel',
    'frayedBorderSize',
    'frayedBorderSeed',
    'drawGrunge',
    'grungeWidth',
    'frayedBorderColor',
    'lineStyle',
    'coastlineWidth',
    'coastlineColor',
    'coastShadingLevel',
    'coastShadingColor',
    'oceanShadingLevel',
    'oceanShadingColor',
    'oceanWavesType',
    'oceanWavesLevel',
    'oceanWavesColor',
    'concentricWaveCount',
    'fadeConcentricWaves',
    'jitterToConcentricWaves',
    'brokenLinesForConcentricWaves',
    'drawOceanEffectsInLakes',
    'riverColor',
    'drawRoads',
    'roadStyle',
    'roadWidth',
    'roadColor',
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
    'textColor',
    'drawBoldBackground',
    'boldBackgroundColor',
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
