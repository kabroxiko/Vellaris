import React, { useEffect, useMemo, useState, useRef } from 'react'
import { RgbaColorPicker } from 'react-colorful'
import PropTypes from 'prop-types'
import backgroundBaseCache from './backgroundBaseCache'
import BackgroundTab from './tabs/BackgroundTab'
import BorderTab from './tabs/BorderTab'
import EffectsTab from './tabs/EffectsTab'
import FontsTab from './tabs/FontsTab'
import {
  hexToHSB,
  mulberry32,
  hsbToRgb,
  hexToRgba,
  rgbaToHex,
  hexWithAlpha,
} from './sharedHelpers'
  

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// color/HSB helpers imported from sharedHelpers

// Colorize a bitmap to the specified color. Hoisted to module scope
// so it can be reused and to satisfy Sonar rule S7721.
async function colorizeBitmap(sourceBitmap, colorHex, w, h, previewFieldsLocal, opts) {
  const alg = String(previewFieldsLocal?.backgroundType || '').toLowerCase().includes('fractal') ? 'algorithm2' : 'algorithm3'
  const hsb = hexToHSB(colorHex)
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tctx = tmp.getContext('2d')
  tctx.drawImage(sourceBitmap, 0, 0, w, h)
  const imd = tctx.getImageData(0, 0, w, h)
  const data = imd.data
  const preserveTexture = (typeof opts?.preserveTexture === 'number') ? Math.max(0, Math.min(1, opts.preserveTexture)) : 0.02
  for (let i = 0; i < data.length; i += 4) {
    const r0 = data[i]
    const g0 = data[i+1]
    const b0 = data[i+2]
    const level = (0.299 * r0 + 0.587 * g0 + 0.114 * b0) / 255
    let resultLevel
    if (alg === 'algorithm2') {
      const I = hsb[2] * 255
      const overlay = ((I / 255) * (I + (2 * level) * (255 - I))) / 255
      resultLevel = overlay
    } else if (hsb[2] < 0.5) {
      resultLevel = level * (hsb[2] * 2)
    } else {
      const range = (1 - hsb[2]) * 2
      resultLevel = range * level + (1 - range)
    }
    const [rC, gC, bC] = hsbToRgb(hsb[0], hsb[1], resultLevel)
    data[i] = Math.round((1 - preserveTexture) * rC + preserveTexture * r0)
    data[i+1] = Math.round((1 - preserveTexture) * gC + preserveTexture * g0)
    data[i+2] = Math.round((1 - preserveTexture) * bC + preserveTexture * b0)
  }
  tctx.putImageData(imd, 0, 0)
  return await createImageBitmap(tmp)
}

// hexToRgba/rgbaToHex imported from sharedHelpers

// doFetchWithRetries imported from sharedHelpers

// Helper to darken/lighten hex color (hoisted)
// shadeColor and hexWithAlpha imported from sharedHelpers

// Helper: create canvas and context from an ImageBitmap (hoisted)
function makeCanvasForBitmap(imgBitmap) {
  const w = imgBitmap.width
  const h = imgBitmap.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  return { canvas, ctx, w, h }
}

