import backgroundBaseCache from './backgroundBaseCache'
import { hexToHSB, mulberry32, hsbToRgb } from './sharedHelpers'
import { colorToHex } from './utils'

// Helpers extracted from CustomizeSettingsSection to allow reuse and smaller component files
// Exported for tests and for the preview hook.
export async function colorizeBitmap(sourceBitmap, color, w, h, previewFieldsLocal, opts) {
  const alg = String(previewFieldsLocal?.backgroundType || '')
    .toLowerCase()
    .includes('fractal')
    ? 'algorithm2'
    : 'algorithm3'
  const hex = colorToHex(color) || color
  const hsb = hexToHSB(hex)
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tctx = tmp.getContext('2d')
  tctx.drawImage(sourceBitmap, 0, 0, w, h)
  const imd = tctx.getImageData(0, 0, w, h)
  const data = imd.data
  const preserveTexture =
    typeof opts?.preserveTexture === 'number'
      ? Math.max(0, Math.min(1, opts.preserveTexture))
      : 0.02
  for (let i = 0; i < data.length; i += 4) {
    const r0 = data[i]
    const g0 = data[i + 1]
    const b0 = data[i + 2]
    const level = (0.299 * r0 + 0.587 * g0 + 0.114 * b0) / 255
    let resultLevel
    if (alg === 'algorithm2') {
      const I = hsb[2] * 255
      const overlay = ((I / 255) * (I + 2 * level * (255 - I))) / 255
      resultLevel = overlay
    } else if (hsb[2] < 0.5) {
      resultLevel = level * (hsb[2] * 2)
    } else {
      const range = (1 - hsb[2]) * 2
      resultLevel = range * level + (1 - range)
    }
    const [rC, gC, bC] = hsbToRgb(hsb[0], hsb[1], resultLevel)
    data[i] = Math.round((1 - preserveTexture) * rC + preserveTexture * r0)
    data[i + 1] = Math.round((1 - preserveTexture) * gC + preserveTexture * g0)
    data[i + 2] = Math.round((1 - preserveTexture) * bC + preserveTexture * b0)
  }
  tctx.putImageData(imd, 0, 0)
  return await createImageBitmap(tmp)
}

export function makeCanvasForBitmap(imgBitmap) {
  const w = imgBitmap.width
  const h = imgBitmap.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  return { canvas, ctx, w, h }
}

