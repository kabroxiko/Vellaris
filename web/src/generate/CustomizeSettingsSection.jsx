import React, { useEffect, useMemo, useState, useRef } from 'react'
import { RgbaColorPicker } from 'react-colorful'
import PropTypes from 'prop-types'
import backgroundBaseCache from './backgroundBaseCache'
import BackgroundTab from './tabs/BackgroundTab'
import BorderTab from './tabs/BorderTab'
import EffectsTab from './tabs/EffectsTab'
import FontsTab from './tabs/FontsTab'
  

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Utility: convert hex color to HSB triplet [h (0..1), s (0..1), b (0..1)]
function hexToHSB(hex) {
  const hh = String(hex || '').replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(hh)) return [0, 0, 0]
  const r = Number.parseInt(hh.slice(0,2),16)/255
  const g = Number.parseInt(hh.slice(2,4),16)/255
  const b = Number.parseInt(hh.slice(4,6),16)/255
  const max = Math.max(r,g,b)
  const min = Math.min(r,g,b)
  const delta = max - min
  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = ((b - r) / delta) + 2
    else hue = ((r - g) / delta) + 4
    hue = hue * 60
    if (hue < 0) hue += 360
  }
  const sat = max === 0 ? 0 : delta / max
  const bri = max
  return [hue/360, sat, bri]
}

// RNG helper (Mulberry32) — hoisted to module scope to reduce nested functions
function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Utility: convert HSB to RGB triplet [R,G,B]
function hsbToRgb(h, s, v) {
  const hh = (h * 360)
  const c = v * s
  const x = c * (1 - Math.abs(((hh/60) % 2) - 1))
  const m = v - c
  let r1=0,g1=0,b1=0
  if (hh >= 0 && hh < 60) {
    r1 = c
    g1 = x
  } else if (hh < 120) {
    r1 = x
    g1 = c
  } else if (hh < 180) {
    g1 = c
    b1 = x
  } else if (hh < 240) {
    g1 = x
    b1 = c
  } else if (hh < 300) {
    r1 = x
    b1 = c
  } else {
    r1 = c
    b1 = x
  }
  const R = Math.round((r1 + m) * 255)
  const G = Math.round((g1 + m) * 255)
  const B = Math.round((b1 + m) * 255)
  return [R,G,B]
}

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
    } else {
      if (hsb[2] < 0.5) resultLevel = level * (hsb[2] * 2)
      else {
        const range = (1 - hsb[2]) * 2
        resultLevel = range * level + (1 - range)
      }
    }
    const [rC, gC, bC] = hsbToRgb(hsb[0], hsb[1], resultLevel)
    data[i] = Math.round((1 - preserveTexture) * rC + preserveTexture * r0)
    data[i+1] = Math.round((1 - preserveTexture) * gC + preserveTexture * g0)
    data[i+2] = Math.round((1 - preserveTexture) * bC + preserveTexture * b0)
  }
  tctx.putImageData(imd, 0, 0)
  return await createImageBitmap(tmp)
}

// Utility: convert hex color to rgba object {r,g,b,a}
function hexToRgba(hex, transparencyPercent = 0) {
  if (!hex) return { r: 0, g: 0, b: 0, a: 1 }
  const h = hex.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0, a: 1 }
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  const opacity = 1 - (Number(transparencyPercent || 0) / 100)
  return { r, g, b, a: Math.max(0, Math.min(1, opacity)) }
}

function rgbaToHex(col) {
  const r = Math.round(col.r || 0)
  const g = Math.round(col.g || 0)
  const b = Math.round(col.b || 0)
  return (
    '#'+
    r.toString(16).padStart(2, '0')+
    g.toString(16).padStart(2, '0')+
    b.toString(16).padStart(2, '0')
  )
}

