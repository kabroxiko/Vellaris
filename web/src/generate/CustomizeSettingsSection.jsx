import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { RgbaColorPicker } from 'react-colorful'
import PropTypes from 'prop-types'
import BackgroundTab from './tabs/BackgroundTab'
import BorderTab from './tabs/BorderTab'
import EffectsTab from './tabs/EffectsTab'
import FontsTab from './tabs/FontsTab'
import useCustomizePreview from './hooks/useCustomizePreview'
import useAutoPreview from './hooks/useAutoPreview'
import backgroundBaseCache from './backgroundBaseCache'
import { pick } from './customizeHelpers'
import { parseColorChannels, colorToHexWithAlpha } from './utils'
// Re-export `ColorPickerModal` from its own module so tests can import it
export { default as ColorPickerModal } from './ColorPickerModal'

// Re-export payload/preview helpers from the dedicated module for tests and compatibility
export {
  pickDefaultTexture,
  resolveRawTextureRef,
  buildPreviewPayload,
} from './CustomizePreviewHelpers'

// Helpers for runtime bundled font registration. Kept module-scoped
// so the main component's cognitive complexity stays low.
const _isDocumentAvailable = () => typeof document !== 'undefined' && document?.head

const _extractBundled = (fontsMap) => {
  if (!fontsMap || typeof fontsMap !== 'object') return null
  return Object.fromEntries(
    Object.entries(fontsMap).filter(([k, v]) => typeof v === 'string' && v.startsWith('/fonts/'))
  )
}




const _inferFontMeta = (url, family) => {
  try {
    const raw = String(url || '')
    const fnameEnc = raw.split('/').pop() || ''
    const fname = decodeURIComponent(fnameEnc).split(/[_-]+/).join(' ')
    let style = 'normal'
    let weight = 'normal'
    if (/italic|oblique/i.test(fname) || /italic|oblique/.test(family)) style = 'italic'
    const m = /(\d{3})/.exec(fname)
    if (m) weight = String(Number(m[1]))
    else if (/bold/i.test(fname) || /black|heavy/i.test(fname)) weight = '700'
    else if (/semibold|demibold|600/i.test(fname)) weight = '600'
    else if (/medium|500/i.test(fname)) weight = '500'
    return { style, weight }
  } catch (e) {
    // Log to aid debugging while still returning a safe default
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('inferFontMeta failed for', url, family, e)
    }
    return { style: 'normal', weight: 'normal' }
  }
}

const _buildCssForBundled = (bundled) => {
  let css = ''
  Object.keys(bundled).forEach((family) => {
    const url = bundled[family]
    const meta = _inferFontMeta(url, family)
    const fontStyle = meta.style || 'normal'
    const fontWeight = meta.weight || 'normal'
    css += `@font-face{font-family: "${family}";src: url('${url}') format('truetype');font-weight: ${fontWeight};font-style: ${fontStyle};font-display: swap;}` + '\n'
  })
  return css
}

const _applyBrandVars = (bundled) => {
  if (!_isDocumentAvailable()) return
  const docEl = document.documentElement
  if (!docEl?.style) return
  const setVar = (name, value) => docEl.style.setProperty(name, value)
  if (bundled['Cinzel']) {
    const meta = _inferFontMeta(bundled['Cinzel'], 'Cinzel')
    setVar('--brand-font-family', '"Cinzel"')
    setVar('--brand-font-weight', meta.weight || '700')
    setVar('--brand-font-style', meta.style || 'normal')
  }
}

