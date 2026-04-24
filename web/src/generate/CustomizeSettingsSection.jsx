import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

const TABS = [
  { id: 'background', label: 'Background' },
  { id: 'border', label: 'Border' },
  { id: 'effects', label: 'Effects' },
  { id: 'fonts', label: 'Fonts' },
]

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
  const [debugMode, setDebugMode] = React.useState(false);

  const debugOutlineStyle = debugMode
    ? { outline: '3px dashed magenta', outlineOffset: '6px' }
    : undefined;
  const [activeTab, setActiveTab] = useState('background')
  const [openFontComboId, setOpenFontComboId] = useState(null)
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState(null)

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
    oceanShadingLevel,
    oceanShadingColorHex,
    oceanWavesType,
    oceanWavesLevel,
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
    setOceanShadingLevel,
    setOceanShadingColorHex,
    setOceanWavesType,
    setOceanWavesLevel,
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
    if (labels && Object.prototype.hasOwnProperty.call(labels, key) && labels[key]) {
      return labels[key]
    }
    // If caller asked for a ".label" key but backend only provided the
    // base key (e.g. "theme.fadeOuterWaves"), try that next.
    if (key && key.endsWith('.label')) {
      const alt = key.substring(0, key.length - '.label'.length)
      if (labels && Object.prototype.hasOwnProperty.call(labels, alt) && labels[alt]) {
        return labels[alt]
      }
    }
    return key
  }

  const translateLabelWithArgs = (key, ...args) => {
    let txt = translateLabel(key)
    if (!txt) return txt
    // Simple replacement for {0}, {1} placeholders
    args.forEach((a, i) => {
      txt = txt.replace(new RegExp(`\\{${i}\\}`, 'g'), String(a))
    })
    return txt
  }

  const sanitizeTranslation = (s) => {
    if (!s) return s
    // Remove surrounding <html> wrappers and any tags, then decode doubled single-quotes.
    let t = String(s)
    // Remove leading/trailing <html> tags (case-insensitive)
    t = t.replace(/^\s*<html>\s*/i, '').replace(/\s*<html>\s*$/i, '')
    // Strip any other HTML tags
    t = t.replace(/<[^>]*>/g, '')
    // Replace doubled single-quotes used in translations with a single quote
    t = t.replace(/''/g, "'")
    // Collapse whitespace
    t = t.replace(/\s+/g, ' ').trim()
    return t
  }
  const showTextureOptions = backgroundType === 'GeneratedFromTexture'
  const hasTextures = textures.length > 0
  const hasCustomizationSource = Boolean(
    fileObj ||
    currentSource?.nortContent ||
    (currentSource?.type === 'random' && currentSource?.payload)
  )
  const canSubmit = !loading && hasCustomizationSource
  const gatedControlValue = (value) => (hasCustomizationSource ? value : '')
  const emptyComboOption = hasCustomizationSource ? null : (
    <option value="">{translateLabel('ui.select.random')}</option>
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

    if (!hasNortContentSource && !hasRandomPayloadSource) {
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
        const payload = {
          colorizeLand,
          colorizeOcean,
          oceanColorHex,
          landColorHex,
          previewWidth: 520,
          previewHeight: 170,
        }

        if (hasNortContentSource) {
          payload.nortContent = currentSource.nortContent
        } else if (hasRandomPayloadSource) {
          Object.assign(payload, currentSource.payload)
        }

        if (backgroundType) payload.backgroundType = backgroundType
        if (textureRef) payload.textureRef = textureRef
        if (backgroundSeed) payload.backgroundSeed = Number(backgroundSeed)
        if (finalSeed) payload.seed = Number(finalSeed)

        const response = await fetch(`${API_BASE}/background-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load background preview')
        }

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
    }, 0)

    return () => {
      clearTimeout(timerId)
      controller.abort()
    }
  }, [
    backgroundSeed,
    backgroundType,
    colorizeLand,
    colorizeOcean,
    currentSource?.nortContent,
    currentSource?.payload,
    currentSource?.type,
    finalSeed,
    landColorHex,
    oceanColorHex,
    textureRef,
  ])

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
      <div className="fields-grid two-col-layout" style={debugOutlineStyle}>
        <div className={`fields-column${!drawBorder ? ' is-disabled' : ''}`} style={debugMode ? debugOutlineStyle : undefined}>
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

          {showTextureOptions && (
            <>
              <label htmlFor="texture-input">{translateLabel('theme.texture.label')}</label>
              <select
                id="texture-input"
                value={gatedControlValue(textureRef)}
                onChange={(e) => setTextureRef(e.target.value)}
                disabled={!hasTextures}
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

              <div />
              <label className="checkbox-label checkbox-col2">
                <input
                  type="checkbox"
                  checked={colorizeLand}
                  onChange={(e) => setColorizeLand(e.target.checked)}
                />
                <span>{translateLabel('theme.colorLand')}</span>
              </label>

              <div />
              <label className="checkbox-label checkbox-col2">
                <input
                  type="checkbox"
                  checked={colorizeOcean}
                  onChange={(e) => setColorizeOcean(e.target.checked)}
                />
                <span>{translateLabel('theme.colorOcean')}</span>
              </label>
            </>
          )}

            <label htmlFor="final-land-coloring-input">
            {translateLabel('theme.landColoringMethod.label')}
          </label>
          <select
            id="final-land-coloring-input"
            value={gatedControlValue(finalLandColoringMethod)}
            onChange={(e) => setFinalLandColoringMethod(e.target.value)}
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

          <label htmlFor="region-boundary-style-input">
            {translateLabel('theme.style.label')}
          </label>
          <select
            id="region-boundary-style-input"
            value={gatedControlValue(regionBoundaryStyle)}
            onChange={(e) => setRegionBoundaryStyle(e.target.value)}
          >
            {emptyComboOption}
            {strokeTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label htmlFor="region-boundary-width-input">
            {translateLabel('theme.regionBoundaryWidth.help')}:{' '}
            {regionBoundaryWidth.toFixed(1)}
          </label>
          <input
            id="region-boundary-width-input"
            type="range"
            min={0.5}
            max={10}
            step={0.1}
            value={regionBoundaryWidth}
            onChange={(e) => setRegionBoundaryWidth(Number(e.target.value))}
          />

          <label htmlFor="region-boundary-color-input">
            {translateLabel('theme.regionBoundaryColor.title')}
          </label>
          <input
            id="region-boundary-color-input"
            type="color"
            value={regionBoundaryColorHex}
            onChange={(e) => setRegionBoundaryColorHex(e.target.value)}
          />

          <label htmlFor="land-color-input">{translateLabel('theme.landColor.label')}</label>
          <input
            id="land-color-input"
            type="color"
            value={landColorHex}
            onChange={(e) => setLandColorHex(e.target.value)}
          />

          <label htmlFor="ocean-color-input">{translateLabel('theme.oceanColor.label')}</label>
          <input
            id="ocean-color-input"
            type="color"
            value={oceanColorHex}
            onChange={(e) => setOceanColorHex(e.target.value)}
          />
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

          <label htmlFor="final-width-input">
            {translateLabel('ui.width.override')}
          </label>
          <input
            id="final-width-input"
            type="number"
            min={200}
            value={gatedControlValue(finalWidth)}
            onChange={(e) => setFinalWidth(Number(e.target.value))}
          />

          <label htmlFor="final-height-input">
            {translateLabel('ui.height.override')}
          </label>
          <input
            id="final-height-input"
            type="number"
            min={200}
            value={gatedControlValue(finalHeight)}
            onChange={(e) => setFinalHeight(Number(e.target.value))}
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawRegionBoundaries}
              onChange={(e) => setDrawRegionBoundaries(e.target.checked)}
            />
            <span>{translateLabel('theme.drawRegionBoundaries')}</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawGridOverlay}
              onChange={(e) => setDrawGridOverlay(e.target.checked)}
            />
            <span>{translateLabel('theme.drawGrid')}</span>
          </label>

          <div
            className="background-preview-panel background-preview-panel--full-row"
            role="img"
                aria-label={translateLabel('ui.preview.background.aria')}
          >
            {backgroundPreviewUrl ? (
              <img
                className="background-preview-canvas"
                src={backgroundPreviewUrl}
                alt={translateLabel('ui.preview.background.alt')}
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
            <option value="">{translateLabel('ui.border.keepCurrent')}</option>
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
            {translateLabel('theme.borderWidth.label')}: {Math.round(borderWidth)}
          </label>
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

            {borderColorOption === 'Choose_color' && (
              <>
                <label htmlFor="border-color-input">{translateLabel('theme.borderColor.title')}</label>
                <input
                  id="border-color-input"
                  type="color"
                  value={borderColorHex}
                  onChange={(e) => setBorderColorHex(e.target.value)}
                  disabled={!drawBorder}
                />
              </>
            )}
            </div>
          </div>

          <div className="fields-column" style={debugMode ? debugOutlineStyle : undefined}>
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
              {translateLabel('theme.shadingWidth.label')}: {Math.round(frayedBorderBlurLevel)}
            </label>
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

            <label htmlFor="frayed-border-size-input">
              {translateLabel('theme.fraySize.label')}: {Math.round(frayedBorderSize)}
            </label>
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
              {translateLabel('theme.grungeWidth.help')}: {Math.round(grungeWidth)}
            </label>
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

            <label htmlFor="frayed-border-color-input">{translateLabel('theme.grungeColor.label')}</label>
            <input
              id="frayed-border-color-input"
              type="color"
              value={frayedBorderColorHex}
              onChange={(e) => setFrayedBorderColorHex(e.target.value)}
              disabled={!drawGrunge}
            />
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
            {translateLabel('theme.coastlineWidth.label')}: {coastlineWidth.toFixed(1)}
          </label>
          <input
            id="coastline-width-input"
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={coastlineWidth}
            onChange={(e) => setCoastlineWidth(Number(e.target.value))}
          />

          <label htmlFor="coastline-color-input">
            {translateLabel('theme.coastlineColor.label')}
          </label>
          <input
            id="coastline-color-input"
            type="color"
            value={coastlineColorHex}
            onChange={(e) => setCoastlineColorHex(e.target.value)}
          />

          <label htmlFor="coast-shading-level-input">
            {translateLabel('theme.coastShadingWidth.label')}: {Math.round(coastShadingLevel)}
          </label>
          <input
            id="coast-shading-level-input"
            type="range"
            min={0}
            max={100}
            step={1}
            value={coastShadingLevel}
            onChange={(e) => setCoastShadingLevel(Number(e.target.value))}
          />

          {finalLandColoringMethod !== 'SingleColor' && (
            <>
              <label htmlFor="coast-shading-alpha-input">
                {translateLabel('theme.coastShadingTransparency.label')}:{' '}
                {Math.round(coastShadingAlpha)}
              </label>
              <input
                id="coast-shading-alpha-input"
                type="range"
                min={0}
                max={100}
                step={1}
                value={coastShadingAlpha}
                onChange={(e) => setCoastShadingAlpha(Number(e.target.value))}
              />
            </>
          )}

          <label htmlFor="coast-shading-color-input">
            {translateLabel('theme.coastShadingColor.label')}
          </label>
          {finalLandColoringMethod === 'ColorPoliticalRegions' ? (
            <div className="disabled-note" aria-live="polite">
              {sanitizeTranslation(
                translateLabelWithArgs(
                  'theme.coastShadingColor.disabled',
                  landColoringMethods.find((m) => m && m.value === finalLandColoringMethod)?.label || finalLandColoringMethod
                )
              )}
            </div>
          ) : (
            <input
              id="coast-shading-color-input"
              type="color"
              value={coastShadingColorHex}
              onChange={(e) => setCoastShadingColorHex(e.target.value)}
            />
          )}

          <label htmlFor="ocean-shading-level-input">
            {translateLabel('theme.oceanShadingWidth.label')}: {Math.round(oceanShadingLevel)}
          </label>
          <input
            id="ocean-shading-level-input"
            type="range"
            min={0}
            max={100}
            step={1}
            value={oceanShadingLevel}
            onChange={(e) => setOceanShadingLevel(Number(e.target.value))}
          />

          <label htmlFor="ocean-shading-color-input">
            {translateLabel('theme.oceanShadingColor.label')}
          </label>
          <input
            id="ocean-shading-color-input"
            type="color"
            value={oceanShadingColorHex}
            onChange={(e) => setOceanShadingColorHex(e.target.value)}
          />
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
          {oceanWavesType !== concentricWaveValue && (
            <>
              <label htmlFor="ocean-waves-level-input">
                {translateLabel('theme.waveWidth.label')}: {Math.round(oceanWavesLevel)}
              </label>
              <input
                id="ocean-waves-level-input"
                type="range"
                min={0}
                max={100}
                step={1}
                value={oceanWavesLevel}
                onChange={(e) => setOceanWavesLevel(Number(e.target.value))}
              />
            </>
          )}

          {/* Do not show wave color when 'None' wave type is selected */}
          {oceanWavesType !== noneWaveValue && (
            <>
              <label htmlFor="ocean-waves-color-input">{translateLabel('theme.waveColor.label')}</label>
              <input
                id="ocean-waves-color-input"
                type="color"
                value={oceanWavesColorHex}
                onChange={(e) => setOceanWavesColorHex(e.target.value)}
              />
            </>
          )}

          {/* Conditionally show concentric-specific controls when concentric waves selected */}
          {oceanWavesType === concentricWaveValue && (
            <div className="concentric-options">
              <label htmlFor="concentric-wave-count">{translateLabel('theme.waveCount.label')}: {concentricWaveCount}</label>
              <input
                id="concentric-wave-count"
                type="range"
                min={1}
                max={5}
                step={1}
                value={concentricWaveCount}
                onChange={(e) => setConcentricWaveCount(Number(e.target.value))}
              />

              <label className="checkbox-label">
                <input type="checkbox" checked={fadeConcentricWaves} onChange={(e) => setFadeConcentricWaves(e.target.checked)} />
                <span>{translateLabel('theme.fadeOuterWaves.label')}</span>
              </label>

              <label className="checkbox-label">
                <input type="checkbox" checked={jitterToConcentricWaves} onChange={(e) => setJitterToConcentricWaves(e.target.checked)} />
                <span>{translateLabel('theme.jitter.label')}</span>
              </label>

              <label className="checkbox-label">
                <input type="checkbox" checked={brokenLinesForConcentricWaves} onChange={(e) => setBrokenLinesForConcentricWaves(e.target.checked)} />
                <span>{translateLabel('theme.brokenLines.label')}</span>
              </label>
            </div>
          )}

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawOceanEffectsInLakes}
              onChange={(e) => setDrawOceanEffectsInLakes(e.target.checked)}
            />
            <span>{translateLabel('theme.drawOceanEffectsInLakes')}</span>
          </label>

          <label htmlFor="river-color-input">{translateLabel('theme.riverColor.label')}</label>
          <input
            id="river-color-input"
            type="color"
            value={riverColorHex}
            onChange={(e) => setRiverColorHex(e.target.value)}
          />

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
            <label htmlFor="road-style-input">{translateLabel('theme.roadStyle.label') || 'Style:'}</label>
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

            <label htmlFor="road-width-input">{translateLabel('theme.roadWidth.label') || 'Width:'} {Number(roadWidth).toFixed(1)}</label>
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

            <label htmlFor="road-color-input">{translateLabel('theme.roadColor.label') || 'Color:'}</label>
            <input
              id="road-color-input"
              type="color"
              value={roadColorHex}
              onChange={(e) => setRoadColorHex(e.target.value)}
              disabled={!drawRoads}
            />
          </div>

          {/* Additional parameter controls (always enabled regardless of Draw roads) */}
          <div className="control-group parameters-group" style={{ marginTop: 8 }}>
            <label htmlFor="mountain-size-input">{translateLabel('theme.mountainSize.label') || 'Mountain size:'} {mountainSize}</label>
            <input
              id="mountain-size-input"
              type="range"
              min={1}
              max={15}
              step={1}
              value={mountainSize}
              onChange={(e) => setMountainSize(Number(e.target.value))}
            />

            <label htmlFor="hill-size-input">{translateLabel('theme.hillSize.label') || 'Hill size:'} {hillSize}</label>
            <input
              id="hill-size-input"
              type="range"
              min={1}
              max={15}
              step={1}
              value={hillSize}
              onChange={(e) => setHillSize(Number(e.target.value))}
            />

            <label htmlFor="dune-size-input">{translateLabel('theme.duneSize.label') || 'Dune size:'} {duneSize}</label>
            <input
              id="dune-size-input"
              type="range"
              min={1}
              max={15}
              step={1}
              value={duneSize}
              onChange={(e) => setDuneSize(Number(e.target.value))}
            />

            <label htmlFor="tree-height-input">{translateLabel('theme.treeHeight.label') || 'Tree height:'} {treeHeight}</label>
            <input
              id="tree-height-input"
              type="range"
              min={1}
              max={15}
              step={1}
              value={treeHeight}
              onChange={(e) => setTreeHeight(Number(e.target.value))}
            />

            <label htmlFor="city-size-input">{translateLabel('theme.citySize.label') || 'City size:'} {citySize}</label>
            <input
              id="city-size-input"
              type="range"
              min={1}
              max={15}
              step={1}
              value={citySize}
              onChange={(e) => setCitySize(Number(e.target.value))}
            />
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

            <label htmlFor="text-color-input">{translateLabel('theme.textColor.label')}</label>
            <input
              id="text-color-input"
              type="color"
              value={textColorHex}
              onChange={(e) => setTextColorHex(e.target.value)}
              disabled={!drawText}
            />

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={drawBoldBackground}
                onChange={(e) => setDrawBoldBackground(e.target.checked)}
                disabled={!drawText}
              />
              <span>
                {translateLabel('theme.boldBackground')}
              </span>
            </label>
            <div />

            <label htmlFor="bold-background-color-input">
              {translateLabel('theme.boldBackgroundColor.label')}
            </label>
            <input
              id="bold-background-color-input"
              type="color"
              value={boldBackgroundColorHex}
              onChange={(e) => setBoldBackgroundColorHex(e.target.value)}
              disabled={!drawText || !drawBoldBackground}
            />
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
        <label className="checkbox-label" style={{ marginLeft: 8, fontSize: '0.9rem' }}>
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
          />
          <span>Debug UI</span>
        </label>
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
              disabled={!canSubmit}
              onClick={handleGenerateAndSaveNort}
            >
              {translateLabel('ui.button.downloadSettings')}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={loading || !preview?.url}
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