// Retry fetch helper (hoisted)
async function doFetchWithRetries(url, opts, attempts = 3, delayMs = 300) {
  for (let i = 0; i < attempts; i++) {
    try {
      const resp = await fetch(url, opts)
      if (!resp.ok) throw new Error('Non-OK response')
      return resp
    } catch (err) {
      if (i === attempts - 1) throw err
      if (opts?.signal?.aborted) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

// Helper to darken/lighten hex color (hoisted)
function shadeColor(hex, percent) {
  const h = hex.replace(/^#/, '')
  const num = Number.parseInt(h, 16)
  let r = (num >> 16) + percent
  let g = ((num >> 8) & 0x00ff) + percent
  let b = (num & 0x0000ff) + percent
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0')
}

function hexWithAlpha(hex, alpha) {
  const h = hex.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(194,184,145,${alpha})`
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

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
    // focus first focusable element inside modal for accessibility
    if (innerRef.current) {
      const btn = innerRef.current.querySelector('button, [tabindex], input, [role="button"]')
      if (btn && typeof btn.focus === 'function') btn.focus()
    }
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div style={modalBackdropStyle} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={innerRef} style={modalContentStyle} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

ColorPickerModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  children: PropTypes.node,
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
    gridOverlayLayer,
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
  


  // Aggregate all customization fields we want to send to the preview
  const previewFields = useMemo(() => {
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
  }, [
    backgroundType,
    textureRef,
    backgroundSeed,
    finalSeed,
    finalWidth,
    finalHeight,
    colorizeLand,
    colorizeOcean,
    landColorHex,
    oceanColorHex,
    drawBorder,
    drawGrunge,
    drawGridOverlay,
    gridOverlayShape,
    gridOverlayRowOrColCount,
    gridOverlayColorHex,
    gridOverlayXOffset,
    gridOverlayYOffset,
    gridOverlayLineWidth,
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
  ])

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
    const payload = Object.assign({ width: 520, height: 170 }, previewFields)
    payload.type = previewFields.backgroundType === undefined ? null : previewFields.backgroundType
    const bg = payload.type
    if (bg === 'GeneratedFromTexture' || (typeof bg === 'string' && bg.toLowerCase().includes('texture'))) {
      const rawRef = previewFields.textureRef
      const isEmpty = rawRef === undefined || rawRef === null || String(rawRef).trim() === ''
      if (isEmpty) {
        Object.assign(payload, pickDefaultTexture())
      } else {
        Object.assign(payload, resolveRawTextureRef(rawRef))
      }
    }
    if (currentSource?.type === 'random' && currentSource?.payload) Object.assign(payload, currentSource.payload)
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
    if (typeof handleGenerateFromSettings === 'function') {
      await handleGenerateFromSettings(e)
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

  const {
    setBackgroundType,
    setTextureRef,
    setColorizeLand,
    setColorizeOcean,
    setFinalLandColoringMethod,
    setRegionBoundaryStyle,
    setRegionBoundaryWidth,
    setRegionBoundaryColorHex,
    setLandColorHex,
    setOceanColorHex,
    setBackgroundSeed,
    setDrawRegionBoundaries,
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
    setRoadStyle,
    setRoadWidth,
    setRoadColorHex,
    setMountainSize,
    setHillSize,
    setDuneSize,
    setTreeHeight,
    setCitySize,
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
    setOceanWavesAlpha,
    setOceanWavesColorHex,
    setConcentricWaveCount,
    setFadeConcentricWaves,
    setJitterToConcentricWaves,
    setBrokenLinesForConcentricWaves,
    setDrawOceanEffectsInLakes,
    setRiverColorHex,
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
    handleGenerateFromSettings,
    handleGenerateAndSaveNort,
    openPreviewModal,
    handleDownloadMap,
  } = handlers

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
      if (typeof value === 'string' && /<br\s*\/?>/i.test(value)) {
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
      out = out.replaceAll(new RegExp(`\\{${i}\\}`, 'g'), String(a))
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
    if (!s) return s
    if (typeof s !== 'string') return s
    // Remove surrounding <html> wrappers and preserve <br> as line breaks
    let t = String(s)
    t = t.replace(/^\s*<html>\s*/i, '').replace(/\s*<\/html>\s*$/i, '')
    // If there are <br> tags, convert to React nodes with breaks
    if (/<br\s*\/?>/i.test(t)) {
      const parts = t.split(/<br\s*\/?>/i)
      return parts.flatMap((p) => (p === parts.at(-1) ? [p] : [p, React.createElement('br', { key: `br-${String(p).slice(0,20)}` })]))
    }
    // Otherwise strip any other HTML tags
    t = t.replaceAll(/<[^>]*>/g, '')
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
  const emptyComboOption = () => (hasCustomizationSource ? null : (<option value="" />))

  const fontFields = useMemo(
    () => [
      {
        id: 'title-font-family-input',
        label: translateLabel('theme.titleFont.label'),
        value: titleFontFamily,
        onChange: setTitleFontFamily,
      },
      {
        id: 'region-font-family-input',
        label: translateLabel('theme.regionFont.label'),
        value: regionFontFamily,
        onChange: setRegionFontFamily,
      },
      {
        id: 'mountain-range-font-family-input',
        label: translateLabel('theme.mountainRangeFont.label'),
        value: mountainRangeFontFamily,
        onChange: setMountainRangeFontFamily,
      },
      {
        id: 'other-mountains-font-family-input',
        label: translateLabel('theme.otherMountainsFont.label'),
        value: otherMountainsFontFamily,
        onChange: setOtherMountainsFontFamily,
      },
      {
        id: 'cities-font-family-input',
        label: translateLabel('theme.citiesFont.label'),
        value: citiesFontFamily,
        onChange: setCitiesFontFamily,
      },
      {
        id: 'river-font-family-input',
        label: translateLabel('theme.riverLakeFont.label'),
        value: riverFontFamily,
        onChange: setRiverFontFamily,
      },
    ],
    [
      citiesFontFamily,
      mountainRangeFontFamily,
      otherMountainsFontFamily,
      regionFontFamily,
      riverFontFamily,
      setCitiesFontFamily,
      setMountainRangeFontFamily,
      setOtherMountainsFontFamily,
      setRegionFontFamily,
      setRiverFontFamily,
      setTitleFontFamily,
      titleFontFamily,
      translateLabel,
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
      const computedSwatchStyle = swatchStyle ?? {}

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
                  ...(swatchStyle || {}),
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
      // setters (from handlers destructured into local scope)
      setBackgroundType,
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
      drawGridOverlay,
      gridOverlayShape,
      gridOverlayRowOrColCount,
      gridOverlayColorHex,
      gridOverlayXOffset,
      gridOverlayYOffset,
      gridOverlayLineWidth,
      gridOverlayLayer,
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
      textColorHex,
      drawBoldBackground,
      boldBackgroundColorHex,
      setTextureRef,
      setDrawBorder,
      drawRegionBoundaries,
      setDrawRegionBoundaries,
      regionBoundaryWidth,
      setRegionBoundaryStyle,
      setRegionBoundaryWidth,
      setRegionBoundaryColorHex,
      setColorizeLand,
      setFinalLandColoringMethod,
      setLandColorHex,
      setColorizeOcean,
      setOceanColorHex,
      setBackgroundSeed,
      setDrawGridOverlay,
      setGridOverlayShape,
      setGridOverlayRowOrColCount,
      setGridOverlayLineWidth,
      setGridOverlayColorHex,
      setGridOverlayXOffset,
      setGridOverlayYOffset,
      setGridOverlayLayer,
      setDrawVoronoiGridOverlayOnlyOnLand,
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
      setRoadStyle,
      setRoadWidth,
      setRoadColorHex,
      setMountainSize,
      setHillSize,
      setDuneSize,
      setTreeHeight,
      setCitySize,
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
      setOceanWavesAlpha,
      setOceanWavesColorHex,
      setConcentricWaveCount,
      setFadeConcentricWaves,
      setJitterToConcentricWaves,
      setBrokenLinesForConcentricWaves,
      setDrawOceanEffectsInLakes,
      setRiverColorHex,
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
      if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]
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
                onClick={openPreviewModal}
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
              onClick={handleGenerateAndSaveNort}
            >
              {translateLabel('ui.button.downloadSettings')}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!canDownloadMap}
              onClick={handleDownloadMap}
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