// Extract preview fields from the full `values` object (module-scoped)
const collectPreviewFieldsFromValues = (v = {}) => ({
  backgroundType: v.backgroundType,
  textureRef: v.textureRef,
  backgroundSeed: v.backgroundSeed ? Number(v.backgroundSeed) : undefined,
  randomSeed: v.finalSeed ? Number(v.finalSeed) : undefined,
  finalWidth: v.finalWidth,
  finalHeight: v.finalHeight,
  colorizeLand: v.colorizeLand,
  colorizeOcean: v.colorizeOcean,
  landColor: v.landColor,
  oceanColor: v.oceanColor,
  drawBorder: v.drawBorder,
  drawGridOverlay: v.drawGridOverlay,
  gridOverlayShape: v.gridOverlayShape,
  gridOverlayRowOrColCount: v.gridOverlayRowOrColCount,
  gridOverlayColor: v.gridOverlayColor,
  gridOverlayXOffset: v.gridOverlayXOffset,
  gridOverlayYOffset: v.gridOverlayYOffset,
  gridOverlayLineWidth: v.gridOverlayLineWidth,
  drawRegionBoundaries: v.drawRegionBoundaries,
  regionBoundaryStyle: v.regionBoundaryStyle,
  regionBoundaryWidth: v.regionBoundaryWidth,
  regionBoundaryColor: v.regionBoundaryColor,
  borderRef: v.borderRef,
  borderWidth: v.borderWidth,
  borderPosition: v.borderPosition,
  borderColorOption: v.borderColorOption,
  borderColor: v.borderColor,
  frayedBorder: v.frayedBorder,
  frayedBorderBlurLevel: v.frayedBorderBlurLevel,
  frayedBorderSize: v.frayedBorderSize,
  frayedBorderSeed: v.frayedBorderSeed,
  frayedBorderColor: v.frayedBorderColor,
  drawGrunge: v.drawGrunge,
  grungeWidth: v.grungeWidth,
  lineStyle: v.lineStyle,
  coastlineWidth: v.coastlineWidth,
  coastlineColor: v.coastlineColor,
  coastShadingLevel: v.coastShadingLevel,
  coastShadingColor: v.coastShadingColor,
  oceanShadingLevel: v.oceanShadingLevel,
  oceanShadingColor: v.oceanShadingColor,
  oceanWavesType: v.oceanWavesType,
  oceanWavesLevel: v.oceanWavesLevel,
  oceanWavesColor: v.oceanWavesColor,
  concentricWaveCount: v.concentricWaveCount,
  fadeConcentricWaves: v.fadeConcentricWaves,
  jitterToConcentricWaves: v.jitterToConcentricWaves,
  brokenLinesForConcentricWaves: v.brokenLinesForConcentricWaves,
  drawOceanEffectsInLakes: v.drawOceanEffectsInLakes,
  riverColor: v.riverColor,
  drawRoads: v.drawRoads,
  roadStyle: v.roadStyle,
  roadWidth: v.roadWidth,
  roadColor: v.roadColor,
  mountainSize: v.mountainSize,
  hillSize: v.hillSize,
  duneSize: v.duneSize,
  treeHeight: v.treeHeight,
  citySize: v.citySize,
  drawText: v.drawText,
  titleFontFamily: v.titleFontFamily,
  regionFontFamily: v.regionFontFamily,
  mountainRangeFontFamily: v.mountainRangeFontFamily,
  otherMountainsFontFamily: v.otherMountainsFontFamily,
  citiesFontFamily: v.citiesFontFamily,
  riverFontFamily: v.riverFontFamily,
  textColor: v.textColor,
  drawBoldBackground: v.drawBoldBackground,
  boldBackgroundColor: v.boldBackgroundColor,
})

// Keys from `previewFields` that should trigger preview recompute when changed.
const PREVIEW_TRIGGER_KEYS = [
  'backgroundType',
  'textureRef',
  'backgroundSeed',
  'randomSeed',
  'finalWidth',
  'finalHeight',
  'colorizeLand',
  'colorizeOcean',
  'landColor',
  'oceanColor',
  'drawBorder',
  'drawGridOverlay',
  'gridOverlayShape',
  'gridOverlayRowOrColCount',
  'gridOverlayColor',
  'gridOverlayXOffset',
  'gridOverlayYOffset',
  'gridOverlayLineWidth',
  'drawRegionBoundaries',
  'regionBoundaryStyle',
  'regionBoundaryWidth',
  'regionBoundaryColor',
  'borderRef',
  'borderWidth',
  'borderPosition',
  'borderColor',
  'frayedBorder',
  'frayedBorderBlurLevel',
  'frayedBorderSize',
  'drawBoldBackground',
]

// Compute a stable preview trigger key from `previewFields` so that
// useMemo can depend on a small array rather than the whole object.
function computePreviewTriggerKey(previewFields = {}) {
  try {
    // Build a compact tuple of values for the watched keys and stringify.
    const vals = PREVIEW_TRIGGER_KEYS.map((k) => {
      const v = previewFields?.[k]
      if (v === undefined) return '__u__'
      if (v === null) return '__n__'
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v)
    })
    return vals.join('|')
  } catch (e) {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('computePreviewTriggerKey error', e)
    }
    return ''
  }
}

// Static tab key lists (module-scoped to reduce component complexity)
const BACKGROUND_KEYS = [
  'translateLabel',
  'gatedControlValue',
  'emptyComboOption',
  'renderColorControl',
  'notifyManualChange',
  'recomposeUsingLastBase',
  'textures',
  'backgroundTypes',
  'strokeTypes',
  'landColoringMethods',
  'backgroundType',
  'setBackgroundType',
  'showTextureOptions',
  'hasTextures',
  'textureRef',
  'setTextureRef',
  'drawRegionBoundaries',
  'setDrawRegionBoundaries',
  'regionBoundaryStyle',
  'setRegionBoundaryStyle',
  'regionBoundaryWidth',
  'setRegionBoundaryWidth',
  'regionBoundaryColor',
  'setRegionBoundaryColor',
  'showRegionBoundaryPicker',
  'setShowRegionBoundaryPicker',
  'colorizeLand',
  'setColorizeLand',
  'landColoringMethod',
  'setLandColoringMethod',
  'landColor',
  'setLandColor',
  'showLandPicker',
  'setShowLandPicker',
  'colorizeOcean',
  'setColorizeOcean',
  'showOceanPicker',
  'setShowOceanPicker',
  'oceanColor',
  'setOceanColor',
  'backgroundSeed',
  'sanitizeSeedValue',
  'setBackgroundSeed',
  'drawGridOverlay',
  'setDrawGridOverlay',
  'gridOverlayShape',
  'setGridOverlayShape',
  'gridOverlayRowOrColCount',
  'setGridOverlayRowOrColCount',
  'gridOverlayLineWidth',
  'setGridOverlayLineWidth',
  'gridOverlayColor',
  'setGridOverlayColor',
  'showGridPicker',
  'setShowGridPicker',
  'gridOverlayOffsets',
  'gridOverlayXOffset',
  'setGridOverlayXOffset',
  'gridOverlayYOffset',
  'setGridOverlayYOffset',
  'gridOverlayLayers',
  'gridOverlayLayer',
  'setGridOverlayLayer',
  'backgroundPreviewUrl',
  'gridOverlayShapes',
  'drawVoronoiGridOverlayOnlyOnLand',
  'setDrawVoronoiGridOverlayOnlyOnLand',
]

