import React, { useEffect, useMemo, useState, useRef } from 'react'
import { RgbaColorPicker } from 'react-colorful'
import PropTypes from 'prop-types'
import backgroundBaseCache from './backgroundBaseCache'
  

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

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
    finalLandColoringMethod,
    regionBoundaryStyle,
    regionBoundaryWidth,
    regionBoundaryColorHex,
    landColorHex,
    oceanColorHex,
    backgroundSeed,
    finalSeed,
    finalWidth,
    finalHeight,
    drawRegionBoundaries,
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
  ])

  // Compose a mini island preview from a neutral base Blob. Exported at
  // component scope so color controls can trigger a local recomposition
  // without initiating a new network fetch.
  async function composeMiniIslandFromBlob(sourceBlob, opts = {}) {
    try {
      const imgBitmap = await createImageBitmap(sourceBlob)
      const w = imgBitmap.width
      const h = imgBitmap.height
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')

      const boxW = Math.round(w * 0.45)
      const boxH = Math.round(h * 0.45)
      const x = Math.round((w - boxW) / 2)
      const y = Math.round((h - boxH) / 2)

      const seed = Number(previewFields.backgroundSeed) || Date.now()
      function mulberry32(a) {
        return function() {
          let t = (a += 0x6d2b79f5)
          t = Math.imul(t ^ (t >>> 15), t | 1)
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
      }
      const rng = mulberry32(seed & 0xffffffff)
      // Choose whether to colorize the ocean based on opts override
      const useColorizeOcean = (typeof opts.colorizeOcean === 'boolean') ? opts.colorizeOcean : colorizeOcean
      const useOceanColorHex = opts.oceanColorHex || oceanColorHex

      // Helper: convert hex -> HSB and HSB -> RGB (used by server math)
      function hexToHSB(hex) {
        const hh = hex.replace(/^#/, '')
        const r = parseInt(hh.substring(0,2),16)/255
        const g = parseInt(hh.substring(2,4),16)/255
        const b = parseInt(hh.substring(4,6),16)/255
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
      function hsbToRgb(h, s, v) {
        const hh = (h * 360)
        const c = v * s
        const x = c * (1 - Math.abs(((hh/60) % 2) - 1))
        const m = v - c
        let r1=0,g1=0,b1=0
        if (hh >= 0 && hh < 60) { r1=c; g1=x; b1=0 }
        else if (hh < 120) { r1=x; g1=c; b1=0 }
        else if (hh < 180) { r1=0; g1=c; b1=x }
        else if (hh < 240) { r1=0; g1=x; b1=c }
        else if (hh < 300) { r1=x; g1=0; b1=c }
        else { r1=c; g1=0; b1=x }
        const R = Math.round((r1 + m) * 255)
        const G = Math.round((g1 + m) * 255)
        const B = Math.round((b1 + m) * 255)
        return [R,G,B]
      }

      // Centralized per-pixel colorize helper. Returns an ImageBitmap.
      async function colorizeBitmap(sourceBitmap, colorHex) {
        const alg = (previewFields && String(previewFields.backgroundType || '').toLowerCase().includes('fractal')) ? 'algorithm2' : 'algorithm3'
        const hsb = hexToHSB(colorHex)
        const tmp = document.createElement('canvas')
        tmp.width = w
        tmp.height = h
        const tctx = tmp.getContext('2d')
        tctx.drawImage(sourceBitmap, 0, 0, w, h)
        const imd = tctx.getImageData(0, 0, w, h)
        const data = imd.data
        const preserveTexture = (typeof opts.preserveTexture === 'number') ? Math.max(0, Math.min(1, opts.preserveTexture)) : 0.02
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
        try { return await createImageBitmap(tmp) } catch (e) { return sourceBitmap }
      }

      // Draw background (colorized if requested). To match backend
      // behavior exactly we colorize the grayscale neutral base per-pixel
      // using the same algorithms the server uses (algorithm2 for
      // fractal, algorithm3 for textures) so contrast and detail are
      // preserved while tinting.
      let displayBitmap = imgBitmap
      if (useColorizeOcean && useOceanColorHex) {
        try { displayBitmap = await colorizeBitmap(imgBitmap, useOceanColorHex) } catch (e) { displayBitmap = imgBitmap }
      }

      // Also prepare a land-colorized bitmap using the centralized helper
      let landBitmap = imgBitmap
      const _useColorizeLandLocal = (typeof opts.colorizeLand === 'boolean') ? opts.colorizeLand : colorizeLand
      const _useLandColorHexLocal = opts.landColorHex || landColorHex
      if (_useColorizeLandLocal && _useLandColorHexLocal) {
        try { landBitmap = await colorizeBitmap(imgBitmap, _useLandColorHexLocal) } catch (e) { landBitmap = imgBitmap }
      }

      // Draw the (possibly colorized) background full-size so the ocean
      // tint blends with the texture across the entire preview.
      ctx.save()
      
      ctx.drawImage(displayBitmap, 0, 0, w, h)
      // subtle inset overlay for the box area
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.fillRect(x - 2, y - 2, boxW + 4, boxH + 4)
      ctx.restore()

      const cx = x + Math.round(boxW * 0.5)
      const cy = y + Math.round(boxH * 0.5)
      // Make the island wider by using an elliptical radius: wider X than Y.
      const baseRadius = Math.round(Math.min(boxW, boxH) * 0.48)
      const xRadius = Math.round(baseRadius * 1.45)
      const yRadius = baseRadius
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

      // displayBitmap already includes the ocean colorization when
      // `useColorizeOcean` is enabled, so no additional overlay is needed.

      const useColorizeLand = (typeof opts.colorizeLand === 'boolean') ? opts.colorizeLand : colorizeLand
      const useLandColorHex = opts.landColorHex || landColorHex
      const landColor = (useColorizeLand && useLandColorHex) ? useLandColorHex : '#c2b891'

      try {
        // Use the landBitmap (colorized same as ocean when enabled) as the
        // pattern source so land and ocean share identical color math.
        const pattern = ctx.createPattern(landBitmap || displayBitmap || imgBitmap, 'repeat')
        if (pattern) {
          ctx.save()
          ctx.clip()
          ctx.fillStyle = pattern
          ctx.fillRect(x, y, boxW, boxH)

          // Add subtle inner shore shading to make the land read as an island.
          // Multiply a radial gradient that darkens toward the coastline.
          try {
            ctx.globalCompositeOperation = 'multiply'
            const gOuter = Math.max(1, radius)
            const grad = ctx.createRadialGradient(cx, cy, Math.round(radius * 0.3), cx, cy, Math.round(radius * 1.05))
            grad.addColorStop(0, 'rgba(0,0,0,0.0)')
            grad.addColorStop(0.6, 'rgba(0,0,0,0.08)')
            grad.addColorStop(1, 'rgba(0,0,0,0.28)')
            ctx.fillStyle = grad
            ctx.fillRect(x, y, boxW, boxH)
            // Add a light rim (beach) near the coast for contrast
            ctx.globalCompositeOperation = 'source-over'
            ctx.strokeStyle = 'rgba(255,255,240,0.55)'
            ctx.lineWidth = Math.max(1, Math.round(radius * 0.03))
            ctx.lineJoin = 'round'
            ctx.stroke()
          } catch (e) {}

          ctx.restore()
        } else {
          ctx.fillStyle = landColor
          ctx.fill()
        }
      } catch (e) {
        ctx.fillStyle = landColor
        ctx.fill()
      }

      try { ctx.strokeStyle = 'rgba(0,0,0,0.9)' } catch (e) { ctx.strokeStyle = '#000' }
      ctx.lineWidth = 1
      ctx.stroke()

      return await new Promise((resolve) => canvas.toBlob(resolve))
    } catch (e) {
      return sourceBlob
    }
  }

  async function onSubmitGenerate(e) {
    try {
      if (e && typeof e.preventDefault === 'function') e.preventDefault()
      if (typeof handleGenerateFromSettings === 'function') {
        // Await parent handler in case it updates preview state
        await handleGenerateFromSettings(e)
      }
    } catch (err) {
      // ignore handler errors here; still trigger preview refresh
    } finally {
      // Ensure background preview updates to match the latest map settings
      try { triggerPreviewRefresh() } catch (e) {}
    }
  }

  async function recomposeUsingLastBase(opts = {}) {
    if (!lastBaseBlobRef.current) return
    try {
      const processed = await composeMiniIslandFromBlob(lastBaseBlobRef.current, opts)
      const url = URL.createObjectURL(processed || lastBaseBlobRef.current)
      setBackgroundPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return url
      })
    } catch (e) {}
  }

 
  // Use a filtered preview key so color toggles/values DO NOT trigger
  // the background preview. We only want texture/background changes
  // (and other visual parameters) to trigger backend fetches.
  const previewTriggerKey = useMemo(() => {
    try {
      const { colorizeLand, colorizeOcean, landColorHex, oceanColorHex, ...rest } = previewFields || {}
      return JSON.stringify(rest)
    } catch (e) {
      return ''
    }
  }, [
    // include the specific previewFields members we care about so React
    // invalidation still works but color state changes are ignored.
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
    setFinalSeed,
    setFinalWidth,
    setFinalHeight,
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

  const { textures, borderTypes, i18n } = options
  const { loading } = ui
  // Debug logging removed to avoid console noise in the web UI.
  const labels = i18n?.labels || {}
  const backendOptions = i18n?.options || {}
  const DEFAULT_TABS = [
    { id: 'background', label: 'Background' },
    { id: 'border', label: 'Border' },
    { id: 'effects', label: 'Effects' },
    { id: 'fonts', label: 'Fonts' },
  ]

  const tabs = (backendOptions.tabs || DEFAULT_TABS).map((tab) => ({
    id: tab.id || tab.value,
    label: tab.label,
  }))
  const landColoringMethods = backendOptions.landColoringMethods || []
  const gridOverlayShapes = backendOptions.gridOverlayShapes || []
  const gridOverlayOffsets = backendOptions.gridOverlayOffsets || []
  const gridOverlayLayers = backendOptions.gridOverlayLayers || []
  const backgroundTypes = backendOptions.backgroundTypes || []

  // Fonts are provided by the backend via `i18n.options.fonts`.
  // Per project policy: do not introduce client-side fallbacks — if the
  // server does not provide fonts, the list will be empty.
  const availableFontFamilies = useMemo(() => {
    return Array.isArray(backendOptions?.fonts) ? backendOptions.fonts : []
  }, [backendOptions?.fonts])

  // Preload the first few texture bases and a fractal base so the UI
  // doesn't hit the backend on first open. Uses `backgroundBaseCache.preload`.
  useEffect(() => {
    try {
      const candidates = []
      if (Array.isArray(textures) && textures.length > 0) {
        textures.slice(0, 5).forEach((t) => {
          candidates.push({ width: 520, height: 170, type: 'GeneratedFromTexture', texture: `${t.artPack}|${t.name}` })
        })
      }
      const fractal = Array.isArray(backgroundTypes) ? backgroundTypes.find((b) => b && b.value && String(b.value).toLowerCase().includes('fractal')) : null
      if (fractal) candidates.push({ width: 520, height: 170, type: fractal.value })
      else candidates.push({ width: 520, height: 170, type: 'Fractal' })

      candidates.forEach((p) => {
        try { backgroundBaseCache.preload(p) } catch (e) {}
      })
    } catch (e) {}
  }, [textures, backgroundTypes])
  const strokeTypes = backendOptions.strokeTypes || []
  const borderPositions = backendOptions.borderPositions || []
  const borderColorOptions = backendOptions.borderColorOptions || []
  const lineStyles = backendOptions.lineStyles || []
  const oceanWaveTypes = backendOptions.oceanWaveTypes || []
  const concentricWaveValue = oceanWaveTypes.find(o => o && o.value && /Concentric/i.test(o.value))?.value
  const rippleWaveValue = oceanWaveTypes.find(o => o && o.value && /Ripple|Ripples/i.test(o.value))?.value
  const noneWaveValue = oceanWaveTypes.find(o => o && o.value && /^(None|No|NoEffect|NoneWaves)$/i.test(o.value))?.value
  const translateLabel = (key) => {
    const has = labels && Object.prototype.hasOwnProperty.call(labels, key) && labels[key]
    const txt = has ? labels[key] : null
    const baseKey = (!txt && key && key.endsWith('.label')) ? key.substring(0, key.length - '.label'.length) : null
    const alternate = baseKey && labels && Object.prototype.hasOwnProperty.call(labels, baseKey) ? labels[baseKey] : null
    const value = txt || alternate || key
    // If the translation contains literal <br> tags, return React nodes
    if (typeof value === 'string' && /<br\s*\/?\>/i.test(value)) {
      const parts = value.split(/<br\s*\/?\>/i)
      return parts.flatMap((p, i) => (i === parts.length - 1 ? [p] : [p, React.createElement('br', { key: i })]))
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
      out = out.replace(new RegExp(`\\{${i}\\}`, 'g'), String(a))
    })
    return out
  }

  // Ensure seed input fields do not display the literal label as their
  // value on initial load. If the value equals the translated label,
  // treat it as empty so the input appears blank.
  const seedLabelFallback = translateLabel('theme.randomSeed.label')
  const sanitizeSeedValue = (v) => {
    try {
      if (!v) return ''
      if (typeof v === 'string' && v.trim() === '') return ''
      if (v === seedLabelFallback) return ''
    } catch (e) {}
    return v
  }

  const sanitizeTranslation = (s) => {
    if (!s) return s
    if (typeof s !== 'string') return s
    // Remove surrounding <html> wrappers and preserve <br> as line breaks
    let t = String(s)
    t = t.replace(/^\s*<html>\s*/i, '').replace(/\s*<\/html>\s*$/i, '')
    // If there are <br> tags, convert to React nodes with breaks
    if (/<br\s*\/?\>/i.test(t)) {
      const parts = t.split(/<br\s*\/?\>/i)
      return parts.flatMap((p, i) => (i === parts.length - 1 ? [p] : [p, React.createElement('br', { key: i })]))
    }
    // Otherwise strip any other HTML tags
    t = t.replace(/<[^>]*>/g, '')
    t = t.replace(/''/g, "'")
    t = t.replace(/\s+/g, ' ').trim()
    return t
  }

  // Small helpers to convert between hex and rgba used by the picker.
  function hexToRgba(hex, transparencyPercent = 0) {
    if (!hex) return { r: 0, g: 0, b: 0, a: 1 }
    const h = hex.replace(/^#/, '')
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0, a: 1 }
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    const opacity = 1 - (Number(transparencyPercent || 0) / 100)
    return { r, g, b, a: Math.max(0, Math.min(1, opacity)) }
  }

  function rgbaToHex(col) {
    const r = Math.round(col.r || 0)
    const g = Math.round(col.g || 0)
    const b = Math.round(col.b || 0)
    return (
      '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0')
    )
  }

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
  // Notify parent that the user manually changed a customization control.
  // The parent decides whether to mark the UI as dirty (only after
  // the first successful generation) and therefore disable downloads.
  const notifyManualChange = () => {
    try {
      if (typeof handlers.notifyManualChange === 'function') handlers.notifyManualChange()
    } catch (e) {}
  }
  const triggerPreviewRefresh = () => {
    try {
      setPreviewRefreshNonce((n) => n + 1)
    } catch (e) {}
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
  const gatedControlValue = (value) => (hasCustomizationSource ? value : '')
  const emptyComboOption = hasCustomizationSource ? null : (
    <option value=""></option>
  )

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
    const hasNortContentSource = Boolean(currentSource?.nortContent)
    const hasRandomPayloadSource = Boolean(
      currentSource?.type === 'random' && currentSource?.payload
    )

    // If a prefetch was performed on page load, use it and skip the
    // immediate fetch. This lets the UI show a warm preview without
    // waiting for the normal fetch cycle.
    try {
      if (typeof window !== 'undefined' && window.__prefetchedBackgroundPreviewBlob) {
        const blob = window.__prefetchedBackgroundPreviewBlob
        try { delete window.__prefetchedBackgroundPreviewBlob } catch (e) {}
        const url = URL.createObjectURL(blob)
        setBackgroundPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous)
          return url
        })
        return
      }
    } catch (e) {}

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
      try {
        // Build a minimal preview payload. If the user has an explicit
        // `nortContent` source, send only that JSON plus preview dimensions
        // and light overrides. Avoid sending duplicated UI-only fields that
        // are already included inside `nortContent`.
        // Build a payload containing the explicit previewFields so the
        // server receives the full set of visual parameters regardless of
        // whether we also have a nortContent source. If the current source
        // is a random payload, merge it on top of these fields so the
        // resolver's canonical values take precedence.
        // Only send the minimal background controls that affect the
        // background preview (as shown in the screenshot): draw region
        // boundaries, color land flag and land color, color ocean flag and
        // ocean color. Keep preview dimensions.
        // We don't send the `colorizeLand` boolean flag to the preview API.
        // Only include `landColorHex` when land coloring is enabled.
        // We intentionally avoid sending color overrides to the backend
        // — the client will apply land/ocean tinting locally to the neutral
        // base image to reduce API calls and server load.
        const normalizedPreviewFields = {}

        const payload = Object.assign({ width: 520, height: 170 }, normalizedPreviewFields)

        // Include a `background` key (server expects this name). When the
        // background is a texture-based generation, also include the
        // `Texture` field so the server can resolve the texture reference.
        try {
          payload.type = previewFields.backgroundType === undefined ? null : previewFields.backgroundType
          const bg = payload.type
          if (
            bg === 'GeneratedFromTexture' ||
            (typeof bg === 'string' && bg.toLowerCase().includes('texture'))
          ) {
            // If the user hasn't explicitly selected a texture yet, prefer
            // the first available texture from the server-provided list so
            // enabling texture immediately produces a sensible preview.
            const rawRef = previewFields.textureRef
            const isEmpty = rawRef === undefined || rawRef === null || String(rawRef).trim() === ''
            if (isEmpty && Array.isArray(textures) && textures.length > 0) {
              const t = textures[0]
              payload.texture = `${t.artPack}|${t.name}`
            } else {
              payload.texture = isEmpty ? null : rawRef
            }
          }
        } catch (e) {}

        if (hasRandomPayloadSource) {
          Object.assign(payload, currentSource.payload)
        }

        

        // background-preview payload logging removed

        // Retry fetch a few times to handle transient network changes (ERR_NETWORK_CHANGED)
        async function doFetchWithRetries(url, opts, attempts = 3, delayMs = 300) {
          for (let i = 0; i < attempts; i++) {
            try {
              const resp = await fetch(url, opts)
              if (!resp.ok) throw new Error('Non-OK response')
              return resp
            } catch (err) {
              if (i === attempts - 1) throw err
              // If aborted, rethrow immediately
              if (opts.signal && opts.signal.aborted) throw err
              await new Promise((r) => setTimeout(r, delayMs))
            }
          }
        }

        let blob = null
        // Use the background base cache to preload and fetch small neutral
        // background images for client-side tinting. Falls back to
        // `/background-preview` if the base endpoint isn't available.
        try {
          // kick off a background preload (non-blocking)
          try { backgroundBaseCache.preload(payload) } catch (e) {}
          // await cached or in-flight fetch
          blob = await backgroundBaseCache.get(payload, controller.signal)
        } catch (e) {
          // Fallback to legacy preview if base not available
          const response = await doFetchWithRetries(`${API_BASE}/background-preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          }, 3, 300)
          blob = await response.blob()
        }

        // store last fetched neutral base so color-only changes can recompose locally
        try { lastBaseBlobRef.current = blob } catch (e) {}

        

        // Helper to darken/lighten hex color
        function shadeColor(hex, percent) {
          const h = hex.replace(/^#/, '')
          const num = parseInt(h, 16)
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
          const r = parseInt(h.substring(0, 2), 16)
          const g = parseInt(h.substring(2, 4), 16)
          const b = parseInt(h.substring(4, 6), 16)
          return `rgba(${r},${g},${b},${alpha})`
        }

        const processedBlob = await composeMiniIslandFromBlob(blob)
        const url = URL.createObjectURL(processedBlob || blob)
        setBackgroundPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous)
          return url
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }
        setBackgroundPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous)
          return null
        })
      }
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
      const openerClick = (e) => { if (!disabled) setShowState(true) }
      const openerKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); setShowState(true) } }
      const closePicker = () => {
        try { setShowState(false) } catch (e) {}
        try { if (typeof onClose === 'function') onClose() } catch (e) {}
      }
      return (
        <>
          <label htmlFor={`${id}`} className={disabled ? 'is-disabled' : ''}>{label}</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {swatchReplacement ? (
              <div className="disabled-color-replacement">{swatchReplacement}</div>
            ) : (
              <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={`Open ${label} color picker`}
                aria-disabled={disabled ? 'true' : 'false'}
                onClick={openerClick}
                onKeyDown={openerKey}
                  style={{
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
            <div style={modalBackdropStyle} onClick={closePicker}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
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
              </div>
            </div>
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

  function renderBackgroundTab() {
    return (
      <div className="fields-grid two-col-layout">
        <div className={`fields-column${!drawBorder ? ' is-disabled' : ''}`}>
          <label htmlFor="bg-type-input">{translateLabel('theme.background.label')}</label>
          <select
            id="bg-type-input"
            value={gatedControlValue(backgroundType)}
            onChange={(e) => setBackgroundType(e.target.value)}
          >
            {emptyComboOption}
            {backgroundTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <>
            <label htmlFor="texture-input" className={!showTextureOptions ? 'is-disabled' : ''}>{translateLabel('theme.texture.label')}</label>
            <select
              id="texture-input"
              value={gatedControlValue(textureRef)}
              onChange={(e) => setTextureRef(e.target.value)}
              disabled={!showTextureOptions || !hasTextures}
            >
              {emptyComboOption}
              {!hasTextures && (
                <option value="" disabled>
                  {translateLabel('ui.texture.noneAvailable')}
                </option>
              )}
              {textures.map((texture) => {
                const ref = `${texture.artPack}|${texture.name}`
                return (
                  <option key={ref} value={ref}>
                    {texture.name.replace(/\.[^.]+$/, '')} [{texture.artPack}]
                  </option>
                )
              })}
            </select>
          </>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={drawRegionBoundaries}
                onChange={(e) => setDrawRegionBoundaries(e.target.checked)}
              />
              <span>{translateLabel('theme.drawRegionBoundaries')}</span>
            </label>

          

          <div
            className={`control-group${!drawRegionBoundaries ? ' is-disabled' : ''}`}
            style={!drawRegionBoundaries ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            <label htmlFor="region-boundary-style-input">
              {translateLabel('theme.style.label')}
            </label>
            <select
              id="region-boundary-style-input"
              value={gatedControlValue(regionBoundaryStyle)}
              onChange={(e) => setRegionBoundaryStyle(e.target.value)}
              disabled={!drawRegionBoundaries}
            >
              {emptyComboOption}
              {strokeTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <label htmlFor="region-boundary-width-input">
              {translateLabel('theme.regionBoundaryWidth.help')}
            </label>
            <div className="slider-row">
              <input
                id="region-boundary-width-input"
                type="range"
                min={0.5}
                max={10}
                step={0.1}
                value={regionBoundaryWidth}
                onChange={(e) => setRegionBoundaryWidth(Number(e.target.value))}
                disabled={!drawRegionBoundaries}
              />
              <span className="slider-value">{regionBoundaryWidth.toFixed(1)}</span>
            </div>

            {renderColorControl({
              id: 'region-boundary-color',
              label: translateLabel('theme.regionBoundaryColor.title'),
              hexValue: regionBoundaryColorHex,
              onHexChange: setRegionBoundaryColorHex,
              showState: showRegionBoundaryPicker,
              setShowState: setShowRegionBoundaryPicker,
              disabled: !drawRegionBoundaries,
            })}
          </div>

          <div />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={colorizeLand}
              onChange={(e) => setColorizeLand(e.target.checked)}
            />
            <span>{translateLabel('theme.colorLand')}</span>
          </label>

          <div
            className={`control-group${!colorizeLand ? ' is-disabled' : ''}`}
            style={!colorizeLand ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            <label htmlFor="final-land-coloring-input">
              {translateLabel('theme.landColoringMethod.label')}
            </label>
            <select
              id="final-land-coloring-input"
              value={gatedControlValue(finalLandColoringMethod)}
              onChange={(e) => setFinalLandColoringMethod(e.target.value)}
              disabled={!colorizeLand}
            >
              {emptyComboOption}
              {landColoringMethods
                .filter((item) => item.value)
                .map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
            </select>

            {renderColorControl({
              id: 'land-color',
              label: translateLabel('theme.landColor.label'),
              hexValue: landColorHex,
              onHexChange: (hex) => { setLandColorHex(hex); notifyManualChange(); },
              showState: showLandPicker,
              setShowState: setShowLandPicker,
              disabled: !colorizeLand || finalLandColoringMethod === 'ColorPoliticalRegions',
              onClose: () => { try { recomposeUsingLastBase({ landColorHex: landColorHex }) } catch (err) {} },
            })}
          </div>

          <div />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={colorizeOcean}
              onChange={(e) => {
                const v = e.target.checked
                setColorizeOcean(v)
                notifyManualChange()
                // Recompose locally from cached base instead of forcing a network fetch
                try { recomposeUsingLastBase({ colorizeOcean: v }) } catch (err) {}
              }}
            />
            <span>{translateLabel('theme.colorOcean')}</span>
          </label>

          <div
            className={`control-group${!colorizeOcean ? ' is-disabled' : ''}`}
            style={!colorizeOcean ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            {renderColorControl({
              id: 'ocean-color',
              label: translateLabel('theme.oceanColor.label'),
              hexValue: oceanColorHex,
              onHexChange: (hex) => { setOceanColorHex(hex); notifyManualChange(); },
              showState: showOceanPicker,
              setShowState: setShowOceanPicker,
              disabled: !colorizeOcean,
              onClose: () => { try { recomposeUsingLastBase({ oceanColorHex: oceanColorHex }) } catch (err) {} },
            })}
          </div>
        </div>

        <div className="fields-column">
          <label htmlFor="bg-seed-input">{translateLabel('theme.randomSeed.label')}</label>
          <input
            id="bg-seed-input"
            type="text"
            value={gatedControlValue(sanitizeSeedValue(backgroundSeed))}
            onChange={(e) => setBackgroundSeed(e.target.value)}
            placeholder={''}
          />


          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawGridOverlay}
              onChange={(e) => setDrawGridOverlay(e.target.checked)}
            />
            <span>{translateLabel('theme.drawGrid')}</span>
          </label>

          <div
            className={`control-group${!drawGridOverlay ? ' is-disabled' : ''}`}
            style={!drawGridOverlay ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            <label htmlFor="grid-shape-input">{translateLabel('theme.shape.label')}</label>
            <select
              id="grid-shape-input"
              value={gatedControlValue(gridOverlayShape)}
              onChange={(e) => setGridOverlayShape(e.target.value)}
              disabled={!drawGridOverlay}
            >
              {emptyComboOption}
              {gridOverlayShapes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {(() => {
              const shapeVal = gridOverlayShape || ''
              const lower = String(shapeVal).toLowerCase()
              const isVerticalHex = lower.includes('vertical')
              const isVoronoi = lower.includes('voronoi')
              return (
                <>
                  <label htmlFor="grid-rows-input" className={!drawGridOverlay || isVoronoi ? 'is-disabled' : ''}>
                    {isVerticalHex ? translateLabel('theme.columns.label') : translateLabel('theme.rows.label')}
                  </label>
                  <div className="slider-row">
                    <input
                      id="grid-rows-input"
                      type="range"
                      min={4}
                      max={64}
                      step={1}
                      value={gridOverlayRowOrColCount}
                      onChange={(e) => setGridOverlayRowOrColCount(Number(e.target.value))}
                      disabled={!drawGridOverlay || isVoronoi}
                    />
                    <span className="slider-value">{gridOverlayRowOrColCount}</span>
                  </div>
                </>
              )
            })()}

            <label htmlFor="grid-linewidth-input">{translateLabel('theme.lineWidth.label')}</label>
            <div className="slider-row">
              <input
                id="grid-linewidth-input"
                type="range"
                min={1}
                max={10}
                step={1}
                value={gridOverlayLineWidth}
                onChange={(e) => setGridOverlayLineWidth(Number(e.target.value))}
                disabled={!drawGridOverlay}
              />
              <span className="slider-value">{gridOverlayLineWidth}</span>
            </div>

            {renderColorControl({
              id: 'grid-color',
              label: translateLabel('theme.color.label'),
              hexValue: gridOverlayColorHex,
              onHexChange: setGridOverlayColorHex,
              showState: showGridPicker,
              setShowState: setShowGridPicker,
              disabled: !drawGridOverlay,
            })}

            {(() => {
              const shapeVal = gridOverlayShape || ''
              const isVoronoi = String(shapeVal).toLowerCase().includes('voronoi')
              return (
                <>
                  <label htmlFor="grid-xoffset-input" className={!drawGridOverlay || isVoronoi ? 'is-disabled' : ''}>{translateLabel('theme.xOffset.label')}</label>
                  <select id="grid-xoffset-input" value={gatedControlValue(gridOverlayXOffset)} onChange={(e) => setGridOverlayXOffset(e.target.value)} disabled={!drawGridOverlay || isVoronoi}>
                    {emptyComboOption}
                    {gridOverlayOffsets.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="grid-yoffset-input" className={!drawGridOverlay || isVoronoi ? 'is-disabled' : ''}>{translateLabel('theme.yOffset.label')}</label>
                  <select id="grid-yoffset-input" value={gatedControlValue(gridOverlayYOffset)} onChange={(e) => setGridOverlayYOffset(e.target.value)} disabled={!drawGridOverlay || isVoronoi}>
                    {emptyComboOption}
                    {gridOverlayOffsets.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </>
              )
            })()}

            <label className={`checkbox-label${(!drawGridOverlay || !String((gridOverlayShape || '')).toLowerCase().includes('voronoi')) ? ' is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={drawVoronoiGridOverlayOnlyOnLand}
                onChange={(e) => setDrawVoronoiGridOverlayOnlyOnLand(e.target.checked)}
                disabled={!drawGridOverlay || !String((gridOverlayShape || '')).toLowerCase().includes('voronoi')}
              />
              <span>{translateLabel('theme.onlyOnLand')}</span>
            </label>

            <label htmlFor="grid-layer-input">{translateLabel('theme.layer.label')}</label>
            <select id="grid-layer-input" value={gatedControlValue(gridOverlayLayer)} onChange={(e) => setGridOverlayLayer(e.target.value)} disabled={!drawGridOverlay}>
              {emptyComboOption}
              {gridOverlayLayers.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div
            className="background-preview-panel background-preview-panel--full-row"
            role="img"
                aria-label={translateLabel('theme.background.label')}
          >
            {backgroundPreviewUrl ? (
              <img
                className="background-preview-canvas"
                src={backgroundPreviewUrl}
                alt={translateLabel('theme.background.label')}
              />
            ) : (
              <div className="background-preview-canvas background-preview-canvas--empty" />
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderBorderTab() {
    return (
      <div className="fields-grid two-col-layout">
        <div className="fields-column">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawBorder}
              onChange={(e) => setDrawBorder(e.target.checked)}
            />
            <span>{translateLabel('theme.drawBorder')}</span>
          </label>

          <div
            className={`control-group${!drawBorder ? ' is-disabled' : ''}`}
            style={!drawBorder ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            <label htmlFor="border-type-input">{translateLabel('theme.borderType.label')}</label>
            <select
              id="border-type-input"
              value={gatedControlValue(borderRef)}
              onChange={(e) => setBorderRef(e.target.value)}
              disabled={!drawBorder}
            >
            {emptyComboOption}
            <option value="">{translateLabel('theme.borderColor.title')}</option>
            {borderTypes.map((borderType) => {
              const ref = `${borderType.artPack}|${borderType.name}`
              return (
                <option key={ref} value={ref}>
                  {borderType.name} [{borderType.artPack}]
                </option>
              )
            })}
          </select>

          <label htmlFor="border-width-input" className={!drawBorder ? 'is-disabled' : ''}>
            {translateLabel('theme.borderWidth.label')}
          </label>
          <div className="slider-row">
            <input
              id="border-width-input"
              type="range"
              min={0}
              max={600}
              step={1}
              value={borderWidth}
              onChange={(e) => setBorderWidth(Number(e.target.value))}
              disabled={!drawBorder}
            />
            <span className="slider-value">{Math.round(borderWidth)}</span>
          </div>

          <label htmlFor="border-position-input" className={!drawBorder ? 'is-disabled' : ''}>{translateLabel('theme.borderPosition.label')}</label>
          <select
            id="border-position-input"
            value={gatedControlValue(borderPosition)}
            onChange={(e) => setBorderPosition(e.target.value)}
            disabled={!drawBorder}
          >
            {emptyComboOption}
            {borderPositions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label htmlFor="border-color-option-input" className={!drawBorder ? 'is-disabled' : ''}>{translateLabel('theme.borderColor.label')}</label>
            <select
              id="border-color-option-input"
              value={gatedControlValue(borderColorOption)}
              onChange={(e) => setBorderColorOption(e.target.value)}
              disabled={!drawBorder}
            >
            {emptyComboOption}
            {borderColorOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

            {renderColorControl({
              id: 'border-color',
              label: translateLabel('theme.borderColor.title'),
              hexValue: borderColorHex,
              onHexChange: setBorderColorHex,
              showState: showBorderColorPicker,
              setShowState: setShowBorderColorPicker,
              disabled: !drawBorder || borderColorOption !== 'Choose_color',
            })}
            </div>
          </div>

          <div className="fields-column">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={frayedBorder}
              onChange={(e) => setFrayedBorder(e.target.checked)}
            />
            <span>{translateLabel('theme.frayEdges')}</span>
          </label>

          <div
            className={`control-group${!frayedBorder ? ' is-disabled' : ''}`}
            style={!frayedBorder ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            <label htmlFor="frayed-border-blur-input">
              {translateLabel('theme.shadingWidth.label')}
            </label>
            <div className="slider-row">
              <input
                id="frayed-border-blur-input"
                type="range"
                min={0}
                max={500}
                step={1}
                value={frayedBorderBlurLevel}
                onChange={(e) => setFrayedBorderBlurLevel(Number(e.target.value))}
                disabled={!frayedBorder}
              />
              <span className="slider-value">{Math.round(frayedBorderBlurLevel)}</span>
            </div>

            <label htmlFor="frayed-border-size-input">
              {translateLabel('theme.fraySize.label')}
            </label>
            <div className="slider-row">
              <input
                id="frayed-border-size-input"
                type="range"
                min={1}
                max={15}
                step={1}
                value={frayedBorderSize}
                onChange={(e) => setFrayedBorderSize(Number(e.target.value))}
                disabled={!frayedBorder}
              />
              <span className="slider-value">{Math.round(frayedBorderSize)}</span>
            </div>

            <label htmlFor="frayed-border-seed-input">{translateLabel('theme.randomSeed.label')}</label>
            <input
              id="frayed-border-seed-input"
              type="text"
              value={gatedControlValue(sanitizeSeedValue(frayedBorderSeed))}
              onChange={(e) => setFrayedBorderSeed(e.target.value)}
              placeholder={''}
              disabled={!frayedBorder}
            />
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawGrunge}
              onChange={(e) => setDrawGrunge(e.target.checked)}
            />
            <span>{translateLabel('theme.drawGrunge')}</span>
          </label>

          <div
            className={`control-group${!drawGrunge ? ' is-disabled' : ''}`}
            style={!drawGrunge ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            <label htmlFor="grunge-width-input">
              {translateLabel('theme.grungeWidth.help')}
            </label>
            <div className="slider-row">
              <input
                id="grunge-width-input"
                type="range"
                min={0}
                max={2000}
                step={1}
                value={grungeWidth}
                onChange={(e) => setGrungeWidth(Number(e.target.value))}
                disabled={!drawGrunge}
              />
              <span className="slider-value">{Math.round(grungeWidth)}</span>
            </div>

            {renderColorControl({
              id: 'frayed-border-color',
              label: translateLabel('theme.grungeColor.label'),
              hexValue: frayedBorderColorHex,
              onHexChange: setFrayedBorderColorHex,
              showState: showFrayedBorderPicker,
              setShowState: setShowFrayedBorderPicker,
              disabled: !drawGrunge,
            })}
          </div>
        </div>
      </div>
    )
  }

  function renderEffectsTab() {
    return (
      <div className="fields-grid two-col-layout">
        <div className="fields-column">
          <label htmlFor="line-style-input">{translateLabel('theme.lineStyle.label')}</label>
          <select
            id="line-style-input"
            value={gatedControlValue(lineStyle)}
            onChange={(e) => setLineStyle(e.target.value)}
          >
            {emptyComboOption}
            {lineStyles.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label htmlFor="coastline-width-input">
            {translateLabel('theme.coastlineWidth.label')}
          </label>
          <div className="slider-row">
            <input
              id="coastline-width-input"
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={coastlineWidth}
              onChange={(e) => setCoastlineWidth(Number(e.target.value))}
            />
            <span className="slider-value">{coastlineWidth.toFixed(1)}</span>
          </div>

          {renderColorControl({
            id: 'coastline-color',
            label: translateLabel('theme.coastlineColor.label'),
            hexValue: coastlineColorHex,
            onHexChange: setCoastlineColorHex,
            showState: showCoastlinePicker,
            setShowState: setShowCoastlinePicker,
            disabled: false,
          })}

          <label htmlFor="coast-shading-level-input">
            {translateLabel('theme.coastShadingWidth.label')}
          </label>
          <div className="slider-row">
            <input
              id="coast-shading-level-input"
              type="range"
              min={0}
              max={100}
              step={1}
              value={coastShadingLevel}
              onChange={(e) => setCoastShadingLevel(Number(e.target.value))}
            />
            <span className="slider-value">{Math.round(coastShadingLevel)}</span>
          </div>

          <>
            <label htmlFor="coast-shading-alpha-input">
              {translateLabel('theme.coastShadingTransparency.label')}
            </label>
            <div className="slider-row">
              <input
                id="coast-shading-alpha-input"
                type="range"
                min={0}
                max={100}
                step={1}
                value={coastShadingAlpha}
                onChange={(e) => setCoastShadingAlpha(Number(e.target.value))}
                disabled={finalLandColoringMethod === 'SingleColor'}
              />
              <span className="slider-value">{Math.round(coastShadingAlpha)}</span>
            </div>
          </>

          {/* Coast shading color input removed per UI preference */}

          <label htmlFor="ocean-shading-level-input">
            {translateLabel('theme.oceanShadingWidth.label')}
          </label>
          <div className="slider-row">
            <input
              id="ocean-shading-level-input"
              type="range"
              min={0}
              max={100}
              step={1}
              value={oceanShadingLevel}
              onChange={(e) => setOceanShadingLevel(Number(e.target.value))}
            />
            <span className="slider-value">{Math.round(oceanShadingLevel)}</span>
          </div>

            {(() => {
              const shouldReplace = finalLandColoringMethod === 'ColorPoliticalRegions'
              let swatchReplacement = undefined
              if (shouldReplace) {
                try {
                  let txt = translateLabel('theme.coastShadingColor.disabled')
                  // If the translation contains HTML tags (e.g. <html>...)</>, strip them for this small inline replacement
                  if (typeof txt === 'string') {
                    txt = txt.replace(/<[^>]*>/g, '')
                    // MessageFormat uses doubled single-quotes to escape; convert to a single quote for display
                    txt = txt.replace(/''/g, "'")
                  }
                  // Replace placeholder {0} with a human-friendly name for the method
                  const methodLabel = translateLabel(`LandColoringMethod.${finalLandColoringMethod}`)
                  if (typeof txt === 'string' && txt.indexOf('{0}') >= 0) txt = txt.replace('{0}', methodLabel)
                  swatchReplacement = txt
                } catch (e) { swatchReplacement = ('' + translateLabel('theme.coastShadingColor.disabled')).replace(/<[^>]*>/g, '').replace(/''/g, "'") }
              }
              return renderColorControl({
                id: 'ocean-shading-color',
                label: translateLabel('theme.oceanShadingColor.label'),
                hexValue: oceanShadingColorHex,
                onHexChange: setOceanShadingColorHex,
                alphaValue: oceanShadingAlpha,
                onAlphaChange: setOceanShadingAlpha,
                showState: showOceanPicker,
                setShowState: setShowOceanPicker,
                disabled: shouldReplace,
                swatchReplacement,
              })
            })()}
        </div>

        <div className="fields-column">
          <label htmlFor="ocean-waves-type-input">{translateLabel('theme.waveType.label')}</label>
          <select
            id="ocean-waves-type-input"
            value={gatedControlValue(oceanWavesType)}
            onChange={(e) => setOceanWavesType(e.target.value)}
          >
            {emptyComboOption}
            {oceanWaveTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          {/* Hide wave size when concentric waves are selected (concentric uses its own count/size) */}
          <>
            <label htmlFor="ocean-waves-level-input" className={oceanWavesType === concentricWaveValue ? 'is-disabled' : ''}>
              {translateLabel('theme.waveWidth.label')}
            </label>
            <div className="slider-row">
              <input
                id="ocean-waves-level-input"
                type="range"
                min={0}
                max={100}
                step={1}
                value={oceanWavesLevel}
                onChange={(e) => setOceanWavesLevel(Number(e.target.value))}
                disabled={oceanWavesType === concentricWaveValue}
              />
              <span className="slider-value">{Math.round(oceanWavesLevel)}</span>
            </div>
          </>

          {/* Do not show wave color when 'None' wave type is selected */}
          {
            renderColorControl({
              id: 'ocean-waves-color',
              label: translateLabel('theme.waveColor.label'),
              hexValue: oceanWavesColorHex,
              onHexChange: setOceanWavesColorHex,
              alphaValue: oceanWavesAlpha,
              onAlphaChange: setOceanWavesAlpha,
              showState: showOceanWavesPicker,
              setShowState: setShowOceanWavesPicker,
              disabled: oceanWavesType === noneWaveValue,
            })
          }

          {/* Conditionally show concentric-specific controls when concentric waves selected */}
          <>
            <label htmlFor="concentric-wave-count" className={oceanWavesType === concentricWaveValue ? '' : 'is-disabled'}>{translateLabel('theme.waveCount.label')}</label>
            <div className="slider-row">
              <input
                id="concentric-wave-count"
                type="range"
                min={1}
                max={5}
                step={1}
                value={concentricWaveCount}
                onChange={(e) => setConcentricWaveCount(Number(e.target.value))}
                disabled={oceanWavesType !== concentricWaveValue}
              />
              <span className="slider-value">{concentricWaveCount}</span>
            </div>

            <label className={`section-subheading ${oceanWavesType === concentricWaveValue ? '' : 'is-disabled'}`} style={{ marginTop: '0.5rem' }}>Style options:</label>

            <div className="style-options">
              <label className={`checkbox-label ${oceanWavesType === concentricWaveValue ? '' : 'is-disabled'}`}>
                <input type="checkbox" checked={fadeConcentricWaves} onChange={(e) => setFadeConcentricWaves(e.target.checked)} disabled={oceanWavesType !== concentricWaveValue} />
                <span>{translateLabel('theme.fadeOuterWaves.label')}</span>
              </label>

              <label className={`checkbox-label ${oceanWavesType === concentricWaveValue ? '' : 'is-disabled'}`}>
                <input type="checkbox" checked={jitterToConcentricWaves} onChange={(e) => setJitterToConcentricWaves(e.target.checked)} disabled={oceanWavesType !== concentricWaveValue} />
                <span>{translateLabel('theme.jitter.label')}</span>
              </label>

              <label className={`checkbox-label ${oceanWavesType === concentricWaveValue ? '' : 'is-disabled'}`}>
                <input type="checkbox" checked={brokenLinesForConcentricWaves} onChange={(e) => setBrokenLinesForConcentricWaves(e.target.checked)} disabled={oceanWavesType !== concentricWaveValue} />
                <span>{translateLabel('theme.brokenLines.label')}</span>
              </label>
            </div>
          </>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawOceanEffectsInLakes}
              onChange={(e) => setDrawOceanEffectsInLakes(e.target.checked)}
            />
            <span>{translateLabel('theme.drawOceanEffectsInLakes')}</span>
          </label>

              {renderColorControl({
                id: 'river-color',
                label: translateLabel('theme.riverColor.label'),
                hexValue: riverColorHex,
                onHexChange: setRiverColorHex,
                showState: showRiverPicker,
                setShowState: setShowRiverPicker,
                disabled: false,
              })}

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawRoads}
              onChange={(e) => setDrawRoads(e.target.checked)}
            />
            <span>{translateLabel('theme.drawRoads')}</span>
          </label>

          <div
            className={`control-group${!drawRoads ? ' is-disabled' : ''}`}
            style={!drawRoads ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            <label htmlFor="road-style-input">{translateLabel('theme.roadStyle.label')}</label>
            <select
              id="road-style-input"
              value={gatedControlValue(roadStyle)}
              onChange={(e) => setRoadStyle(e.target.value)}
              disabled={!drawRoads}
            >
              {emptyComboOption}
              {strokeTypes && strokeTypes.length > 0
                ? strokeTypes.map((item) => (
                    <option key={item.value || item} value={item.value || item}>
                      {item.label || item}
                    </option>
                  ))
                : emptyComboOption}
            </select>

            <label htmlFor="road-width-input">{translateLabel('theme.roadWidth.label')}</label>
            <div className="slider-row">
              <input
                id="road-width-input"
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={roadWidth}
                onChange={(e) => setRoadWidth(Number(e.target.value))}
                disabled={!drawRoads}
              />
              <span className="slider-value">{Number(roadWidth).toFixed(1)}</span>
            </div>

            {renderColorControl({
              id: 'road-color',
              label: translateLabel('theme.roadColor.label'),
              hexValue: roadColorHex,
              onHexChange: setRoadColorHex,
              showState: showRoadPicker,
              setShowState: setShowRoadPicker,
              disabled: !drawRoads,
            })}
          </div>

          {/* Additional parameter controls (always enabled regardless of Draw roads) */}
          <div className="control-group parameters-group" style={{ marginTop: 8 }}>
            <label htmlFor="mountain-size-input">{translateLabel('theme.mountainSize.label')}</label>
            <div className="slider-row">
              <input
                id="mountain-size-input"
                type="range"
                min={1}
                max={15}
                step={1}
                value={mountainSize}
                onChange={(e) => setMountainSize(Number(e.target.value))}
              />
              <span className="slider-value">{mountainSize}</span>
            </div>

            <label htmlFor="hill-size-input">{translateLabel('theme.hillSize.label')}</label>
            <div className="slider-row">
              <input
                id="hill-size-input"
                type="range"
                min={1}
                max={15}
                step={1}
                value={hillSize}
                onChange={(e) => setHillSize(Number(e.target.value))}
              />
              <span className="slider-value">{hillSize}</span>
            </div>

            <label htmlFor="dune-size-input">{translateLabel('theme.duneSize.label')}</label>
            <div className="slider-row">
              <input
                id="dune-size-input"
                type="range"
                min={1}
                max={15}
                step={1}
                value={duneSize}
                onChange={(e) => setDuneSize(Number(e.target.value))}
              />
              <span className="slider-value">{duneSize}</span>
            </div>

            <label htmlFor="tree-height-input">{translateLabel('theme.treeHeight.label')}</label>
            <div className="slider-row">
              <input
                id="tree-height-input"
                type="range"
                min={1}
                max={15}
                step={1}
                value={treeHeight}
                onChange={(e) => setTreeHeight(Number(e.target.value))}
              />
              <span className="slider-value">{treeHeight}</span>
            </div>

            <label htmlFor="city-size-input">{translateLabel('theme.citySize.label')}</label>
            <div className="slider-row">
              <input
                id="city-size-input"
                type="range"
                min={1}
                max={15}
                step={1}
                value={citySize}
                onChange={(e) => setCitySize(Number(e.target.value))}
              />
              <span className="slider-value">{citySize}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderFontsTab() {
    return (
      <div className="customize-fonts-panel">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={drawText}
            onChange={(e) => setDrawText(e.target.checked)}
          />
          <span>{translateLabel('theme.enableText')}</span>
        </label>
        <div className={`control-group${!drawText ? ' is-disabled' : ''}`}>
          <div className="customize-font-grid">
            <div className="fonts-grid two-col-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24, rowGap: 8, alignItems: 'start' }}>
              <div className="fields-column">
                {fontFields.map((field) => (
                  <React.Fragment key={field.id}>
                    <label htmlFor={field.id}>{field.label}</label>
                    <div className="font-combo" id={field.id}>
                        <button
                        type="button"
                        className="font-combo-trigger"
                        onClick={() => setOpenFontComboId(openFontComboId === field.id ? null : field.id)}
                        style={{ fontFamily: field.value || 'serif' }}
                        aria-haspopup="listbox"
                        aria-expanded={openFontComboId === field.id}
                        disabled={!drawText}
                      >
                        {field.value || translateLabel('common.choose')}
                      </button>
                      {openFontComboId === field.id && (
                        <div className="font-combo-menu">
                          {availableFontFamilies.map((family) => (
                            <button
                              key={family}
                              type="button"
                              className={`font-combo-option${field.value === family ? ' is-selected' : ''}`}
                              data-field-id={field.id}
                              data-family={family}
                              onClick={handleFontOptionClick}
                              style={{ fontFamily: family }}
                              disabled={!drawText}
                            >
                              {family}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div className="fields-column">
                {renderColorControl({
                  id: 'text-color',
                  label: translateLabel('theme.textColor.label'),
                  hexValue: textColorHex,
                  onHexChange: setTextColorHex,
                  showState: showTextColorPicker,
                  setShowState: setShowTextColorPicker,
                  disabled: !drawText,
                  swatchStyle: { flex: '0 0 180px', minWidth: 120 },
                })}

                <label className="checkbox-label" style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={drawBoldBackground}
                    onChange={(e) => setDrawBoldBackground(e.target.checked)}
                    disabled={!drawText}
                  />
                  <span style={{ marginLeft: 8 }}>{translateLabel('theme.boldBackground')}</span>
                </label>

                {renderColorControl({
                  id: 'bold-background-color',
                  label: translateLabel('theme.boldBackgroundColor.label'),
                  hexValue: boldBackgroundColorHex,
                  onHexChange: setBoldBackgroundColorHex,
                  showState: showBoldBackgroundPicker,
                  setShowState: setShowBoldBackgroundPicker,
                  disabled: !drawText || !drawBoldBackground,
                  swatchStyle: { flex: '1 1 auto', minWidth: 48, marginTop: 8 },
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                className={`customize-tab-button${activeTab === tab.id ? ' is-active' : ''}`}
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="customize-tab-panel" role="tabpanel">
            {activeTab === 'background' && renderBackgroundTab()}
            {activeTab === 'border' && renderBorderTab()}
            {activeTab === 'effects' && renderEffectsTab()}
            {activeTab === 'fonts' && renderFontsTab()}
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
  }).isRequired,
}
