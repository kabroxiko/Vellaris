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
  'gridOverlayColorHex',
  'gridOverlayXOffset',
  'gridOverlayYOffset',
  'gridOverlayLineWidth',
  'borderRef',
  'borderWidth',
  'borderPosition',
  'borderColorOption',
  'borderColorHex',
  'frayedBorder',
  'frayedBorderBlurLevel',
  'frayedBorderSize',
  'frayedBorderSeed',
  'frayedBorderColorHex',
  'roadStyle',
  'roadWidth',
  'roadColorHex',
  'mountainSize',
  'hillSize',
  'duneSize',
  'treeHeight',
  'citySize',
]

export function computePreviewTriggerKey(previewFields) {
  const { colorizeLand, colorizeOcean, landColorHex, oceanColorHex, ...rest } =
    previewFields || {}
  return JSON.stringify(rest)
}

export default { PREVIEW_TRIGGER_KEYS, computePreviewTriggerKey }