const BORDER_KEYS = [
  'translateLabel',
  'gatedControlValue',
  'emptyComboOption',
  'renderColorControl',
  'drawBorder',
  'setDrawBorder',
  'borderRef',
  'setBorderRef',
  'borderTypes',
  'borderWidth',
  'setBorderWidth',
  'borderPosition',
  'setBorderPosition',
  'borderPositions',
  'borderColorOption',
  'setBorderColorOption',
  'borderColorOptions',
  'borderColor',
  'setBorderColor',
  'frayedBorder',
  'setFrayedBorder',
  'frayedBorderBlurLevel',
  'setFrayedBorderBlurLevel',
  'frayedBorderSize',
  'setFrayedBorderSize',
  'frayedBorderSeed',
  'setFrayedBorderSeed',
  'drawGrunge',
  'setDrawGrunge',
  'grungeWidth',
  'setGrungeWidth',
  'frayedBorderColor',
  'setFrayedBorderColor',
  'showBorderColorPicker',
  'setShowBorderColorPicker',
  'showFrayedBorderPicker',
  'setShowFrayedBorderPicker',
]

const EFFECTS_KEYS = [
  'translateLabel',
  'gatedControlValue',
  'emptyComboOption',
  'renderColorControl',
  'lineStyles',
  'lineStyle',
  'setLineStyle',
  'coastlineWidth',
  'setCoastlineWidth',
  'coastlineColor',
  'setCoastlineColor',
  'showCoastlinePicker',
  'setShowCoastlinePicker',
  'coastShadingLevel',
  'setCoastShadingLevel',
  'coastShadingColor',
  'setCoastShadingColor',
  'landColoringMethod',
  'oceanShadingLevel',
  'setOceanShadingLevel',
  'oceanShadingColor',
  'setOceanShadingColor',
  'showOceanPicker',
  'setShowOceanPicker',
  'oceanWaveTypes',
  'oceanWavesType',
  'setOceanWavesType',
  'concentricWaveValue',
  'noneWaveValue',
  'oceanWavesLevel',
  'setOceanWavesLevel',
  'oceanWavesColor',
  'setOceanWavesColor',
  'showOceanWavesPicker',
  'setShowOceanWavesPicker',
  'concentricWaveCount',
  'setConcentricWaveCount',
  'fadeConcentricWaves',
  'setFadeConcentricWaves',
  'jitterToConcentricWaves',
  'setJitterToConcentricWaves',
  'brokenLinesForConcentricWaves',
  'setBrokenLinesForConcentricWaves',
  'drawOceanEffectsInLakes',
  'setDrawOceanEffectsInLakes',
  'riverColor',
  'setRiverColor',
  'showRiverPicker',
  'setShowRiverPicker',
  'drawRoads',
  'setDrawRoads',
  'roadStyle',
  'setRoadStyle',
  'strokeTypes',
  'roadWidth',
  'setRoadWidth',
  'roadColor',
  'setRoadColor',
  'showRoadPicker',
  'setShowRoadPicker',
  'mountainSize',
  'setMountainSize',
  'hillSize',
  'setHillSize',
  'duneSize',
  'setDuneSize',
  'treeHeight',
  'setTreeHeight',
  'citySize',
  'setCitySize',
]

const FONTS_KEYS = [
  'translateLabel',
  'renderColorControl',
  'drawText',
  'setDrawText',
  'fontFields',
  'availableFontFamilies',
  'openFontComboId',
  'setOpenFontComboId',
  'handleFontOptionClick',
  'textColor',
  'setTextColor',
  'showTextColorPicker',
  'setShowTextColorPicker',
  'drawBoldBackground',
  'setDrawBoldBackground',
  'boldBackgroundColor',
  'setBoldBackgroundColor',
  'showBoldBackgroundPicker',
  'setShowBoldBackgroundPicker',
]

// Helper to render the active tab panel (module-scoped to reduce component complexity).
const renderActivePanel = (activeTab, tabProps) => {
  if (!activeTab) return null
  switch (String(activeTab).trim().toLowerCase()) {
    case 'background':
      return <BackgroundTab {...pick(tabProps, BACKGROUND_KEYS)} />
    case 'border':
      return <BorderTab {...pick(tabProps, BORDER_KEYS)} />
    case 'effects':
      return <EffectsTab {...pick(tabProps, EFFECTS_KEYS)} />
    case 'fonts':
      return <FontsTab {...pick(tabProps, FONTS_KEYS)} />
    default:
      return null
  }
}

