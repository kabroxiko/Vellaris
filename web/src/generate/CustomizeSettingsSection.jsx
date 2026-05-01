import React, { useEffect, useMemo, useState } from 'react'
import { RgbaColorPicker } from 'react-colorful'
import PropTypes from 'prop-types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const FONT_FAMILY_OPTIONS = [
  'Apple Chancery',
  'Gabriola',
  'Z003',
  'Cinzel',
  'Merriweather',
  'Times New Roman',
  'Georgia',
  'Garamond',
  'Palatino Linotype',
  'Book Antiqua',
  'Serif',
]

export default function CustomizeSettingsSection({ values, handlers, options, ui }) {

  const [activeTab, setActiveTab] = useState('background')
  const [openFontComboId, setOpenFontComboId] = useState(null)
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState(null)
  const [previewRefreshNonce, setPreviewRefreshNonce] = useState(0)

  // Testing override: set to true to force the Customize panel enabled
  // regardless of having an uploaded .nort source. Remove or set to false
  // for normal behavior.
  const FORCE_ENABLE_CUSTOMIZE = true

  useEffect(() => {
    try {
      console.log('background-preview effect start', {
        previewTriggerKey,
        currentSource,
        previewFieldsPreviewSample: Object.keys(previewFields).slice(0, 8),
      })
    } catch (e) {}
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
      drawRegionBoundaries,
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
    drawRegionBoundaries,
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

  // Use previewFields as the serialized key so any change triggers the effect
  const previewTriggerKey = useMemo(() => {
    try {
      return JSON.stringify(previewFields)
    } catch (e) {
      return ''
    }
  }, [previewFields])

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
  const tabs = (backendOptions.tabs || TABS).map((tab) => ({
    id: tab.id || tab.value,
    label: tab.label,
  }))
  const landColoringMethods = backendOptions.landColoringMethods || []
  const gridOverlayShapes = backendOptions.gridOverlayShapes || []
  const gridOverlayOffsets = backendOptions.gridOverlayOffsets || []
  const gridOverlayLayers = backendOptions.gridOverlayLayers || []
  const backgroundTypes = backendOptions.backgroundTypes || []
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

  const availableFontFamilies = useMemo(() => {
    const loadedFonts = fontFields
      .map((field) => field.value?.trim())
      .filter((value) => value && value.length > 0)

    return Array.from(new Set([...FONT_FAMILY_OPTIONS, ...loadedFonts]))
  }, [fontFields])

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
        try { console.log('using __prefetchedBackgroundPreviewBlob') } catch (e) {}
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
      try { console.log('background-preview: no source present, clearing previewUrl and returning', { hasCustomizationSource, hasRandomPayloadSource }) } catch (e) {}
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
        const allowedPreviewKeys = [
          'drawRegionBoundaries',
          'colorizeLand',
          'landColorHex',
          'colorizeOcean',
          'oceanColorHex',
        ]

        const normalizedPreviewFields = {}
        allowedPreviewKeys.forEach((k) => {
          const v = previewFields[k]
          normalizedPreviewFields[k] = v === undefined ? null : v
        })

        const payload = Object.assign({ previewWidth: 520, previewHeight: 170 }, normalizedPreviewFields)

        if (hasRandomPayloadSource) {
          Object.assign(payload, currentSource.payload)
        }

        // Dev log: show the exact payload sent to the background-preview
        try {
          console.log('background-preview payload', payload)
        } catch (e) {}

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

        const response = await doFetchWithRetries(`${API_BASE}/background-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }, 3, 300)

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setBackgroundPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous)
          return url
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }
        console.error('Failed to load background preview:', error)
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

    function renderColorControl({ id, label, hexValue, onHexChange, alphaValue, onAlphaChange, disabled, showState, setShowState, swatchStyle }) {
      const openerClick = (e) => { if (!disabled) setShowState(true) }
      const openerKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); setShowState(true) } }
      return (
        <>
          <label htmlFor={`${id}`} className={disabled ? 'is-disabled' : ''}>{label}</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
          </div>
          {showState && (
            <div style={modalBackdropStyle} onClick={() => setShowState(false)}>
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
                  <button type="button" onClick={() => setShowState(false)}>
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
              <option value="">
                {translateLabel('ui.texture.keepCurrent')}
              </option>
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
              onHexChange: setLandColorHex,
              showState: showLandPicker,
              setShowState: setShowLandPicker,
              disabled: !colorizeLand || finalLandColoringMethod === 'ColorPoliticalRegions',
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
                triggerPreviewRefresh()
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
              onHexChange: (hex) => { setOceanColorHex(hex); notifyManualChange(); triggerPreviewRefresh() },
              showState: showOceanPicker,
              setShowState: setShowOceanPicker,
              disabled: !colorizeOcean,
            })}
          </div>
        </div>

        <div className="fields-column">
          <label htmlFor="bg-seed-input">{translateLabel('theme.randomSeed.label')}</label>
          <input
            id="bg-seed-input"
            type="text"
            value={gatedControlValue(backgroundSeed)}
            onChange={(e) => setBackgroundSeed(e.target.value)}
            placeholder={
              hasCustomizationSource
                ? translateLabel('theme.randomSeed.label')
                : ''
            }
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
              value={gatedControlValue(frayedBorderSeed)}
              onChange={(e) => setFrayedBorderSeed(e.target.value)}
              placeholder={hasCustomizationSource ? 'Matches world seed when empty' : ''}
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

          <label htmlFor="coast-shading-color-input">
            {translateLabel('theme.coastShadingColor.label')}
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              role="button"
              aria-label="Open coast shading color picker"
              onClick={() => setShowCoastPicker(true)}
              style={{
                width: 36,
                height: 24,
                background: coastShadingColorHex || '#000000',
                border: '1px solid #bbb',
                cursor: finalLandColoringMethod === 'ColorPoliticalRegions' ? 'default' : 'pointer',
                opacity: finalLandColoringMethod === 'ColorPoliticalRegions' ? 0.5 : 1,
              }}
            />
            <input
              id="coast-shading-color-input"
              type="text"
              value={coastShadingColorHex}
              onChange={(e) => setCoastShadingColorHex(e.target.value)}
              disabled={finalLandColoringMethod === 'ColorPoliticalRegions'}
            />

            {showCoastPicker && (
              <div style={modalBackdropStyle} onClick={() => setShowCoastPicker(false)}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                  <RgbaColorPicker
                    color={hexToRgba(coastShadingColorHex, coastShadingAlpha)}
                    onChange={(col) => {
                      const hex = rgbaToHex(col)
                      setCoastShadingColorHex(hex)
                      setCoastShadingAlpha(Math.round((1 - (col.a ?? 1)) * 100))
                    }}
                  />
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowCoastPicker(false)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

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

          {renderColorControl({
            id: 'ocean-shading-color',
            label: translateLabel('theme.oceanShadingColor.label'),
            hexValue: oceanShadingColorHex,
            onHexChange: setOceanShadingColorHex,
            alphaValue: oceanShadingAlpha,
            onAlphaChange: setOceanShadingAlpha,
            showState: showOceanPicker,
            setShowState: setShowOceanPicker,
            disabled: false,
          })}
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
            <label htmlFor="ocean-waves-level-input">
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
            <label htmlFor="concentric-wave-count">{translateLabel('theme.waveCount.label')}</label>
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

            <label className="checkbox-label">
              <input type="checkbox" checked={fadeConcentricWaves} onChange={(e) => setFadeConcentricWaves(e.target.checked)} disabled={oceanWavesType !== concentricWaveValue} />
              <span>{translateLabel('theme.fadeOuterWaves.label')}</span>
            </label>

            <label className="checkbox-label">
              <input type="checkbox" checked={jitterToConcentricWaves} onChange={(e) => setJitterToConcentricWaves(e.target.checked)} disabled={oceanWavesType !== concentricWaveValue} />
              <span>{translateLabel('theme.jitter.label')}</span>
            </label>

            <label className="checkbox-label">
              <input type="checkbox" checked={brokenLinesForConcentricWaves} onChange={(e) => setBrokenLinesForConcentricWaves(e.target.checked)} disabled={oceanWavesType !== concentricWaveValue} />
              <span>{translateLabel('theme.brokenLines.label')}</span>
            </label>
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
                        {field.value || translateLabel('ui.font.keepCurrent')}
                      </button>
                      {openFontComboId === field.id && (
                        <div className="font-combo-menu">
                          <button
                            type="button"
                            className={`font-combo-option${field.value === '' ? ' is-selected' : ''}`}
                            data-field-id={field.id}
                            data-family=""
                            onClick={handleFontOptionClick}
                            style={{ fontFamily: 'serif' }}
                            disabled={!drawText}
                          >
                            {translateLabel('ui.font.keepCurrent')}
                          </button>
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
        onSubmit={handleGenerateFromSettings}
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