export function drawBackgroundAndInset(opts) {
  const { ctx, img, w, h, x, y, boxW, boxH } = opts || {}
  ctx.save()
  try {
    ctx.drawImage(img, 0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fillRect(x - 2, y - 2, boxW + 4, boxH + 4)
  } finally {
    ctx.restore()
  }
}

export function drawIslandShape(opts) {
  const {
    ctx,
    rng,
    cx,
    cy,
    baseRadius,
    xRadius,
    yRadius,
    boxW,
    boxH,
    x,
    y,
    landBitmap,
    displayBitmap,
    imgBitmap,
    coastlineWidth = undefined,
    coastlineColor = undefined,
  } = opts || {}
  const points = 32
  const jitterX = Math.max(6, Math.round(xRadius * 0.18))
  const jitterY = Math.max(6, Math.round(yRadius * 0.18))
  ctx.beginPath()
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    const rx = xRadius + (rng() - 0.5) * jitterX
    const ry = yRadius + (rng() - 0.5) * jitterY
    const px = cx + Math.round(Math.cos(a) * rx)
    const py = cy + Math.round(Math.sin(a) * ry)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()

  const landColor = '#c2b891'
  const pattern = ctx.createPattern(landBitmap || displayBitmap || imgBitmap, 'repeat')
  if (pattern) {
    ctx.save()
    ctx.clip()
    ctx.fillStyle = pattern
    ctx.fillRect(x, y, boxW, boxH)
    ctx.globalCompositeOperation = 'source-over'
    const computedDefaultWidth = Math.max(1, Math.round(baseRadius * 0.03))
    const strokeW = typeof coastlineWidth === 'number' ? coastlineWidth : computedDefaultWidth
    if (strokeW > 0) {
      ctx.strokeStyle = coastlineColor
      ctx.lineWidth = strokeW
      ctx.lineJoin = 'round'
      ctx.stroke()
    }
    ctx.restore()
  } else {
    ctx.fillStyle = landColor
    ctx.fill()
  }
}

export async function prepareBitmapsModule(
  imgBitmap,
  w,
  h,
  opts = {},
  previewFields = {},
  defaults = {}
) {
  const processed = { displayBitmap: imgBitmap, landBitmap: imgBitmap }
  const useColorizeOcean =
    typeof opts?.colorizeOcean === 'boolean'
      ? opts.colorizeOcean
      : (previewFields?.colorizeOcean ?? defaults.colorizeOcean)
  const useOceanColor =
    opts?.oceanColor || previewFields?.oceanColor || defaults.oceanColor
  const SEPPIA_HEX = '#C8A082'
  if (useColorizeOcean && useOceanColor) {
    processed.displayBitmap = await colorizeBitmap(imgBitmap, useOceanColor, w, h, previewFields, opts)
  } else {
    processed.displayBitmap = await colorizeBitmap(imgBitmap, SEPPIA_HEX, w, h, previewFields, opts)
  }

  const useColorizeLand =
    typeof opts?.colorizeLand === 'boolean'
      ? opts.colorizeLand
      : (previewFields?.colorizeLand ?? defaults.colorizeLand)
  const useLandColor = opts?.landColor || previewFields?.landColor || defaults.landColor
  if (useColorizeLand && useLandColor) {
    processed.landBitmap = await colorizeBitmap(imgBitmap, useLandColor, w, h, previewFields, opts)
  } else {
    processed.landBitmap = await colorizeBitmap(imgBitmap, SEPPIA_HEX, w, h, previewFields, opts)
  }
  return processed
}

export async function composeMiniIslandFromBlobModule(
  sourceBlob,
  opts = {},
  previewFields = {},
  defaults = {},
  overrides = {}
) {
  const imgBitmap = await createImageBitmap(sourceBlob)
  const makeCanvas = overrides.makeCanvasForBitmap || makeCanvasForBitmap
  const doPrepare = overrides.prepareBitmaps || prepareBitmapsModule
  const doDrawBackground = overrides.drawBackgroundAndInset || drawBackgroundAndInset
  const doDrawIsland = overrides.drawIslandShape || drawIslandShape
  const { canvas, ctx, w, h } = makeCanvas(imgBitmap)

  const boxW = Math.round(w * 0.45)
  const boxH = Math.round(h * 0.45)
  const x = Math.round((w - boxW) / 2)
  const y = Math.round((h - boxH) / 2)

  const seed = Number(previewFields.backgroundSeed) || Date.now()
  const rng = mulberry32(seed & 0xffffffff)

  const { displayBitmap, landBitmap } = await doPrepare(
    imgBitmap,
    w,
    h,
    opts,
    previewFields,
    defaults
  )

  doDrawBackground({ ctx, img: displayBitmap, w, h, x, y, boxW, boxH })

  const cx = x + Math.round(boxW * 0.5)
  const cy = y + Math.round(boxH * 0.5)
  const baseRadius = Math.round(Math.min(boxW, boxH) * 0.48)
  const xRadius = Math.round(baseRadius * 1.45)
  const yRadius = baseRadius

  doDrawIsland({
    ctx,
    rng,
    cx,
    cy,
    baseRadius,
    xRadius,
    yRadius,
    boxW,
    boxH,
    x,
    y,
    landBitmap,
    displayBitmap,
    imgBitmap,
    coastlineWidth: previewFields?.coastlineWidth,
    coastlineColor: previewFields?.coastlineColor,
  })

  return await new Promise((resolve) => canvas.toBlob(resolve))
}

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export async function fetchPreviewBlob(payload, controller) {
  // kick off a background preload (non-blocking)
  backgroundBaseCache.preload(payload)
  // await cached or in-flight fetch
  const blob = await backgroundBaseCache.get(payload, controller?.signal)
  return blob
}

export function pickDefaultTexture(textures = [], cityIconTypesByPack = {}) {
  if (cityIconTypesByPack && Object.keys(cityIconTypesByPack).length > 0) {
    const firstPack = Object.keys(cityIconTypesByPack)[0]
    const firstTypes = cityIconTypesByPack[firstPack]
    if (Array.isArray(firstTypes) && firstTypes.length > 0)
      return { artPack: firstPack, cityIconType: firstTypes[0] }
  }
  if (Array.isArray(textures) && textures.length > 0) {
    const t = textures[0]
    return { artPack: t.artPack, cityIconType: t.name }
  }
  return {}
}

export function resolveRawTextureRef(rawRef, textures = []) {
  if (!rawRef) return {}
  const ref = String(rawRef)
  if (ref.includes('|')) {
    if (Array.isArray(textures) && textures.length > 0) {
      const found = textures.find((tt) => `${tt.artPack}|${tt.name}` === ref)
      if (found) return { artPack: found.artPack, cityIconType: found.name }
    }
    const [ap, nm] = ref.split('|', 2)
    return { artPack: ap, cityIconType: nm }
  }
  return { cityIconType: rawRef }
}

export function buildPreviewPayload(previewFields = {}, textures = [], currentSource = {}) {
  let payload = { width: 520, height: 170 }
  if (previewFields) payload = { ...payload, ...previewFields }
  payload.type = previewFields?.backgroundType === undefined ? null : previewFields.backgroundType
  const bg = payload.type
  if (
    bg === 'GeneratedFromTexture' ||
    (typeof bg === 'string' && bg.toLowerCase().includes('texture'))
  ) {
    const rawRef = previewFields?.textureRef
    const isEmpty = rawRef === undefined || rawRef === null || String(rawRef).trim() === ''
    if (isEmpty) {
      payload = { ...payload, ...pickDefaultTexture(textures) }
    } else {
      payload = { ...payload, ...resolveRawTextureRef(rawRef, textures) }
    }
  }
  if (currentSource?.type === 'random' && currentSource?.payload)
    payload = { ...payload, ...currentSource.payload }
  if (!payload.cityIconType && previewFields?.cityIconType)
    payload.cityIconType = previewFields.cityIconType
  return payload
}