// Module-scoped factory to build tab props (extracted from the component
// to reduce its cognitive complexity).
const buildTabProps = (p) => {
  return {
    values: p.values,
    handlers: p.handlers,
    options: p.options,
    ui: p.ui,
    translateLabel: p.translateLabel,
    translateLabelWithArgs: p.translateLabelWithArgs,
    sanitizeSeedValue: p.sanitizeSeedValue,
    sanitizeTranslation: p.sanitizeTranslation,
    renderColorControl: p.renderColorControl,
    gatedControlValue: p.gatedControlValue,
    emptyComboOption: p.emptyComboOption,
    textures: p.textures,
    backgroundTypes: p.backgroundTypes,
    hasTextures: p.hasTextures,
    strokeTypes: p.strokeTypes,
    borderTypes: p.borderTypes,
    borderPositions: p.borderPositions,
    borderColorOptions: p.borderColorOptions,
    landColoringMethods: p.landColoringMethods,
    gridOverlayShapes: p.gridOverlayShapes,
    gridOverlayOffsets: p.gridOverlayOffsets,
    gridOverlayLayers: p.gridOverlayLayers,
    lineStyles: p.lineStyles,
    oceanWaveTypes: p.oceanWaveTypes,
    concentricWaveValue: p.concentricWaveValue,
    rippleWaveValue: p.rippleWaveValue,
    noneWaveValue: p.noneWaveValue,
    availableFontFamilies: p.availableFontFamilies,
    fontFields: p.fontFields,
    fontFieldSetters: p.fontFieldSetters,
    openFontComboId: p.openFontComboId,
    setOpenFontComboId: p.setOpenFontComboId,
    recomposeUsingLastBase: p.recomposeUsingLastBase,
    notifyManualChange: p.notifyManualChange,
    previewFields: p.previewFields,
    backgroundPreviewUrl: p.backgroundPreviewUrl,
    preview: p.preview,
    showTextureOptions: p.showTextureOptions,
    drawVoronoiGridOverlayOnlyOnLand: p.drawVoronoiGridOverlayOnlyOnLand,
    // setters and preview values (canonicalized)
    ...p.previewFields,
    // ensure BackgroundTab receives the active landColoringMethod value
    landColoringMethod: p.values?.landColoringMethod,
    // Explicit setters/handlers (not part of previewFields)
    setTextureRef: p.handlers?.setTextureRef,
    setBackgroundType: p.handlers?.setBackgroundType,
    setDrawBorder: p.handlers?.setDrawBorder,
    setDrawRegionBoundaries: p.handlers?.setDrawRegionBoundaries,
    setRegionBoundaryStyle: p.handlers?.setRegionBoundaryStyle,
    setRegionBoundaryWidth: p.handlers?.setRegionBoundaryWidth,
    setRegionBoundaryColor: p.handlers?.setRegionBoundaryColor,
    setColorizeLand: p.handlers?.setColorizeLand,
    setLandColoringMethod: p.handlers?.setLandColoringMethod,
    setLandColor: p.handlers?.setLandColor,
    setColorizeOcean: p.handlers?.setColorizeOcean,
    setOceanColor: p.handlers?.setOceanColor,
    setBackgroundSeed: p.handlers?.setBackgroundSeed,
    setDrawGridOverlay: p.handlers?.setDrawGridOverlay,
    setGridOverlayShape: p.handlers?.setGridOverlayShape,
    setGridOverlayRowOrColCount: p.handlers?.setGridOverlayRowOrColCount,
    setGridOverlayLineWidth: p.handlers?.setGridOverlayLineWidth,
    setGridOverlayColor: p.handlers?.setGridOverlayColor,
    setGridOverlayXOffset: p.handlers?.setGridOverlayXOffset,
    setGridOverlayYOffset: p.handlers?.setGridOverlayYOffset,
    handleGenerateFromSettings: p.handlers?.handleGenerateFromSettings,
    handleGenerateAndSaveNort: p.handlers?.handleGenerateAndSaveNort,
    openPreviewModal: p.handlers?.openPreviewModal,
    handleDownloadMap: p.handlers?.handleDownloadMap,
    ...p.setterDeps,
    handleFontOptionClick: p.handleFontOptionClick,
    // picker visibility state
    showCoastPicker: p.showCoastPicker,
    setShowCoastPicker: p.setShowCoastPicker,
    showGridPicker: p.showGridPicker,
    setShowGridPicker: p.setShowGridPicker,
    showOceanPicker: p.showOceanPicker,
    setShowOceanPicker: p.setShowOceanPicker,
    showRegionBoundaryPicker: p.showRegionBoundaryPicker,
    setShowRegionBoundaryPicker: p.setShowRegionBoundaryPicker,
    showLandPicker: p.showLandPicker,
    setShowLandPicker: p.setShowLandPicker,
    showBorderColorPicker: p.showBorderColorPicker,
    setShowBorderColorPicker: p.setShowBorderColorPicker,
    showFrayedBorderPicker: p.showFrayedBorderPicker,
    setShowFrayedBorderPicker: p.setShowFrayedBorderPicker,
    showCoastlinePicker: p.showCoastlinePicker,
    setShowCoastlinePicker: p.setShowCoastlinePicker,
    showOceanWavesPicker: p.showOceanWavesPicker,
    setShowOceanWavesPicker: p.setShowOceanWavesPicker,
    showRiverPicker: p.showRiverPicker,
    setShowRiverPicker: p.setShowRiverPicker,
    showRoadPicker: p.showRoadPicker,
    setShowRoadPicker: p.setShowRoadPicker,
    showTextColorPicker: p.showTextColorPicker,
    setShowTextColorPicker: p.setShowTextColorPicker,
    showBoldBackgroundPicker: p.showBoldBackgroundPicker,
    setShowBoldBackgroundPicker: p.setShowBoldBackgroundPicker,
  }
}