// Helper: draw the background and inset box (hoisted)
function drawBackgroundAndInset(opts) {
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

// Helper: draw the island shape and fill with either pattern or color (hoisted)
function drawIslandShape(opts) {
  const { ctx, rng, cx, cy, baseRadius, xRadius, yRadius, boxW, boxH, x, y, landBitmap, displayBitmap, imgBitmap, coastlineWidth = undefined, coastlineColorHex = undefined } = opts || {}
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
    // Draw coastline stroke only when a positive coastline width is provided.
    const computedDefaultWidth = Math.max(1, Math.round(baseRadius * 0.03))
    const strokeW = (typeof coastlineWidth === 'number') ? coastlineWidth : computedDefaultWidth
    if (strokeW > 0) {
      ctx.strokeStyle = coastlineColorHex ? hexWithAlpha(coastlineColorHex, 100) : 'rgba(255,255,240,0.55)'
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

// Module-scoped prepare and compose helpers so they can be unit-tested
// independently of the React component's closure.
async function prepareBitmapsModule(imgBitmap, w, h, opts = {}, previewFields = {}, defaults = {}) {
  const processed = { displayBitmap: imgBitmap, landBitmap: imgBitmap }
  const useColorizeOcean = (typeof opts?.colorizeOcean === 'boolean') ? opts.colorizeOcean : defaults.colorizeOcean
  const useOceanColorHex = opts?.oceanColorHex || defaults.oceanColorHex
  const SEPPIA_HEX = '#C8A082'
  if (useColorizeOcean && useOceanColorHex) {
    processed.displayBitmap = await colorizeBitmap(imgBitmap, useOceanColorHex, w, h, previewFields, opts)
  } else {
    processed.displayBitmap = await colorizeBitmap(imgBitmap, SEPPIA_HEX, w, h, previewFields, opts)
  }

  const useColorizeLand = (typeof opts?.colorizeLand === 'boolean') ? opts.colorizeLand : defaults.colorizeLand
  const useLandColorHex = opts?.landColorHex || defaults.landColorHex
  if (useColorizeLand && useLandColorHex) {
    processed.landBitmap = await colorizeBitmap(imgBitmap, useLandColorHex, w, h, previewFields, opts)
  } else {
    processed.landBitmap = await colorizeBitmap(imgBitmap, SEPPIA_HEX, w, h, previewFields, opts)
  }
  return processed
}

async function composeMiniIslandFromBlobModule(sourceBlob, opts = {}, previewFields = {}, defaults = {}, overrides = {}) {
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

  const { displayBitmap, landBitmap } = await doPrepare(imgBitmap, w, h, opts, previewFields, defaults)

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
    coastlineColorHex: previewFields?.coastlineColorHex,
  })

  return await new Promise((resolve) => canvas.toBlob(resolve))
}

// Modal styles for color picker (hoisted)
const modalBackdropStyle = {
  position: 'fixed',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
}

const modalContentStyle = {
  background: '#fff',
  padding: 12,
  borderRadius: 6,
  boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
}

async function fetchPreviewBlob(payload, controller) {
  // kick off a background preload (non-blocking)
  backgroundBaseCache.preload(payload)
  // await cached or in-flight fetch
  const blob = await backgroundBaseCache.get(payload, controller?.signal)
  return blob
}

function ColorPickerModal({ open, onClose, children }) {
  const innerRef = React.useRef(null)
  React.useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const onMouseDown = (e) => {
      if (innerRef.current && !innerRef.current.contains?.(e.target)) onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    // focus first focusable element inside modal for accessibility
    if (innerRef.current) {
      const btn = innerRef.current.querySelector('button, [tabindex], input, [role="button"]')
      if (btn && typeof btn.focus === 'function') btn.focus()
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <dialog
      ref={innerRef}
      style={modalBackdropStyle}
      open
      onCancel={(e) => { e.preventDefault(); onClose() }}
    >
      <div style={modalContentStyle}>
        {children}
      </div>
    </dialog>
  )
}

ColorPickerModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  children: PropTypes.node,
}

// Export module-scope helpers for unit testing of hoisted functions.
export {
  colorizeBitmap,
  makeCanvasForBitmap,
  drawBackgroundAndInset,
  drawIslandShape,
  prepareBitmapsModule,
  composeMiniIslandFromBlobModule,
  modalBackdropStyle,
  modalContentStyle,
  fetchPreviewBlob,
  ColorPickerModal,
}


export default function CustomizeSettingsSection({ values, handlers, options, ui }) {

  const [activeTab, setActiveTab] = useState('background')
  const [openFontComboId, setOpenFontComboId] = useState(null)
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState(null)
  const [previewRefreshNonce, setPreviewRefreshNonce] = useState(0)
  const lastBaseBlobRef = useRef(null)

  // Testing override: set to true to force the Customize panel enabled
  // regardless of having an uploaded .nort source. Remove or set to false
  // for normal behavior.
  const FORCE_ENABLE_CUSTOMIZE = true

  useEffect(() => {
    
    const onDocumentMouseDown = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!target.closest('.font-combo')) {
        setOpenFontComboId(null)
      }
    }

    document.addEventListener('mousedown', onDocumentMouseDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown)
    }
  }, [])

  const {
    preview,
    backgroundType,
    textureRef,
    colorizeLand,
    colorizeOcean,
    landColorHex,
    oceanColorHex,
    backgroundSeed,
    finalSeed,
    finalWidth,
    finalHeight,
    drawBorder,
    drawGrunge,
    drawGridOverlay,
    gridOverlayShape,
    gridOverlayRowOrColCount,
    gridOverlayColorHex,
    gridOverlayXOffset,
    gridOverlayYOffset,
    gridOverlayLineWidth,
    drawVoronoiGridOverlayOnlyOnLand,
    borderRef,
    borderWidth,
    borderPosition,
    borderColorOption,
    borderColorHex,
    frayedBorder,
    frayedBorderBlurLevel,
    frayedBorderSize,
    frayedBorderSeed,
    grungeWidth,
    frayedBorderColorHex,
    lineStyle,
    coastlineWidth,
    coastlineColorHex,
    coastShadingLevel,
    coastShadingColorHex,
    coastShadingAlpha,
    drawRegionBoundaries,
    regionBoundaryStyle,
    regionBoundaryWidth,
    regionBoundaryColorHex,
    oceanShadingAlpha,
    oceanShadingLevel,
    oceanShadingColorHex,
    oceanWavesType,
    oceanWavesLevel,
    oceanWavesAlpha,
    oceanWavesColorHex,
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
    fileObj,
    currentSource,
  } = values

  // Runtime debug: log received `drawGrunge` value from parent `values`
  


  // Aggregate all customization fields we want to send to the preview.
  // Extracted into a single helper to avoid duplicated lists and to keep
  // the canonical list in one place (safer than repeating it in a
  // literal and a dependencies array).
  function collectPreviewFields() {
    return {
      backgroundType,
      textureRef,
      backgroundSeed: backgroundSeed ? Number(backgroundSeed) : undefined,
      randomSeed: finalSeed ? Number(finalSeed) : undefined,
      finalWidth,
      finalHeight,
      colorizeLand,
      colorizeOcean,
      landColorHex,
      oceanColorHex,
      drawBorder,
      drawGridOverlay,
      gridOverlayShape,
      gridOverlayRowOrColCount,
      gridOverlayColorHex,
      gridOverlayXOffset,
      gridOverlayYOffset,
      gridOverlayLineWidth,
      drawRegionBoundaries,
      regionBoundaryStyle,
      regionBoundaryWidth,
      regionBoundaryColorHex,
      borderRef,
      borderWidth,
      borderPosition,
      borderColorOption,
      borderColorHex,
      frayedBorder,
      frayedBorderBlurLevel,
      frayedBorderSize,
      frayedBorderSeed,
      frayedBorderColorHex,
      drawGrunge,
      grungeWidth,
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
      oceanWavesAlpha,
      oceanWavesColorHex,
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
  }

  const previewFields = collectPreviewFields()

  // Helper: RNG, color math and bitmap colorization extracted to reduce
  // cognitive complexity inside `composeMiniIslandFromBlob`.
  

  

  // Compose a mini island preview from a neutral base Blob. Exported at
  // component scope so color controls can trigger a local recomposition
  // without initiating a new network fetch.
  // use hoisted `makeCanvasForBitmap`, `drawBackgroundAndInset` and
  // `drawIslandShape`. The only in-component helper we keep is
  // `prepareBitmaps` because it references component-level preview fields
  // and color flags.
  // Helper: prepare display and land bitmaps (colorized variants)
  async function prepareBitmaps(imgBitmap, w, h, opts) {
    const processed = { displayBitmap: imgBitmap, landBitmap: imgBitmap }
    const useColorizeOcean = (typeof opts?.colorizeOcean === 'boolean') ? opts.colorizeOcean : colorizeOcean
    const useOceanColorHex = opts?.oceanColorHex || oceanColorHex
    const SEPPIA_HEX = '#C8A082'
    if (useColorizeOcean && useOceanColorHex) {
      processed.displayBitmap = await colorizeBitmap(imgBitmap, useOceanColorHex, w, h, previewFields, opts)
    } else {
      // When ocean colorization is disabled, render the preview with a sepia tone
      processed.displayBitmap = await colorizeBitmap(imgBitmap, SEPPIA_HEX, w, h, previewFields, opts)
    }

    const useColorizeLand = (typeof opts?.colorizeLand === 'boolean') ? opts.colorizeLand : colorizeLand
    const useLandColorHex = opts?.landColorHex || landColorHex
    if (useColorizeLand && useLandColorHex) {
      processed.landBitmap = await colorizeBitmap(imgBitmap, useLandColorHex, w, h, previewFields, opts)
    } else {
      // When land colorization is disabled, render the preview land with a sepia tone
      processed.landBitmap = await colorizeBitmap(imgBitmap, SEPPIA_HEX, w, h, previewFields, opts)
    }
    return processed
  }

  async function composeMiniIslandFromBlob(sourceBlob, opts) {
    const imgBitmap = await createImageBitmap(sourceBlob)
    const { canvas, ctx, w, h } = makeCanvasForBitmap(imgBitmap)

    const boxW = Math.round(w * 0.45)
    const boxH = Math.round(h * 0.45)
    const x = Math.round((w - boxW) / 2)
    const y = Math.round((h - boxH) / 2)

    const seed = Number(previewFields.backgroundSeed) || Date.now()
    const rng = mulberry32(seed & 0xffffffff)

    const { displayBitmap, landBitmap } = await prepareBitmaps(imgBitmap, w, h, opts)

    drawBackgroundAndInset({ ctx, img: displayBitmap, w, h, x, y, boxW, boxH })

    const cx = x + Math.round(boxW * 0.5)
    const cy = y + Math.round(boxH * 0.5)
    const baseRadius = Math.round(Math.min(boxW, boxH) * 0.48)
    const xRadius = Math.round(baseRadius * 1.45)
    const yRadius = baseRadius

    drawIslandShape({
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
      // pass coastline settings from previewFields so preview can show no coastline
      coastlineWidth: previewFields?.coastlineWidth,
      coastlineColorHex: previewFields?.coastlineColorHex,
    })

    return await new Promise((resolve) => canvas.toBlob(resolve))
  }
  // Build a minimal payload for the background preview request.
  function pickDefaultTexture() {
    if (cityIconTypesByPack && Object.keys(cityIconTypesByPack).length > 0) {
      const firstPack = Object.keys(cityIconTypesByPack)[0]
      const firstTypes = cityIconTypesByPack[firstPack]
      if (Array.isArray(firstTypes) && firstTypes.length > 0) return { artPack: firstPack, cityIconType: firstTypes[0] }
    }
    if (Array.isArray(textures) && textures.length > 0) {
      const t = textures[0]
      return { artPack: t.artPack, cityIconType: t.name }
    }
    return {}
  }

  function resolveRawTextureRef(rawRef) {
    if (!rawRef) return {}
    if (String(rawRef).includes('|') && Array.isArray(textures) && textures.length > 0) {
      const ref = String(rawRef)
      const found = textures.find((tt) => `${tt.artPack}|${tt.name}` === ref)
      if (found) return { artPack: found.artPack, cityIconType: found.name }
      const [ap, nm] = ref.split('|', 2)
      return { artPack: ap, cityIconType: nm }
    }
    return { cityIconType: rawRef }
  }

  function buildPreviewPayload() {
    let payload = { width: 520, height: 170 }
    if (previewFields) payload = { ...payload, ...previewFields }
    payload.type = previewFields?.backgroundType === undefined ? null : previewFields.backgroundType
    const bg = payload.type
    if (bg === 'GeneratedFromTexture' || (typeof bg === 'string' && bg.toLowerCase().includes('texture'))) {
      const rawRef = previewFields?.textureRef
      const isEmpty = rawRef === undefined || rawRef === null || String(rawRef).trim() === ''
      if (isEmpty) {
        payload = { ...payload, ...pickDefaultTexture() }
      } else {
        payload = { ...payload, ...resolveRawTextureRef(rawRef) }
      }
    }
    if (currentSource?.type === 'random' && currentSource?.payload) payload = { ...payload, ...currentSource.payload }
    if (!payload.cityIconType && previewFields?.cityIconType) payload.cityIconType = previewFields.cityIconType
    return payload
  }

  

  async function setPreviewFromBlob(blob) {
    lastBaseBlobRef.current = blob
    const processedBlob = await composeMiniIslandFromBlob(blob)
    const url = URL.createObjectURL(processedBlob || blob)
    setBackgroundPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return url
    })
  }
  // expose existing local render helpers to the tab components so they
  // can reuse the current implementations without duplicating logic.
  // (render helpers will be attached to tabProps after it's created)

  async function onSubmitGenerate(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (typeof handlers.handleGenerateFromSettings === 'function') {
      await handlers.handleGenerateFromSettings(e)
    }
    // Let errors propagate; caller will observe failures. Trigger preview refresh afterwards.
    triggerPreviewRefresh()
  }

  async function recomposeUsingLastBase(opts) {
    if (!lastBaseBlobRef.current) return
    const processed = await composeMiniIslandFromBlob(lastBaseBlobRef.current, opts)
    const url = URL.createObjectURL(processed || lastBaseBlobRef.current)
    setBackgroundPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return url
    })
  }

 
  // Use a filtered preview key so color toggles/values DO NOT trigger
  // the background preview. We only want texture/background changes
  // (and other visual parameters) to trigger backend fetches.
  const previewTriggerKey = useMemo(() => {
    const { colorizeLand, colorizeOcean, landColorHex, oceanColorHex, ...rest } = previewFields || {}
    return JSON.stringify(rest)
  }, [
    previewFields?.backgroundType,
    previewFields?.textureRef,
    previewFields?.backgroundSeed,
    previewFields?.randomSeed,
    previewFields?.finalWidth,
    previewFields?.finalHeight,
    previewFields?.drawBorder,
    previewFields?.drawGridOverlay,
    previewFields?.gridOverlayShape,
    previewFields?.gridOverlayRowOrColCount,
    previewFields?.gridOverlayColorHex,
    previewFields?.gridOverlayXOffset,
    previewFields?.gridOverlayYOffset,
    previewFields?.gridOverlayLineWidth,
    previewFields?.borderRef,
    previewFields?.borderWidth,
    previewFields?.borderPosition,
    previewFields?.borderColorOption,
    previewFields?.borderColorHex,
    previewFields?.frayedBorder,
    previewFields?.frayedBorderBlurLevel,
    previewFields?.frayedBorderSize,
    previewFields?.frayedBorderSeed,
    previewFields?.frayedBorderColorHex,
    previewFields?.roadStyle,
    previewFields?.roadWidth,
    previewFields?.roadColorHex,
    previewFields?.mountainSize,
    previewFields?.hillSize,
    previewFields?.duneSize,
    previewFields?.treeHeight,
    previewFields?.citySize,
  ])

  // Use the `handlers` object directly; avoid creating many unused
  // local `set*` variables that Sonar flags as unused. Accessors
  // below will reference `handlers.<name>`.

  // Consolidated map of setter functions so they can be spread into
  // `tabProps` as named properties (preserves runtime bindings and
  // avoids Sonar false-positives about unused declarations).
  const setterDeps = {
    setGridOverlayLayer: handlers.setGridOverlayLayer,
    setDrawVoronoiGridOverlayOnlyOnLand: handlers.setDrawVoronoiGridOverlayOnlyOnLand,
    setBorderRef: handlers.setBorderRef,
    setBorderWidth: handlers.setBorderWidth,
    setBorderPosition: handlers.setBorderPosition,
    setBorderColorOption: handlers.setBorderColorOption,
    setBorderColorHex: handlers.setBorderColorHex,
    setFrayedBorder: handlers.setFrayedBorder,
    setFrayedBorderBlurLevel: handlers.setFrayedBorderBlurLevel,
    setFrayedBorderSize: handlers.setFrayedBorderSize,
    setFrayedBorderSeed: handlers.setFrayedBorderSeed,
    setDrawGrunge: handlers.setDrawGrunge,
    setGrungeWidth: handlers.setGrungeWidth,
    setFrayedBorderColorHex: handlers.setFrayedBorderColorHex,
    setRoadStyle: handlers.setRoadStyle,
    setRoadWidth: handlers.setRoadWidth,
    setRoadColorHex: handlers.setRoadColorHex,
    setMountainSize: handlers.setMountainSize,
    setHillSize: handlers.setHillSize,
    setDuneSize: handlers.setDuneSize,
    setTreeHeight: handlers.setTreeHeight,
    setCitySize: handlers.setCitySize,
    setLineStyle: handlers.setLineStyle,
    setCoastlineWidth: handlers.setCoastlineWidth,
    setCoastlineColorHex: handlers.setCoastlineColorHex,
    setCoastShadingLevel: handlers.setCoastShadingLevel,
    setCoastShadingColorHex: handlers.setCoastShadingColorHex,
    setCoastShadingAlpha: handlers.setCoastShadingAlpha,
    setOceanShadingAlpha: handlers.setOceanShadingAlpha,
    setOceanShadingLevel: handlers.setOceanShadingLevel,
    setOceanShadingColorHex: handlers.setOceanShadingColorHex,
    setOceanWavesType: handlers.setOceanWavesType,
    setOceanWavesLevel: handlers.setOceanWavesLevel,
    setOceanWavesAlpha: handlers.setOceanWavesAlpha,
    setOceanWavesColorHex: handlers.setOceanWavesColorHex,
    setConcentricWaveCount: handlers.setConcentricWaveCount,
    setFadeConcentricWaves: handlers.setFadeConcentricWaves,
    setJitterToConcentricWaves: handlers.setJitterToConcentricWaves,
    setBrokenLinesForConcentricWaves: handlers.setBrokenLinesForConcentricWaves,
    setDrawOceanEffectsInLakes: handlers.setDrawOceanEffectsInLakes,
    setRiverColorHex: handlers.setRiverColorHex,
    setDrawRoads: handlers.setDrawRoads,
    setDrawText: handlers.setDrawText,
    setTitleFontFamily: handlers.setTitleFontFamily,
    setRegionFontFamily: handlers.setRegionFontFamily,
    setMountainRangeFontFamily: handlers.setMountainRangeFontFamily,
    setOtherMountainsFontFamily: handlers.setOtherMountainsFontFamily,
    setCitiesFontFamily: handlers.setCitiesFontFamily,
    setRiverFontFamily: handlers.setRiverFontFamily,
    setTextColorHex: handlers.setTextColorHex,
    setDrawBoldBackground: handlers.setDrawBoldBackground,
    setBoldBackgroundColorHex: handlers.setBoldBackgroundColorHex,
  }

  const { textures, borderTypes, i18n, cityIconTypesByPack } = options
  const { loading } = ui
  // Debug logging removed to avoid console noise in the web UI.
  const labels = i18n?.labels
  const backendOptions = i18n?.options

  const tabs = backendOptions?.tabs
  const landColoringMethods = backendOptions?.landColoringMethods
  const gridOverlayShapes = backendOptions?.gridOverlayShapes
  const gridOverlayOffsets = backendOptions?.gridOverlayOffsets
  const gridOverlayLayers = backendOptions?.gridOverlayLayers
  const backgroundTypes = backendOptions?.backgroundTypes

  // Fonts are provided by the backend via `i18n.options.fonts`.
  // Per project policy: do not introduce client-side fallbacks — if the
  // server does not provide fonts, the list will be empty.
  const availableFontFamilies = backendOptions?.fonts

  // Preload the first few texture bases and a fractal base so the UI
  // doesn't hit the backend on first open. Uses `backgroundBaseCache.preload`.
  useEffect(() => {
    const candidates = []
    if (Array.isArray(textures) && textures.length > 0) {
      textures.slice(0, 5).forEach((t) => {
        candidates.push({ width: 520, height: 170, type: 'GeneratedFromTexture', artPack: t.artPack, cityIconType: t.name })
      })
    }
    const fractal = Array.isArray(backgroundTypes) ? backgroundTypes.find((b) => b?.value && String(b.value).toLowerCase().includes('fractal')) : null
    if (fractal) candidates.push({ width: 520, height: 170, type: fractal.value })
    else candidates.push({ width: 520, height: 170, type: 'Fractal' })

    candidates.forEach((p) => {
      backgroundBaseCache.preload(p)
    })
  }, [textures, backgroundTypes])
  const strokeTypes = backendOptions?.strokeTypes
  const borderPositions = backendOptions?.borderPositions
  const borderColorOptions = backendOptions?.borderColorOptions
  const lineStyles = backendOptions?.lineStyles
  const oceanWaveTypes = backendOptions?.oceanWaveTypes
  const concentricWaveValue = Array.isArray(oceanWaveTypes) ? oceanWaveTypes.find(o => o?.value && /Concentric/i.test(o.value))?.value : undefined
  const rippleWaveValue = Array.isArray(oceanWaveTypes) ? oceanWaveTypes.find(o => o?.value && /Ripple|Ripples/i.test(o.value))?.value : undefined
  const noneWaveValue = Array.isArray(oceanWaveTypes) ? oceanWaveTypes.find(o => o?.value && /^(None|No|NoEffect|NoneWaves)$/i.test(o.value))?.value : undefined
  const translateLabel = (key) => {
    const has = Object.hasOwn(labels ?? {}, key) && labels[key]
    const txt = has ? labels[key] : null
    const baseKey = (!txt && key?.endsWith('.label')) ? key.slice(0, -'.label'.length) : null
    const alternate = baseKey && Object.hasOwn(labels ?? {}, baseKey) ? labels[baseKey] : null
    const value = txt || alternate || key
    // If the translation contains literal <br> tags, return React nodes
      // Guard against extremely long inputs to avoid expensive regex operations
      if (typeof value === 'string' && value.length <= 2000 && /<br\s*\/?>/i.test(value)) {
        const parts = value.split(/<br\s*\/?>/i)
        return parts.flatMap((p) => (p === parts.at(-1) ? [p] : [p, React.createElement('br', { key: `br-${String(p).slice(0,20)}` })]))
    }
    return value
  }

  const translateLabelWithArgs = (key, ...args) => {
    const txt = translateLabel(key)
    if (!txt) return txt
    if (typeof txt !== 'string') return txt
    // Simple replacement for {0}, {1} placeholders
    let out = txt
    args.forEach((a, i) => {
      out = out.replaceAll(new RegExp(String.raw`\{${i}\}`, 'g'), String(a))
    })
    return out
  }

  // Ensure seed input fields do not display the literal label as their
  // value on initial load. If the value equals the translated label,
  // treat it as empty so the input appears blank.
  const seedLabelFallback = translateLabel('theme.randomSeed.label')
  const sanitizeSeedValue = (v) => {
    if (!v) return ''
    if (typeof v === 'string' && v.trim() === '') return ''
    if (v === seedLabelFallback) return ''
    return v
  }

  const sanitizeTranslation = (s) => {
    if (!s) { return s }
    if (typeof s !== 'string') { return s }
    // Remove surrounding <html> wrappers and preserve <br> as line breaks
    let t = String(s)
      const MAX_SANITIZE_LENGTH = 2000
      if (t.length > MAX_SANITIZE_LENGTH) t = t.slice(0, MAX_SANITIZE_LENGTH)

      // Strip an optional surrounding <html>...</html> wrapper using
      // a linear-time scanner to avoid regex backtracking risks.
      const stripHtmlWrapper = (str) => {
        let start = 0
        let end = str.length
        while (start < end && /\s/.test(str.charAt(start))) start++
        while (end > start && /\s/.test(str.charAt(end - 1))) end--
        if (end - start >= 6 && str.substring(start, start + 6).toLowerCase() === '<html>') {
          start += 6
          while (start < end && /\s/.test(str.charAt(start))) start++
        }
        if (end - start >= 7 && str.substring(end - 7, end).toLowerCase() === '</html>') {
          end -= 7
          while (end > start && /\s/.test(str.charAt(end - 1))) end--
        }
        return str.substring(start, end)
      }
      t = stripHtmlWrapper(t)
    // If there are <br> tags, convert to React nodes with breaks
    if (/<br\s*\/?>/i.test(t)) {
      const parts = t.split(/<br\s*\/?>/i)
      return parts.flatMap((p) => (p === parts.at(-1) ? [p] : [p, React.createElement('br', { key: `br-${String(p).slice(0,20)}` })]))
    }
    // Otherwise strip any other HTML tags
      // Otherwise strip any other HTML tags using a linear scanner
      const removeTags = (str) => {
        let out = ''
        let inTag = false
        for (let i = 0; i < str.length; i++) {
          const ch = str.charAt(i)
          if (!inTag) {
            if (ch === '<') inTag = true
            else out += ch
          } else if (ch === '>') inTag = false
        }
        return out
      }
      t = removeTags(t)
      t = t.replaceAll("''", "'")
      t = t.replaceAll(/\s+/g, ' ').trim()
    return t
  }

  // Small helpers to convert between hex and rgba used by the picker.
  // (moved to module scope; use the hoisted versions)

  // use hoisted `rgbaToHex` helper to satisfy S7721

  const [showCoastPicker, setShowCoastPicker] = useState(false)
  const [showGridPicker, setShowGridPicker] = useState(false)
  const [showOceanPicker, setShowOceanPicker] = useState(false)
  const [showRegionBoundaryPicker, setShowRegionBoundaryPicker] = useState(false)
  const [showLandPicker, setShowLandPicker] = useState(false)
  const [showBorderColorPicker, setShowBorderColorPicker] = useState(false)
  const [showFrayedBorderPicker, setShowFrayedBorderPicker] = useState(false)
  const [showCoastlinePicker, setShowCoastlinePicker] = useState(false)
  const [showOceanWavesPicker, setShowOceanWavesPicker] = useState(false)
  const [showRiverPicker, setShowRiverPicker] = useState(false)
  const [showRoadPicker, setShowRoadPicker] = useState(false)
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const [showBoldBackgroundPicker, setShowBoldBackgroundPicker] = useState(false)
  // Notify parent that the user manually changed a customization control.
  // The parent decides whether to mark the UI as dirty (only after
  // the first successful generation) and therefore disable downloads.
  const notifyManualChange = () => {
    if (typeof handlers.notifyManualChange === 'function') handlers.notifyManualChange()
  }
  const triggerPreviewRefresh = () => {
    setPreviewRefreshNonce((n) => n + 1)
  }
  
  const showTextureOptions = backgroundType === 'GeneratedFromTexture'
  const hasTextures = textures.length > 0
  // Keep Customize panel disabled unless the user explicitly has a .nort
  // source (uploaded file or current nortContent). Do not enable the
  // panel merely because a random generation produced settings —
  // that should not be treated as an editable customization source.
  const hasCustomizationSource = Boolean(
    fileObj ||
    currentSource?.nortContent ||
    FORCE_ENABLE_CUSTOMIZE
  )
  const customizationDirty = ui?.customizationDirty || false
  const hasGeneratedOnce = ui?.hasGeneratedOnce || false
  // Regenerate should remain enabled so users can apply manual changes.
  const canSubmit = !loading && hasCustomizationSource
  // Downloads must be disabled if the user manually edited controls after
  // a prior generation until a new map is generated.
  const canDownloadSettings = !loading && hasCustomizationSource && !(customizationDirty && hasGeneratedOnce)
  const canDownloadMap = !loading && hasCustomizationSource && Boolean(preview?.url) && !(customizationDirty && hasGeneratedOnce)
  const gatedControlValue = (value) => {
    // Show explicit values supplied by the server or a loaded .nort file.
    // Only hide controls when the value is undefined or null and there
    // is no customization source. This avoids synthesizing defaults
    // while ensuring server-provided values (numbers/strings) are visible.
    if (value !== undefined && value !== null) return value
    return hasCustomizationSource ? value : ''
  }

  // debug helper removed
  const emptyComboOption = hasCustomizationSource ? null : (<option value="" />)

  const fontFields = useMemo(
    () => [
      {
        id: 'title-font-family-input',
        label: translateLabel('theme.titleFont.label'),
        value: titleFontFamily,
        onChange: handlers.setTitleFontFamily,
      },
      {
        id: 'region-font-family-input',
        label: translateLabel('theme.regionFont.label'),
        value: regionFontFamily,
        onChange: handlers.setRegionFontFamily,
      },
      {
        id: 'mountain-range-font-family-input',
        label: translateLabel('theme.mountainRangeFont.label'),
        value: mountainRangeFontFamily,
        onChange: handlers.setMountainRangeFontFamily,
      },
      {
        id: 'other-mountains-font-family-input',
        label: translateLabel('theme.otherMountainsFont.label'),
        value: otherMountainsFontFamily,
        onChange: handlers.setOtherMountainsFontFamily,
      },
      {
        id: 'cities-font-family-input',
        label: translateLabel('theme.citiesFont.label'),
        value: citiesFontFamily,
        onChange: handlers.setCitiesFontFamily,
      },
      {
        id: 'river-font-family-input',
        label: translateLabel('theme.riverLakeFont.label'),
        value: riverFontFamily,
        onChange: handlers.setRiverFontFamily,
      },
    ],
    [
      citiesFontFamily,
      mountainRangeFontFamily,
      otherMountainsFontFamily,
      regionFontFamily,
      riverFontFamily,
      titleFontFamily,
      translateLabel,
      handlers,
    ]
  )

  // `availableFontFamilies` is provided by the backend via `i18n.options.fonts`.
  // A server-provided list is attached later in the component after
  // `backendOptions` is derived.

  const fontFieldSetters = useMemo(() => {
    return Object.fromEntries(fontFields.map((field) => [field.id, field.onChange]))
  }, [fontFields])

  useEffect(() => {
    const hasRandomPayloadSource = Boolean(
      currentSource?.type === 'random' && currentSource?.payload
    )

    // If a prefetch was performed on page load, use it and skip the
    // immediate fetch. This lets the UI show a warm preview without
    // waiting for the normal fetch cycle.
    if (typeof globalThis !== 'undefined' && globalThis.__prefetchedBackgroundPreviewBlob) {
      const blob = globalThis.__prefetchedBackgroundPreviewBlob
      delete globalThis.__prefetchedBackgroundPreviewBlob
      const url = URL.createObjectURL(blob)
      setBackgroundPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return url
      })
      return
    }

    // If there is no customization source available, there's nothing to
    // preview. However, allow the panel's force-enable flag (used during
    // development) to permit preview generation even when there's no
    // `nortContent` source. Use `hasCustomizationSource` which respects the
    // `FORCE_ENABLE_CUSTOMIZE` override.
    if (!hasCustomizationSource && !hasRandomPayloadSource) {
      setBackgroundPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return null
      })
      return
    }

    const controller = new AbortController()

    // Defer the fetch to the next macrotask. This allows the parent's
    // hydration effect (which runs synchronously after this effect) to update
    // all background-related state before the request is built. If a second
    // effect fires during that window (because hydration changed a dependency),
    // the cleanup will cancel this timer before it executes, so only one
    // request is sent with the fully-settled state.
    let timerId = setTimeout(async () => {
      if (controller.signal.aborted) return
      const payload = buildPreviewPayload()
      const blob = await fetchPreviewBlob(payload, controller)
      await setPreviewFromBlob(blob)
    }, 100)

    return () => {
      clearTimeout(timerId)
      controller.abort()
    }
  }, [
    // Keep a single serialized key of all customization values so any change
    // to the customization UI triggers the background-preview fetch.
    previewTriggerKey,
    currentSource?.nortContent,
    currentSource?.payload,
    currentSource?.type,
    previewRefreshNonce,
  ])

    function renderColorControl({ id, label, hexValue, onHexChange, alphaValue, onAlphaChange, disabled, showState, setShowState, swatchStyle, onClose, swatchReplacement }) {
      const openerClick = (e) => {
        if (disabled) return
        if (typeof setShowState === 'function') setShowState(true)
      }
      const openerKey = (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault()
          if (typeof setShowState === 'function') setShowState(true)
        }
      }
      const closePicker = () => {
        if (typeof setShowState === 'function') setShowState(false)
        if (typeof onClose === 'function') onClose()
      }

      return (
        <>
          <label htmlFor={`${id}`} className={disabled ? 'is-disabled' : ''}>{label}</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {swatchReplacement ? (
              <div className="disabled-color-replacement">{swatchReplacement}</div>
            ) : (
              <button
                type="button"
                aria-label={`Open ${label} color picker`}
                disabled={disabled}
                onClick={openerClick}
                onKeyDown={openerKey}
                style={{
                  display: 'inline-block',
                  flex: '1 1 auto',
                  minWidth: 48,
                  height: 28,
                  background: hexValue || '#000000',
                  border: '1px solid #bbb',
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  pointerEvents: disabled ? 'none' : undefined,
                  ...(swatchStyle),
                }}
              />
            )}
          </div>
          {showState && (
            <ColorPickerModal open={showState} onClose={closePicker}>
              <>
                <RgbaColorPicker
                  color={hexToRgba(hexValue, alphaValue || 0)}
                  onChange={(col) => {
                    const hex = rgbaToHex(col)
                    onHexChange(hex)
                    if (typeof onAlphaChange === 'function') {
                      onAlphaChange(Math.round((1 - (col.a ?? 1)) * 100))
                    }
                  }}
                />
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={closePicker}>
                    Close
                  </button>
                </div>
              </>
            </ColorPickerModal>
          )}
        </>
      )
    }

  useEffect(() => {
    return () => {
      setBackgroundPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return null
      })
    }
  }, [])

  function handleFontOptionClick(event) {
    const fieldId = event.currentTarget.dataset.fieldId
    const family = event.currentTarget.dataset.family ?? ''
    const setter = fontFieldSetters[fieldId]
    if (setter) {
      setter(family)
    }
    setOpenFontComboId(null)
  }

  function buildTabProps() {
    return {
      values,
      handlers,
      options,
      ui,
      translateLabel,
      translateLabelWithArgs,
      sanitizeSeedValue,
      sanitizeTranslation,
      renderColorControl,
      gatedControlValue,
      emptyComboOption,
      textures,
      backgroundTypes,
      hasTextures,
      strokeTypes,
      borderTypes,
      borderPositions,
      borderColorOptions,
      landColoringMethods,
      gridOverlayShapes,
      gridOverlayOffsets,
      gridOverlayLayers,
      lineStyles,
      oceanWaveTypes,
      concentricWaveValue,
      rippleWaveValue,
      noneWaveValue,
      availableFontFamilies,
      fontFields,
      fontFieldSetters,
      openFontComboId,
      setOpenFontComboId,
      recomposeUsingLastBase,
      notifyManualChange,
      previewFields,
      backgroundPreviewUrl,
      preview,
      showTextureOptions,
      drawVoronoiGridOverlayOnlyOnLand,
      // setters and preview values (canonicalized)
      ...previewFields,
      // Explicit setters/handlers (not part of previewFields)
      setTextureRef: handlers.setTextureRef,
      setBackgroundType: handlers.setBackgroundType,
      setDrawBorder: handlers.setDrawBorder,
      setDrawRegionBoundaries: handlers.setDrawRegionBoundaries,
      setRegionBoundaryStyle: handlers.setRegionBoundaryStyle,
      setRegionBoundaryWidth: handlers.setRegionBoundaryWidth,
      setRegionBoundaryColorHex: handlers.setRegionBoundaryColorHex,
      setColorizeLand: handlers.setColorizeLand,
      setFinalLandColoringMethod: handlers.setFinalLandColoringMethod,
      setLandColorHex: handlers.setLandColorHex,
      setColorizeOcean: handlers.setColorizeOcean,
      setOceanColorHex: handlers.setOceanColorHex,
      setBackgroundSeed: handlers.setBackgroundSeed,
      setDrawGridOverlay: handlers.setDrawGridOverlay,
      setGridOverlayShape: handlers.setGridOverlayShape,
      setGridOverlayRowOrColCount: handlers.setGridOverlayRowOrColCount,
      setGridOverlayLineWidth: handlers.setGridOverlayLineWidth,
      setGridOverlayColorHex: handlers.setGridOverlayColorHex,
      setGridOverlayXOffset: handlers.setGridOverlayXOffset,
      setGridOverlayYOffset: handlers.setGridOverlayYOffset,
      handleGenerateFromSettings: handlers.handleGenerateFromSettings,
      handleGenerateAndSaveNort: handlers.handleGenerateAndSaveNort,
      openPreviewModal: handlers.openPreviewModal,
      handleDownloadMap: handlers.handleDownloadMap,
      ...setterDeps,
      handleFontOptionClick,
      // picker visibility state
      showCoastPicker,
      setShowCoastPicker,
      showGridPicker,
      setShowGridPicker,
      showOceanPicker,
      setShowOceanPicker,
      showRegionBoundaryPicker,
      setShowRegionBoundaryPicker,
      showLandPicker,
      setShowLandPicker,
      showBorderColorPicker,
      setShowBorderColorPicker,
      showFrayedBorderPicker,
      setShowFrayedBorderPicker,
      showCoastlinePicker,
      setShowCoastlinePicker,
      showOceanWavesPicker,
      setShowOceanWavesPicker,
      showRiverPicker,
      setShowRiverPicker,
      showRoadPicker,
      setShowRoadPicker,
      showTextColorPicker,
      setShowTextColorPicker,
      showBoldBackgroundPicker,
      setShowBoldBackgroundPicker,
    }
  }

  const tabProps = buildTabProps()

  

  // Tab implementations have been moved into dedicated components.
  // Helper to pass a narrowed `context` object to each tab (avoid passing whole `tabProps`).
  const pick = (obj, keys) => {
    const out = {}
    for (const k of keys) {
      if (Object.hasOwn(obj, k)) out[k] = obj[k]
    }
    return out
  }

  const backgroundKeys = [
    'translateLabel', 'gatedControlValue', 'emptyComboOption', 'renderColorControl', 'notifyManualChange', 'recomposeUsingLastBase', 'textures', 'backgroundTypes', 'strokeTypes', 'landColoringMethods',
    'backgroundType','setBackgroundType','showTextureOptions','hasTextures','textureRef','setTextureRef','drawRegionBoundaries','setDrawRegionBoundaries','regionBoundaryStyle','setRegionBoundaryStyle','regionBoundaryWidth','setRegionBoundaryWidth','regionBoundaryColorHex','setRegionBoundaryColorHex','showRegionBoundaryPicker','setShowRegionBoundaryPicker','colorizeLand','setColorizeLand','finalLandColoringMethod','setFinalLandColoringMethod','landColorHex','setLandColorHex','showLandPicker','setShowLandPicker','colorizeOcean','setColorizeOcean','showOceanPicker','setShowOceanPicker','oceanColorHex','setOceanColorHex','backgroundSeed','sanitizeSeedValue','setBackgroundSeed','drawGridOverlay','setDrawGridOverlay','gridOverlayShape','setGridOverlayShape','gridOverlayRowOrColCount','setGridOverlayRowOrColCount','gridOverlayLineWidth','setGridOverlayLineWidth','gridOverlayColorHex','setGridOverlayColorHex','showGridPicker','setShowGridPicker','gridOverlayOffsets','gridOverlayXOffset','setGridOverlayXOffset','gridOverlayYOffset','setGridOverlayYOffset','gridOverlayLayers','gridOverlayLayer','setGridOverlayLayer','backgroundPreviewUrl','gridOverlayShapes','drawVoronoiGridOverlayOnlyOnLand','setDrawVoronoiGridOverlayOnlyOnLand'
  ]

  const borderKeys = [
    'translateLabel','gatedControlValue','emptyComboOption','renderColorControl','drawBorder','setDrawBorder','borderRef','setBorderRef','borderTypes','borderWidth','setBorderWidth','borderPosition','setBorderPosition','borderPositions','borderColorOption','setBorderColorOption','borderColorOptions','borderColorHex','setBorderColorHex','frayedBorder','setFrayedBorder','frayedBorderBlurLevel','setFrayedBorderBlurLevel','frayedBorderSize','setFrayedBorderSize','frayedBorderSeed','setFrayedBorderSeed','drawGrunge','setDrawGrunge','grungeWidth','setGrungeWidth','frayedBorderColorHex','setFrayedBorderColorHex','showBorderColorPicker','setShowBorderColorPicker','showFrayedBorderPicker','setShowFrayedBorderPicker'
  ]

  const effectsKeys = [
    'translateLabel','gatedControlValue','emptyComboOption','renderColorControl','lineStyles','lineStyle','setLineStyle','coastlineWidth','setCoastlineWidth','coastlineColorHex','setCoastlineColorHex','showCoastlinePicker','setShowCoastlinePicker','coastShadingLevel','setCoastShadingLevel','coastShadingAlpha','setCoastShadingAlpha','finalLandColoringMethod','oceanShadingLevel','setOceanShadingLevel','oceanShadingColorHex','setOceanShadingColorHex','oceanShadingAlpha','setOceanShadingAlpha','showOceanPicker','setShowOceanPicker','oceanWaveTypes','oceanWavesType','setOceanWavesType','concentricWaveValue','noneWaveValue','oceanWavesLevel','setOceanWavesLevel','oceanWavesAlpha','setOceanWavesAlpha','oceanWavesColorHex','setOceanWavesColorHex','showOceanWavesPicker','setShowOceanWavesPicker','concentricWaveCount','setConcentricWaveCount','fadeConcentricWaves','setFadeConcentricWaves','jitterToConcentricWaves','setJitterToConcentricWaves','brokenLinesForConcentricWaves','setBrokenLinesForConcentricWaves','drawOceanEffectsInLakes','setDrawOceanEffectsInLakes','riverColorHex','setRiverColorHex','showRiverPicker','setShowRiverPicker','drawRoads','setDrawRoads','roadStyle','setRoadStyle','strokeTypes','roadWidth','setRoadWidth','roadColorHex','setRoadColorHex','showRoadPicker','setShowRoadPicker','mountainSize','setMountainSize','hillSize','setHillSize','duneSize','setDuneSize','treeHeight','setTreeHeight','citySize','setCitySize'
  ]

  const fontsKeys = [
    'translateLabel','renderColorControl','drawText','setDrawText','fontFields','availableFontFamilies','openFontComboId','setOpenFontComboId','handleFontOptionClick','textColorHex','setTextColorHex','showTextColorPicker','setShowTextColorPicker','drawBoldBackground','setDrawBoldBackground','boldBackgroundColorHex','setBoldBackgroundColorHex','showBoldBackgroundPicker','setShowBoldBackgroundPicker'
  ]

  return (
    <section
      className={`generator-section customize-section${hasCustomizationSource ? '' : ' is-disabled'}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h3 style={{ margin: 0 }}>{translateLabel('ui.title.customize')}</h3>
      </div>
      <p className="section-hint">
        {translateLabel('ui.subtitle.customize')}
      </p>
      {!hasCustomizationSource && (
        <p className="section-hint">
          {translateLabel('ui.noSourceHint')}
        </p>
      )}
      <form
        className={`section-fields${hasCustomizationSource ? '' : ' section-fields--disabled'}`}
        onSubmit={onSubmitGenerate}
        onChange={notifyManualChange}
        onInput={notifyManualChange}
      >
        <div className="settings-preview-row">
          <div className="settings-inline-preview-slot">
            {preview ? (
              <button
                type="button"
                className="preview-image-button"
                onClick={handlers.openPreviewModal}
                aria-label={translateLabel('ui.preview.open')}
              >
                <img src={preview.url} alt="Generated map preview" />
              </button>
            ) : (
              <div className="settings-inline-preview-empty">
                {translateLabel('ui.preview.empty')}
              </div>
            )}
          </div>
        </div>

        <fieldset className="customize-disabled-fieldset" disabled={!hasCustomizationSource}>
          <div className="customize-tabs" role="tablist" aria-label="Customization sections">
            {Array.isArray(tabs)
                ? tabs.map((tab, idx) => {
                  let derivedId
                  if (tab?.id) derivedId = String(tab.id)
                  else if (tab?.label) derivedId = String(tab.label)
                  else derivedId = `tab-${idx}`
                  const normId = derivedId.toLowerCase()
                  return (
                    <button
                      key={derivedId}
                      type="button"
                      role="tab"
                      className={`customize-tab-button${activeTab === normId ? ' is-active' : ''}`}
                      aria-selected={activeTab === normId}
                      onClick={() => setActiveTab(normId)}
                    >
                      {tab?.label ? tab.label : `Tab ${idx + 1}`}
                    </button>
                  )
                })
              : null}
          </div>

          <div className="customize-tab-panel" role="tabpanel">
            {activeTab === 'background' && <BackgroundTab {...pick(tabProps, backgroundKeys)} />}
            {activeTab === 'border' && <BorderTab {...pick(tabProps, borderKeys)} />}
            {activeTab === 'effects' && <EffectsTab {...pick(tabProps, effectsKeys)} />}
            {activeTab === 'fonts' && <FontsTab {...pick(tabProps, fontsKeys)} />}
          </div>

          <div className="section-actions">
            <button type="submit" disabled={!canSubmit}>
              {loading
                ? translateLabel('ui.generating')
                : translateLabel('ui.button.regenerate')}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!canDownloadSettings}
              onClick={handlers.handleGenerateAndSaveNort}
            >
              {translateLabel('ui.button.downloadSettings')}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!canDownloadMap}
              onClick={handlers.handleDownloadMap}
            >
              {translateLabel('ui.button.downloadMap')}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}

CustomizeSettingsSection.propTypes = {
  values: PropTypes.object.isRequired,
  handlers: PropTypes.object.isRequired,
  options: PropTypes.object.isRequired,
  ui: PropTypes.shape({
    loading: PropTypes.bool.isRequired,
    customizationDirty: PropTypes.bool,
    hasGeneratedOnce: PropTypes.bool,
  }).isRequired,
}
