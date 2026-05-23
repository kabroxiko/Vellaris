export const PREVIEW_TRIGGER_KEYS = [
  'backgroundType',
  'textureRef',
  'backgroundSeed',
  'randomSeed',
  'finalWidth',
  'finalHeight',
  'drawBorder',
  'drawGridOverlay',
  'gridOverlayShape',
  'gridOverlayRowOrColCount',
  'gridOverlayColor',
  'gridOverlayXOffset',
  'gridOverlayYOffset',
  'gridOverlayLineWidth',
  'borderRef',
  'borderWidth',
  'borderPosition',
  'borderColorOption',
  'borderColor',
  'frayedBorder',
  'frayedBorderBlurLevel',
  'frayedBorderSize',
  'frayedBorderSeed',
  'frayedBorderColor',
  'roadStyle',
  'roadWidth',
  'roadColor',
  'mountainSize',
  'hillSize',
  'duneSize',
  'treeHeight',
  'citySize',
]

export function computePreviewTriggerKey(previewFields) {
  const { colorizeLand, colorizeOcean, landColor, oceanColor, ...rest } = previewFields || {}
  return JSON.stringify(rest)
}

export default { PREVIEW_TRIGGER_KEYS, computePreviewTriggerKey }