// Extracted helper: register bundled fonts into the document head and use
// the Font Loading API to eagerly load them. This keeps the component body
// smaller and easier to reason about.
function registerBundledFonts(fontsMap) {
  const bundled = _extractBundled(fontsMap)
  const styleId = 'nortantis-bundled-fonts'

  if (!_isDocumentAvailable()) return
  const existing = document.getElementById(styleId)
  if (!bundled) {
    if (existing) existing.remove()
    return
  }

  if (existing) existing.remove()
  const styleEl = document.createElement('style')
  styleEl.id = styleId
  styleEl.appendChild(document.createTextNode(_buildCssForBundled(bundled)))
  document.head.appendChild(styleEl)

  _applyBrandVars(bundled)

  if (document.fonts && typeof document.fonts.load === 'function') {
    const loads = Object.keys(bundled).map((family) => {
      const meta = _inferFontMeta(bundled[family], family)
      const stylePart = meta.style && meta.style !== 'normal' ? `${meta.style} ` : ''
      const weightPart = meta.weight && meta.weight !== 'normal' ? `${meta.weight} ` : ''
      const desc = `${stylePart}${weightPart}16px "${family}"`
      return document.fonts.load(desc)
    })
    Promise.allSettled(loads).catch((err) => {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug('bundled font load failed', err)
      }
    })
  }
}

// Extracted helper: preload a small set of background bases to reduce first-open latency.
function preloadBackgroundBases(textures, backgroundTypes) {
  const candidates = []
  if (Array.isArray(textures) && textures.length > 0) {
    textures.slice(0, 5).forEach((t) => {
      candidates.push({
        width: 520,
        height: 170,
        type: 'GeneratedFromTexture',
        artPack: t.artPack,
        cityIconType: t.name,
      })
    })
  }
  const fractal = Array.isArray(backgroundTypes)
    ? backgroundTypes.find((b) => b?.value && String(b.value).toLowerCase().includes('fractal'))
    : null
  if (fractal) candidates.push({ width: 520, height: 170, type: fractal.value })
  else candidates.push({ width: 520, height: 170, type: 'Fractal' })

  candidates.forEach((p) => {
    backgroundBaseCache.preload(p)
  })
}

// Helper to add a document-level mouse handler which closes an open font combo
// if the click occurs outside of any `.font-combo` element. Returns a cleanup
// function suitable for use as a useEffect cleanup.
function setupCloseOnOutsideClick(setOpenFontComboId) {
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
}

// Return an array of available font family names from backend-provided fonts
// (accepts either legacy array or new map form).
function getAvailableFontFamilies(rawFonts) {
  if (Array.isArray(rawFonts)) return rawFonts
  if (rawFonts && typeof rawFonts === 'object') return Object.keys(rawFonts)
  return []
}

// Extracted submit handler implementation so the component can use a
// lightweight useCallback wrapper and keep its body small.
async function onSubmitGenerateImpl(e, handlers, triggerPreviewRefresh) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault()
  if (typeof handlers?.handleGenerateFromSettings === 'function') {
    await handlers.handleGenerateFromSettings(e)
  }
  // Let errors propagate; caller will observe failures. Trigger preview refresh afterwards.
  if (typeof triggerPreviewRefresh === 'function') triggerPreviewRefresh()
}

// Module-scoped sanitizer to reduce component complexity.
const _sanitizeTranslation = (s) => {
  if (!s) return s
  if (typeof s !== 'string') return s
  let t = String(s)
  const MAX_SANITIZE_LENGTH = 2000
  if (t.length > MAX_SANITIZE_LENGTH) t = t.slice(0, MAX_SANITIZE_LENGTH)
  t = stripHtmlWrapper(t)
  if (/<br\s*\/?>>/i.test(t)) {
    const parts = t.split(/<br\s*\/?/i)
    return parts.flatMap((p) => (p === parts.at(-1) ? [p] : [p, React.createElement('br', { key: `br-${String(p).slice(0, 20)}` })]))
  }
  t = removeTags(t)
  t = t.replaceAll("''", "'")
  t = t.replaceAll(/\s+/g, ' ').trim()
  return t
}

