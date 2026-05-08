import React from 'react'

export default function BackgroundTab({ context }) {
  if (!context) return <div />
  const {
    translateLabel,
    gatedControlValue,
    emptyComboOption,
    renderColorControl,
    notifyManualChange,
    recomposeUsingLastBase,
    textures,
    backgroundTypes,
    strokeTypes,
  } = context

  const get = (k) => (context[k] !== undefined ? context[k] : (context.values && context.values[k]))

  const backgroundType = get('backgroundType')
  const setBackgroundType = get('setBackgroundType')
  const showTextureOptions = get('showTextureOptions')
  const hasTextures = get('hasTextures')
  const textureRef = get('textureRef')
  const setTextureRef = get('setTextureRef')
  const drawRegionBoundaries = get('drawRegionBoundaries')
  const setDrawRegionBoundaries = get('setDrawRegionBoundaries')
  const regionBoundaryStyle = get('regionBoundaryStyle')
  const setRegionBoundaryStyle = get('setRegionBoundaryStyle')
  const regionBoundaryWidth = get('regionBoundaryWidth')
  const setRegionBoundaryWidth = get('setRegionBoundaryWidth')
  const regionBoundaryColorHex = get('regionBoundaryColorHex')
  const setRegionBoundaryColorHex = get('setRegionBoundaryColorHex')
  const showRegionBoundaryPicker = get('showRegionBoundaryPicker')
  const setShowRegionBoundaryPicker = get('setShowRegionBoundaryPicker')
  const colorizeLand = get('colorizeLand')
  const setColorizeLand = get('setColorizeLand')
  const finalLandColoringMethod = get('finalLandColoringMethod')
  const setFinalLandColoringMethod = get('setFinalLandColoringMethod')
  const landColorHex = get('landColorHex')
  const setLandColorHex = get('setLandColorHex')
  const showLandPicker = get('showLandPicker')
  const setShowLandPicker = get('setShowLandPicker')
  const colorizeOcean = get('colorizeOcean')
  const setColorizeOcean = get('setColorizeOcean')
  const showOceanPicker = get('showOceanPicker')
  const setShowOceanPicker = get('setShowOceanPicker')
  const oceanColorHex = get('oceanColorHex')
  const setOceanColorHex = get('setOceanColorHex')
  const backgroundSeed = get('backgroundSeed')
  const sanitizeSeedValue = get('sanitizeSeedValue')
  const setBackgroundSeed = get('setBackgroundSeed')
  const drawGridOverlay = get('drawGridOverlay')
  const setDrawGridOverlay = get('setDrawGridOverlay')
  const gridOverlayShape = get('gridOverlayShape')
  const setGridOverlayShape = get('setGridOverlayShape')
  const gridOverlayRowOrColCount = get('gridOverlayRowOrColCount')
  const setGridOverlayRowOrColCount = get('setGridOverlayRowOrColCount')
  const gridOverlayLineWidth = get('gridOverlayLineWidth')
  const setGridOverlayLineWidth = get('setGridOverlayLineWidth')
  const gridOverlayColorHex = get('gridOverlayColorHex')
  const setGridOverlayColorHex = get('setGridOverlayColorHex')
  const gridOverlayOffsets = get('gridOverlayOffsets')
  const gridOverlayXOffset = get('gridOverlayXOffset')
  const setGridOverlayXOffset = get('setGridOverlayXOffset')
  const gridOverlayYOffset = get('gridOverlayYOffset')
  const setGridOverlayYOffset = get('setGridOverlayYOffset')
  const gridOverlayLayers = get('gridOverlayLayers')
  const gridOverlayLayer = get('gridOverlayLayer')
  const setGridOverlayLayer = get('setGridOverlayLayer')
  const backgroundPreviewUrl = get('backgroundPreviewUrl')

  const isVoronoi = String((gridOverlayShape || '')).toLowerCase().includes('voronoi')
  const lowerShape = String(gridOverlayShape || '').toLowerCase()
  const isVerticalHex = lowerShape.includes('vertical')

  return (
    <div className="fields-grid two-col-layout">
      <div className={`fields-column${!drawRegionBoundaries ? ' is-disabled' : ''}`}>
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
            {(get('landColoringMethods') || [])
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
            {gridOverlayOffsets && gridOverlayOffsets.length === 0 ? null : null}
            {context.gridOverlayShapes && context.gridOverlayShapes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

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
            showState: context.showGridPicker,
            setShowState: context.setShowGridPicker,
            disabled: !drawGridOverlay,
          })}

          <label htmlFor="grid-xoffset-input" className={!drawGridOverlay || isVoronoi ? 'is-disabled' : ''}>{translateLabel('theme.xOffset.label')}</label>
          <select id="grid-xoffset-input" value={gatedControlValue(gridOverlayXOffset)} onChange={(e) => setGridOverlayXOffset(e.target.value)} disabled={!drawGridOverlay || isVoronoi}>
            {emptyComboOption}
            {(get('gridOverlayOffsets') || []).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label htmlFor="grid-yoffset-input" className={!drawGridOverlay || isVoronoi ? 'is-disabled' : ''}>{translateLabel('theme.yOffset.label')}</label>
          <select id="grid-yoffset-input" value={gatedControlValue(gridOverlayYOffset)} onChange={(e) => setGridOverlayYOffset(e.target.value)} disabled={!drawGridOverlay || isVoronoi}>
            {emptyComboOption}
            {(get('gridOverlayOffsets') || []).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label className={`checkbox-label${(!drawGridOverlay || !String((gridOverlayShape || '')).toLowerCase().includes('voronoi')) ? ' is-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={context.drawVoronoiGridOverlayOnlyOnLand}
              onChange={(e) => context.setDrawVoronoiGridOverlayOnlyOnLand(e.target.checked)}
              disabled={!drawGridOverlay || !String((gridOverlayShape || '')).toLowerCase().includes('voronoi')}
            />
            <span>{translateLabel('theme.onlyOnLand')}</span>
          </label>

          <label htmlFor="grid-layer-input">{translateLabel('theme.layer.label')}</label>
          <select id="grid-layer-input" value={gatedControlValue(gridOverlayLayer)} onChange={(e) => setGridOverlayLayer(e.target.value)} disabled={!drawGridOverlay}>
            {emptyComboOption}
            {(gridOverlayLayers || []).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="background-preview-panel background-preview-panel--full-row" role="img" aria-label={translateLabel('theme.background.label')}>
          {backgroundPreviewUrl ? (
            <img className="background-preview-canvas" src={backgroundPreviewUrl} alt={translateLabel('theme.background.label')} />
          ) : (
            <div className="background-preview-canvas background-preview-canvas--empty" />
          )}
        </div>
      </div>
    </div>
  )
}
