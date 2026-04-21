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
    drawOceanEffectsInLakes,
    riverColorHex,
    drawRoads,
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

  const { textures, borderTypes } = options
  const { loading } = ui
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
    <option value="">Set .nort or generate map first</option>
  )

  const fontFields = useMemo(
    () => [
      {
        id: 'title-font-family-input',
        label: 'Title font',
        value: titleFontFamily,
        onChange: setTitleFontFamily,
      },
      {
        id: 'region-font-family-input',
        label: 'Region font',
        value: regionFontFamily,
        onChange: setRegionFontFamily,
      },
      {
        id: 'mountain-range-font-family-input',
        label: 'Mountain range font',
        value: mountainRangeFontFamily,
        onChange: setMountainRangeFontFamily,
      },
      {
        id: 'other-mountains-font-family-input',
        label: 'Other mountains font',
        value: otherMountainsFontFamily,
        onChange: setOtherMountainsFontFamily,
      },
      {
        id: 'cities-font-family-input',
        label: 'Cities font',
        value: citiesFontFamily,
        onChange: setCitiesFontFamily,
      },
      {
        id: 'river-font-family-input',
        label: 'River/lake font',
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
      <div className="fields-grid two-col-layout">
        <div className="fields-column">
          <label htmlFor="bg-type-input">Background</label>
          <select
            id="bg-type-input"
            value={gatedControlValue(backgroundType)}
            onChange={(e) => setBackgroundType(e.target.value)}
          >
            {emptyComboOption}
            <option value="FractalNoise">Fractal noise</option>
            <option value="GeneratedFromTexture">Generated from texture</option>
            <option value="SolidColor">Solid color</option>
          </select>

          {showTextureOptions && (
            <>
              <label htmlFor="texture-input">Texture</label>
              <select
                id="texture-input"
                value={gatedControlValue(textureRef)}
                onChange={(e) => setTextureRef(e.target.value)}
                disabled={!hasTextures}
              >
                {emptyComboOption}
                <option value="">Keep current texture</option>
                {!hasTextures && (
                  <option value="" disabled>
                    No textures available
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
                <span>Color land</span>
              </label>

              <div />
              <label className="checkbox-label checkbox-col2">
                <input
                  type="checkbox"
                  checked={colorizeOcean}
                  onChange={(e) => setColorizeOcean(e.target.checked)}
                />
                <span>Color ocean</span>
              </label>
            </>
          )}

          <label htmlFor="final-land-coloring-input">Land coloring method</label>
          <select
            id="final-land-coloring-input"
            value={gatedControlValue(finalLandColoringMethod)}
            onChange={(e) => setFinalLandColoringMethod(e.target.value)}
          >
            {emptyComboOption}
            <option value="SingleColor">Single color</option>
            <option value="ColorPoliticalRegions">Color political regions</option>
          </select>

          <label htmlFor="region-boundary-style-input">Political boundary style</label>
          <select
            id="region-boundary-style-input"
            value={gatedControlValue(regionBoundaryStyle)}
            onChange={(e) => setRegionBoundaryStyle(e.target.value)}
          >
            {emptyComboOption}
            <option value="Solid">Solid</option>
            <option value="Dashes">Dashes</option>
            <option value="Rounded_Dashes">Rounded dashes</option>
            <option value="Dots">Dots</option>
          </select>

          <label htmlFor="region-boundary-width-input">
            Political boundary width: {regionBoundaryWidth.toFixed(1)}
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

          <label htmlFor="region-boundary-color-input">Political boundary color</label>
          <input
            id="region-boundary-color-input"
            type="color"
            value={regionBoundaryColorHex}
            onChange={(e) => setRegionBoundaryColorHex(e.target.value)}
          />

          <label htmlFor="land-color-input">Land color</label>
          <input
            id="land-color-input"
            type="color"
            value={landColorHex}
            onChange={(e) => setLandColorHex(e.target.value)}
          />

          <label htmlFor="ocean-color-input">Ocean color</label>
          <input
            id="ocean-color-input"
            type="color"
            value={oceanColorHex}
            onChange={(e) => setOceanColorHex(e.target.value)}
          />
        </div>

        <div className="fields-column">
          <label htmlFor="bg-seed-input">Background seed</label>
          <input
            id="bg-seed-input"
            type="text"
            value={gatedControlValue(backgroundSeed)}
            onChange={(e) => setBackgroundSeed(e.target.value)}
            placeholder={hasCustomizationSource ? 'Matches world seed when empty' : ''}
          />

          <label htmlFor="final-seed-input">World seed override</label>
          <input
            id="final-seed-input"
            type="text"
            value={gatedControlValue(finalSeed)}
            onChange={(e) => setFinalSeed(e.target.value)}
            placeholder={hasCustomizationSource ? 'Keeps all random seeds aligned' : ''}
          />

          <label htmlFor="final-width-input">Width override</label>
          <input
            id="final-width-input"
            type="number"
            min={200}
            value={gatedControlValue(finalWidth)}
            onChange={(e) => setFinalWidth(Number(e.target.value))}
          />

          <label htmlFor="final-height-input">Height override</label>
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
            <span>Draw political region boundaries</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawGridOverlay}
              onChange={(e) => setDrawGridOverlay(e.target.checked)}
            />
            <span>Draw grid</span>
          </label>

          <div
            className="background-preview-panel background-preview-panel--full-row"
            role="img"
            aria-label="Background preview"
          >
            {backgroundPreviewUrl ? (
              <img
                className="background-preview-canvas"
                src={backgroundPreviewUrl}
                alt="Background preview"
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
            <span>Draw border</span>
          </label>

          <label htmlFor="border-type-input">Type</label>
          <select
            id="border-type-input"
            value={gatedControlValue(borderRef)}
            onChange={(e) => setBorderRef(e.target.value)}
          >
            {emptyComboOption}
            <option value="">Keep current border</option>
            {borderTypes.map((borderType) => {
              const ref = `${borderType.artPack}|${borderType.name}`
              return (
                <option key={ref} value={ref}>
                  {borderType.name} [{borderType.artPack}]
                </option>
              )
            })}
          </select>

          <label htmlFor="border-width-input">Width: {Math.round(borderWidth)}</label>
          <input
            id="border-width-input"
            type="range"
            min={0}
            max={600}
            step={1}
            value={borderWidth}
            onChange={(e) => setBorderWidth(Number(e.target.value))}
          />

          <label htmlFor="border-position-input">Position</label>
          <select
            id="border-position-input"
            value={gatedControlValue(borderPosition)}
            onChange={(e) => setBorderPosition(e.target.value)}
          >
            {emptyComboOption}
            <option value="Outside_map">Outside map</option>
            <option value="Over_map">Over map</option>
          </select>

          <label htmlFor="border-color-option-input">Color</label>
          <select
            id="border-color-option-input"
            value={gatedControlValue(borderColorOption)}
            onChange={(e) => setBorderColorOption(e.target.value)}
          >
            {emptyComboOption}
            <option value="Ocean_color">Ocean color</option>
            <option value="Choose_color">Choose color</option>
          </select>

          {borderColorOption === 'Choose_color' && (
            <>
              <label htmlFor="border-color-input">Border color</label>
              <input
                id="border-color-input"
                type="color"
                value={borderColorHex}
                onChange={(e) => setBorderColorHex(e.target.value)}
              />
            </>
          )}
        </div>

        <div className="fields-column">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={frayedBorder}
              onChange={(e) => setFrayedBorder(e.target.checked)}
            />
            <span>Fray edges</span>
          </label>

          <label htmlFor="frayed-border-blur-input">
            Shading width: {Math.round(frayedBorderBlurLevel)}
          </label>
          <input
            id="frayed-border-blur-input"
            type="range"
            min={0}
            max={500}
            step={1}
            value={frayedBorderBlurLevel}
            onChange={(e) => setFrayedBorderBlurLevel(Number(e.target.value))}
          />

          <label htmlFor="frayed-border-size-input">
            Fray size: {Math.round(frayedBorderSize)}
          </label>
          <input
            id="frayed-border-size-input"
            type="range"
            min={1}
            max={15}
            step={1}
            value={frayedBorderSize}
            onChange={(e) => setFrayedBorderSize(Number(e.target.value))}
          />

          <label htmlFor="frayed-border-seed-input">Random seed</label>
          <input
            id="frayed-border-seed-input"
            type="text"
            value={gatedControlValue(frayedBorderSeed)}
            onChange={(e) => setFrayedBorderSeed(e.target.value)}
            placeholder={hasCustomizationSource ? 'Matches world seed when empty' : ''}
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawGrunge}
              onChange={(e) => setDrawGrunge(e.target.checked)}
            />
            <span>Draw grunge</span>
          </label>

          <label htmlFor="grunge-width-input">Width: {Math.round(grungeWidth)}</label>
          <input
            id="grunge-width-input"
            type="range"
            min={0}
            max={2000}
            step={1}
            value={grungeWidth}
            onChange={(e) => setGrungeWidth(Number(e.target.value))}
          />

          <label htmlFor="frayed-border-color-input">Grunge/fray edge color</label>
          <input
            id="frayed-border-color-input"
            type="color"
            value={frayedBorderColorHex}
            onChange={(e) => setFrayedBorderColorHex(e.target.value)}
          />
        </div>
      </div>
    )
  }

  function renderEffectsTab() {
    return (
      <div className="fields-grid two-col-layout">
        <div className="fields-column">
          <label htmlFor="line-style-input">Line style</label>
          <select
            id="line-style-input"
            value={gatedControlValue(lineStyle)}
            onChange={(e) => setLineStyle(e.target.value)}
          >
            {emptyComboOption}
            <option value="Jagged">Jagged</option>
            <option value="Splines">Splines</option>
            <option value="SplinesWithSmoothedCoastlines">Splines with smoothed coastlines</option>
          </select>

          <label htmlFor="coastline-width-input">
            Coastline width: {coastlineWidth.toFixed(1)}
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

          <label htmlFor="coastline-color-input">Coastline color</label>
          <input
            id="coastline-color-input"
            type="color"
            value={coastlineColorHex}
            onChange={(e) => setCoastlineColorHex(e.target.value)}
          />

          <label htmlFor="coast-shading-level-input">
            Coast shading width: {Math.round(coastShadingLevel)}
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

          <label htmlFor="coast-shading-alpha-input">
            Coast shading transparency: {Math.round(coastShadingAlpha)}
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

          <label htmlFor="coast-shading-color-input">Coast shading color</label>
          <input
            id="coast-shading-color-input"
            type="color"
            value={coastShadingColorHex}
            onChange={(e) => setCoastShadingColorHex(e.target.value)}
            disabled={finalLandColoringMethod === 'ColorPoliticalRegions'}
          />

          <label htmlFor="ocean-shading-level-input">
            Ocean shading width: {Math.round(oceanShadingLevel)}
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

          <label htmlFor="ocean-shading-color-input">Ocean shading color</label>
          <input
            id="ocean-shading-color-input"
            type="color"
            value={oceanShadingColorHex}
            onChange={(e) => setOceanShadingColorHex(e.target.value)}
          />
        </div>

        <div className="fields-column">
          <label htmlFor="ocean-waves-type-input">Wave type</label>
          <select
            id="ocean-waves-type-input"
            value={gatedControlValue(oceanWavesType)}
            onChange={(e) => setOceanWavesType(e.target.value)}
          >
            {emptyComboOption}
            <option value="ConcentricWaves">Concentric waves</option>
            <option value="Ripples">Ripples</option>
            <option value="None">None</option>
          </select>

          <label htmlFor="ocean-waves-level-input">Wave width: {Math.round(oceanWavesLevel)}</label>
          <input
            id="ocean-waves-level-input"
            type="range"
            min={0}
            max={100}
            step={1}
            value={oceanWavesLevel}
            onChange={(e) => setOceanWavesLevel(Number(e.target.value))}
          />

          <label htmlFor="ocean-waves-color-input">Wave color</label>
          <input
            id="ocean-waves-color-input"
            type="color"
            value={oceanWavesColorHex}
            onChange={(e) => setOceanWavesColorHex(e.target.value)}
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawOceanEffectsInLakes}
              onChange={(e) => setDrawOceanEffectsInLakes(e.target.checked)}
            />
            <span>Draw ocean waves/shading in lakes</span>
          </label>

          <label htmlFor="river-color-input">River color</label>
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
            <span>Draw roads</span>
          </label>
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
          <span>Enable text</span>
        </label>

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
                >
                  {field.value || 'Keep current'}
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
                    >
                      Keep current
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
                      >
                        {family}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
          ))}

          <label htmlFor="text-color-input">Text color</label>
          <input
            id="text-color-input"
            type="color"
            value={textColorHex}
            onChange={(e) => setTextColorHex(e.target.value)}
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={drawBoldBackground}
              onChange={(e) => setDrawBoldBackground(e.target.checked)}
            />
            <span>Bold background for region and title names</span>
          </label>
          <div />

          <label htmlFor="bold-background-color-input">Bold background color</label>
          <input
            id="bold-background-color-input"
            type="color"
            value={boldBackgroundColorHex}
            onChange={(e) => setBoldBackgroundColorHex(e.target.value)}
          />
        </div>
      </div>
    )
  }

  return (
    <section
      className={`generator-section customize-section${hasCustomizationSource ? '' : ' is-disabled'}`}
    >
      <h3>Customize Map</h3>
      <p className="section-hint">Customize the current settings and generate an updated map.</p>
      {!hasCustomizationSource && (
        <p className="section-hint">
          Upload a settings file or generate a map first to enable customization controls.
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
                aria-label="Open map preview modal"
              >
                <img src={preview.url} alt="Generated map preview" />
              </button>
            ) : (
              <div className="settings-inline-preview-empty">Preview map will appear here</div>
            )}
          </div>
        </div>

        <fieldset className="customize-disabled-fieldset" disabled={!hasCustomizationSource}>
          <div className="customize-tabs" role="tablist" aria-label="Customization sections">
            {TABS.map((tab) => (
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
              {loading ? 'Generating…' : 'Regenerate'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!canSubmit}
              onClick={handleGenerateAndSaveNort}
            >
              {loading ? 'Generating…' : 'Download Settings'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={loading || !preview?.url}
              onClick={handleDownloadMap}
            >
              Download Map
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