// Module-scoped color control component to reduce cognitive complexity
const RenderColorControl = ({
  id,
  label,
  hexValue,
  onHexChange,
  alphaValue,
  onAlphaChange,
  disabled,
  showState,
  setShowState,
  onClose,
  swatchReplacement,
}) => {
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
  RenderColorControl.propTypes = {
    id: PropTypes.string,
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    hexValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onHexChange: PropTypes.func,
    alphaValue: PropTypes.number,
    onAlphaChange: PropTypes.func,
    disabled: PropTypes.bool,
    showState: PropTypes.bool,
    setShowState: PropTypes.func,
    onClose: PropTypes.func,
    swatchReplacement: PropTypes.node,
  }
  const closePicker = () => {
    if (typeof setShowState === 'function') setShowState(false)
    if (typeof onClose === 'function') onClose()
  }

  return (
    <>
      <label htmlFor={`${id}`} className={disabled ? 'is-disabled' : ''}>
        {label}
      </label>
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
              background: (function () {
                if (!hexValue) return '#000000'
                const ch = parseColorChannels(hexValue)
                if (!ch) return '#000000'
                const a = (ch.a ?? 255) / 255
                return `rgba(${ch.r}, ${ch.g}, ${ch.b}, ${a})`
              })(),
              border: '1px solid #bbb',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              pointerEvents: disabled ? 'none' : undefined,
            }}
          />
        )}
      </div>
      {showState && (
        <ColorPickerModal open={showState} onClose={closePicker}>
          <>
            <RgbaColorPicker
              color={(() => {
                const ch = parseColorChannels(hexValue) || { r: 0, g: 0, b: 0, a: 255 }
                return { r: ch.r, g: ch.g, b: ch.b, a: (ch.a ?? 255) / 255 }
              })()}
              onChange={(col) => {
                const r = Math.round(col.r || 0)
                const g = Math.round(col.g || 0)
                const b = Math.round(col.b || 0)
                const a = Math.round((col.a ?? 1) * 255)
                const combinedHex = colorToHexWithAlpha({ r, g, b, a })
                if (typeof onHexChange === 'function') onHexChange(combinedHex)
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
export {
  colorizeBitmap,
  makeCanvasForBitmap,
  drawBackgroundAndInset,
  drawIslandShape,
  prepareBitmapsModule,
  composeMiniIslandFromBlobModule,
  fetchPreviewBlob,
} from './CustomizePreviewHelpers'

export default function CustomizeSettingsSection({ values, handlers, options, ui }) {
  const [activeTab, setActiveTab] = useState(null)
  const [openFontComboId, setOpenFontComboId] = useState(null)
  // token for bundled-fonts load completion removed; we don't read it.

  const FORCE_ENABLE_CUSTOMIZE = true

  useEffect(() => {
    return setupCloseOnOutsideClick(setOpenFontComboId)
  }, [])

  const {
    preview,
    backgroundType,
    titleFontFamily,
    regionFontFamily,
    mountainRangeFontFamily,
    otherMountainsFontFamily,
    citiesFontFamily,
    riverFontFamily,
    fileObj,
    currentSource,
  } = values

  // Wrap the incoming setter to trace calls
  // Do not mutate handlers prop; leave setter tracing to parent/debug hooks.

  // Runtime debug: log received `drawGrunge` value from parent `values`

  // Build preview fields from the received `values` object.
  const previewFields = collectPreviewFieldsFromValues(values)

  // Use a filtered preview key so color toggles/values do not trigger the background preview.
  const previewTriggerKey = useMemo(
    () => computePreviewTriggerKey(previewFields),
    PREVIEW_TRIGGER_KEYS.map((k) => previewFields?.[k])
  )

  // Consolidated map of setter functions so they can be spread into `tabProps`.
  const setterDeps = {
    setGridOverlayLayer: handlers.setGridOverlayLayer,
    setDrawVoronoiGridOverlayOnlyOnLand: handlers.setDrawVoronoiGridOverlayOnlyOnLand,
    setBorderRef: handlers.setBorderRef,
    setBorderWidth: handlers.setBorderWidth,
    setBorderPosition: handlers.setBorderPosition,
    setBorderColorOption: handlers.setBorderColorOption,
    setBorderColor: handlers.setBorderColor,
    setFrayedBorder: handlers.setFrayedBorder,
    setFrayedBorderBlurLevel: handlers.setFrayedBorderBlurLevel,
    setFrayedBorderSize: handlers.setFrayedBorderSize,
    setFrayedBorderSeed: handlers.setFrayedBorderSeed,
    setDrawGrunge: handlers.setDrawGrunge,
    setGrungeWidth: handlers.setGrungeWidth,
    setFrayedBorderColor: handlers.setFrayedBorderColor,
    setRoadStyle: handlers.setRoadStyle,
    setRoadWidth: handlers.setRoadWidth,
    setRoadColor: handlers.setRoadColor,
    setMountainSize: handlers.setMountainSize,
    setHillSize: handlers.setHillSize,
    setDuneSize: handlers.setDuneSize,
    setTreeHeight: handlers.setTreeHeight,
    setCitySize: handlers.setCitySize,
    setLineStyle: handlers.setLineStyle,
    setCoastlineWidth: handlers.setCoastlineWidth,
    setCoastlineColor: handlers.setCoastlineColor,
    setCoastShadingLevel: handlers.setCoastShadingLevel,
    setCoastShadingColor: handlers.setCoastShadingColor,
    setOceanShadingLevel: handlers.setOceanShadingLevel,
    setOceanShadingColor: handlers.setOceanShadingColor,
    setOceanWavesType: handlers.setOceanWavesType,
    setOceanWavesLevel: handlers.setOceanWavesLevel,
    setOceanWavesColor: handlers.setOceanWavesColor,
    setConcentricWaveCount: handlers.setConcentricWaveCount,
    setFadeConcentricWaves: handlers.setFadeConcentricWaves,
    setJitterToConcentricWaves: handlers.setJitterToConcentricWaves,
    setBrokenLinesForConcentricWaves: handlers.setBrokenLinesForConcentricWaves,
    setDrawOceanEffectsInLakes: handlers.setDrawOceanEffectsInLakes,
    setRiverColor: handlers.setRiverColor,
    setDrawRoads: handlers.setDrawRoads,
    setDrawText: handlers.setDrawText,
    setTitleFontFamily: handlers.setTitleFontFamily,
    setRegionFontFamily: handlers.setRegionFontFamily,
    setMountainRangeFontFamily: handlers.setMountainRangeFontFamily,
    setOtherMountainsFontFamily: handlers.setOtherMountainsFontFamily,
    setCitiesFontFamily: handlers.setCitiesFontFamily,
    setRiverFontFamily: handlers.setRiverFontFamily,
    setTextColor: handlers.setTextColor,
    setDrawBoldBackground: handlers.setDrawBoldBackground,
    setBoldBackgroundColor: handlers.setBoldBackgroundColor,
  }

  // Boolean controlling whether the Voronoi grid overlay is drawn only on land.
  // Prefer the explicit value from `values` (controlled by parent), then
  // fall back to `previewFields` and finally default to `false`.
  const drawVoronoiGridOverlayOnlyOnLand =
    values?.drawVoronoiGridOverlayOnlyOnLand ?? previewFields?.drawVoronoiGridOverlayOnlyOnLand ?? false

  const { textures, borderTypes, i18n, backendOptions: passedBackendOptions } = options
  const { loading } = ui
  const labels = i18n?.labels
  const backendOptions = passedBackendOptions ?? i18n?.options

  // `options.tabs` removed from backend response; labels come from `i18n.labels`.
  // Do not read `backendOptions.tabs`.
  const landColoringMethods = backendOptions?.landColoringMethods
  const gridOverlayShapes = backendOptions?.gridOverlayShapes
  const gridOverlayOffsets = backendOptions?.gridOverlayOffsets
  const gridOverlayLayers = backendOptions?.gridOverlayLayers
  const backgroundTypes = backendOptions?.backgroundTypes

  // Fonts are provided by the backend via `i18n.options.fonts`. Normalize
  // into an array of family names using a helper to reduce inline branches.
  const _rawFonts = backendOptions?.fonts
  const availableFontFamilies = getAvailableFontFamilies(_rawFonts)

  // Dynamically register any bundled fonts by inspecting `options.fonts`.
  // The backend populates `options.fonts` with public /fonts/ paths for
  // families that are shipped with the runtime image.
  useEffect(() => registerBundledFonts(backendOptions?.fonts), [backendOptions?.fonts])

  // Note: explicit preloads removed to avoid duplicate fetches; font
  // loading is handled via injected @font-face rules and the
  // Font Loading API above.

  // Preload the first few texture bases and a fractal base so the UI
  // doesn't hit the backend on first open. Uses `backgroundBaseCache.preload`.
  useEffect(() => preloadBackgroundBases(textures, backgroundTypes), [textures, backgroundTypes])
  const strokeTypes = backendOptions?.strokeTypes
  const {
    backgroundPreviewUrl,
    setPreviewFromBlob,
    recomposeUsingLastBase,
    triggerPreviewRefresh,
    clearPreview,
  } = useCustomizePreview({ previewFields, textures, currentSource })

  const onSubmitGenerate = useCallback(
    (e) => onSubmitGenerateImpl(e, handlers, triggerPreviewRefresh),
    [handlers, triggerPreviewRefresh]
  )
  const borderPositions = backendOptions?.borderPositions
  const borderColorOptions = backendOptions?.borderColorOptions
  const lineStyles = backendOptions?.lineStyles
  const oceanWaveTypes = backendOptions?.oceanWaveTypes
  const concentricWaveValue = Array.isArray(oceanWaveTypes)
    ? oceanWaveTypes.find((o) => o?.value && /Concentric/i.test(o.value))?.value
    : undefined
  const rippleWaveValue = Array.isArray(oceanWaveTypes)
    ? oceanWaveTypes.find((o) => o?.value && /Ripple|Ripples/i.test(o.value))?.value
    : undefined
  const noneWaveValue = Array.isArray(oceanWaveTypes)
    ? oceanWaveTypes.find((o) => o?.value && /^(None|No|NoEffect|NoneWaves)$/i.test(o.value))?.value
    : undefined
  const translateLabel = (key) => {
    const value = Object.hasOwn(labels ?? {}, key) && labels[key] ? labels[key] : key
    // If the translation contains literal <br> tags, return React nodes
    // Guard against extremely long inputs to avoid expensive regex operations
    if (typeof value === 'string' && value.length <= 2000 && /<br\s*\/?/i.test(value)) {
      const parts = value.split(/<br\s*\/?/i)
      return parts.flatMap((p) =>
        p === parts.at(-1)
          ? [p]
          : [p, React.createElement('br', { key: `br-${String(p).slice(0, 20)}` })]
      )
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

  const ALLOWED_TAB_IDS = new Set(['background', 'border', 'effects', 'fonts'])

  const normalizeTabId = (raw) => {
    if (!raw && raw !== 0) return ''
    return String(raw).trim().toLowerCase()
  }

  // Static tab ids the UI expects (server may only supply labels by index).
  const STATIC_TABS = ['background', 'border', 'effects', 'fonts']

  // Initialize `activeTab`. Prefer an existing valid value; otherwise default
  // to the first static tab. Re-evaluate when backendOptions change.
  useEffect(() => {
    if (activeTab && ALLOWED_TAB_IDS.has(normalizeTabId(activeTab))) return
    setActiveTab(STATIC_TABS[0])
  }, [backendOptions])

  // Ensure seed input fields do not display empty/whitespace values.
  const sanitizeSeedValue = (v) => {
    if (!v) return ''
    if (typeof v === 'string' && v.trim() === '') return ''
    return v
  }
  const sanitizeTranslation = _sanitizeTranslation

  // Small helpers to convert between hex and rgba used by the picker.
  // (helpers available in module scope)

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

  const showTextureOptions = backgroundType === 'GeneratedFromTexture'
  const hasTextures = textures.length > 0
  // Keep Customize panel disabled unless the user explicitly has a .nort
  // source (uploaded file or current nortContent). Do not enable the
  // panel merely because a random generation produced settings —
  // that should not be treated as an editable customization source.
  const hasCustomizationSource = Boolean(
    fileObj || currentSource?.nortContent || FORCE_ENABLE_CUSTOMIZE
  )
  const customizationDirty = ui?.customizationDirty || false
  const hasGeneratedOnce = ui?.hasGeneratedOnce || false
  // Regenerate should remain enabled so users can apply manual changes.
  const canSubmit = !loading && hasCustomizationSource
  // Downloads must be disabled if the user manually edited controls after
  // a prior generation until a new map is generated. Also disable download
  // when there is no generated map available (and no loaded .nort/file).
  const hasConcreteSource = Boolean(fileObj || currentSource?.nortContent || hasGeneratedOnce)
  const canDownloadSettings =
    !loading &&
    hasCustomizationSource &&
    hasConcreteSource &&
    !(customizationDirty && hasGeneratedOnce)
  const canDownloadMap =
    !loading &&
    hasCustomizationSource &&
    Boolean(preview?.url) &&
    !(customizationDirty && hasGeneratedOnce)
  const gatedControlValue = (value) => {
    // Show explicit values supplied by the server or a loaded .nort file.
    // Only hide controls when the value is undefined or null and there
    // is no customization source. This avoids synthesizing defaults
    // while ensuring server-provided values (numbers/strings) are visible.
    if (value !== undefined && value !== null) return value
    return hasCustomizationSource ? value : ''
  }

  // debug helper removed
  const emptyComboOption = hasCustomizationSource ? null : <option value="" />

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

  // Offload background preview logic to a custom hook to keep this
  // component's top-level complexity lower.
  useAutoPreview(
    previewTriggerKey,
    previewFields,
    textures,
    currentSource,
    setPreviewFromBlob,
    clearPreview,
    hasCustomizationSource
  )

  const renderColorControl = RenderColorControl

  useEffect(() => {
    return () => {
      clearPreview()
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

  

  const tabProps = buildTabProps({
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
    setterDeps,
    handleFontOptionClick,
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
  })

  // Tab implementations have been moved into dedicated components.

  // Tab keys (module-level constants used directly)

  // Determine which tab index is active by matching normalized ids/labels.
  const activePanel = renderActivePanel(activeTab, tabProps)

  return (
    <section
      className={`generator-section customize-section${hasCustomizationSource ? '' : ' is-disabled'}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h3 style={{ margin: 0 }}>{translateLabel('ui.title.customize')}</h3>
      </div>
      <p className="section-hint">{translateLabel('ui.subtitle.customize')}</p>
      {!hasCustomizationSource && (
        <p className="section-hint">{translateLabel('ui.noSourceHint')}</p>
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
            {STATIC_TABS.map((tabId) => {
              const normId = normalizeTabId(tabId)
              const label = translateLabel(`theme.tab.${tabId}`)
              return (
                <button
                  key={normId}
                  id={`customize-tab-${normId}`}
                  type="button"
                  role="tab"
                  aria-controls={`customize-tabpanel-${normId}`}
                  className={`customize-tab-button${activeTab === normId ? ' is-active' : ''}`}
                  aria-selected={activeTab === normId}
                  onClick={() => setActiveTab(normId)}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div
            id={activeTab ? `customize-tabpanel-${activeTab}` : undefined}
            className="customize-tab-panel"
            role="tabpanel"
            aria-labelledby={activeTab ? `customize-tab-${activeTab}` : undefined}
          >
            {activePanel}
          </div>

          <div className="section-actions">
            <button type="submit" disabled={!canSubmit}>
              {loading ? translateLabel('ui.generating') : translateLabel('ui.button.regenerate')}
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
  options: PropTypes.shape({
    textures: PropTypes.array,
    borderTypes: PropTypes.array,
    i18n: PropTypes.object,
    backendOptions: PropTypes.object,
  }).isRequired,
  ui: PropTypes.shape({
    loading: PropTypes.bool.isRequired,
    customizationDirty: PropTypes.bool,
    hasGeneratedOnce: PropTypes.bool,
  }).isRequired,
}
