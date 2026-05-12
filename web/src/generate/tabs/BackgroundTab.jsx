import React from 'react'
import PropTypes from 'prop-types'

function RegionBoundaryControls({
  translateLabel,
  gatedControlValue,
  emptyComboOption,
  strokeTypes,
  drawRegionBoundaries,
  regionBoundaryStyle,
  setRegionBoundaryStyle,
  regionBoundaryWidth,
  setRegionBoundaryWidth,
  regionBoundaryColorHex,
  setRegionBoundaryColorHex,
  showRegionBoundaryPicker,
  setShowRegionBoundaryPicker,
  renderColorControl,
}) {
  return (
    <div
      className={`control-group${drawRegionBoundaries ? '' : ' is-disabled'}`}
      style={drawRegionBoundaries ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
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
        {emptyComboOption()}
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
  )
}

function LandColorControls({
  translateLabel,
  gatedControlValue,
  emptyComboOption,
  renderColorControl,
  colorizeLand,
  finalLandColoringMethod,
  setFinalLandColoringMethod,
  landColorHex,
  setLandColorHex,
  showLandPicker,
  setShowLandPicker,
  notifyManualChange,
  recomposeUsingLastBase,
  landColoringMethods,
}) {
  return (
    <div
      className={`control-group${colorizeLand ? '' : ' is-disabled'}`}
      style={colorizeLand ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
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
        {emptyComboOption()}
        {Array.isArray(landColoringMethods)
          ? landColoringMethods
              .filter((item) => item?.value)
              .map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))
          : null}
      </select>

      {renderColorControl({
        id: 'land-color',
        label: translateLabel('theme.landColor.label'),
        hexValue: landColorHex,
        onHexChange: (hex) => { setLandColorHex(hex); notifyManualChange(); },
        showState: showLandPicker,
        setShowState: setShowLandPicker,
        disabled: !colorizeLand || finalLandColoringMethod === 'ColorPoliticalRegions',
        onClose: () => {
          try {
            recomposeUsingLastBase({ landColorHex: landColorHex })
          } catch (err) {
            if (typeof console !== 'undefined' && console.debug) console.debug('BackgroundTab: recomposeUsingLastBase failed', err)
          }
        },
      })}
    </div>
  )
}

function OceanColorControls({
  translateLabel,
  renderColorControl,
  colorizeOcean,
  oceanColorHex,
  setOceanColorHex,
  showOceanPicker,
  setShowOceanPicker,
  notifyManualChange,
  recomposeUsingLastBase,
}) {
  return (
    <div
      className={`control-group${colorizeOcean ? '' : ' is-disabled'}`}
      style={colorizeOcean ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
    >
      {renderColorControl({
        id: 'ocean-color',
        label: translateLabel('theme.oceanColor.label'),
        hexValue: oceanColorHex,
        onHexChange: (hex) => { setOceanColorHex(hex); notifyManualChange(); },
        showState: showOceanPicker,
        setShowState: setShowOceanPicker,
        disabled: !colorizeOcean,
        onClose: () => {
          try {
            recomposeUsingLastBase({ oceanColorHex: oceanColorHex })
          } catch (err) {
            if (typeof console !== 'undefined' && console.debug) console.debug('BackgroundTab: recomposeUsingLastBase failed', err)
          }
        },
      })}
    </div>
  )
}

function TextureSelect({ emptyComboOption, textures, hasTextures, showTextureOptions, translateLabel, gatedControlValue, textureRef, setTextureRef }) {
  return (
    <>
      <label htmlFor="texture-input" className={showTextureOptions ? '' : 'is-disabled'}>{translateLabel('theme.texture.label')}</label>
      <select
        id="texture-input"
        value={gatedControlValue(textureRef)}
        onChange={(e) => setTextureRef(e.target.value)}
        disabled={!showTextureOptions || !hasTextures}
      >
        {emptyComboOption()}
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
  )
}

function GridShapeSelect({ translateLabel, gatedControlValue, emptyComboOption, gridOverlayShape, setGridOverlayShape, drawGridOverlay, gridOverlayShapes }) {
  return (
    <>
      <label htmlFor="grid-shape-input">{translateLabel('theme.shape.label')}</label>
      <select
        id="grid-shape-input"
        value={gatedControlValue(gridOverlayShape)}
        onChange={(e) => setGridOverlayShape(e.target.value)}
        disabled={!drawGridOverlay}
      >
        {emptyComboOption()}
        {gridOverlayShapes?.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </>
  )
}

function GridRowsControl({ translateLabel, isVerticalHex, drawGridOverlay, isVoronoi, gatedControlValue, gridOverlayRowOrColCount, setGridOverlayRowOrColCount }) {
  return (
    <>
      <label htmlFor="grid-rows-input" className={drawGridOverlay && !isVoronoi ? '' : 'is-disabled'}>
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
          disabled={!(drawGridOverlay && !isVoronoi)}
        />
        <span className="slider-value">{gridOverlayRowOrColCount}</span>
      </div>
    </>
  )
}

function GridLineWidthControl({ translateLabel, drawGridOverlay, gridOverlayLineWidth, setGridOverlayLineWidth }) {
  return (
    <>
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
    </>
  )
}

function GridOffsetsSelects({ translateLabel, drawGridOverlay, isVoronoi, gatedControlValue, gridOverlayXOffset, setGridOverlayXOffset, gridOverlayYOffset, setGridOverlayYOffset, gridOverlayOffsets, emptyComboOption }) {
  return (
    <>
      <label htmlFor="grid-xoffset-input" className={drawGridOverlay && !isVoronoi ? '' : 'is-disabled'}>{translateLabel('theme.xOffset.label')}</label>
      <select id="grid-xoffset-input" value={gatedControlValue(gridOverlayXOffset)} onChange={(e) => setGridOverlayXOffset(e.target.value)} disabled={!(drawGridOverlay && !isVoronoi)}>
        {emptyComboOption()}
        {Array.isArray(gridOverlayOffsets) ? gridOverlayOffsets.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        )) : null}
      </select>

      <label htmlFor="grid-yoffset-input" className={drawGridOverlay && !isVoronoi ? '' : 'is-disabled'}>{translateLabel('theme.yOffset.label')}</label>
      <select id="grid-yoffset-input" value={gatedControlValue(gridOverlayYOffset)} onChange={(e) => setGridOverlayYOffset(e.target.value)} disabled={!(drawGridOverlay && !isVoronoi)}>
        {emptyComboOption()}
        {Array.isArray(gridOverlayOffsets) ? gridOverlayOffsets.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        )) : null}
      </select>
    </>
  )
}

function GridVoronoiToggle({ translateLabel, drawGridOverlay, isVoronoi, drawVoronoiGridOverlayOnlyOnLand, setDrawVoronoiGridOverlayOnlyOnLand }) {
  return (
    <label className={`checkbox-label${drawGridOverlay && isVoronoi ? '' : ' is-disabled'}`}>
      <input
        type="checkbox"
        checked={drawVoronoiGridOverlayOnlyOnLand}
        onChange={(e) => setDrawVoronoiGridOverlayOnlyOnLand(e.target.checked)}
        disabled={!(drawGridOverlay && isVoronoi)}
      />
      <span>{translateLabel('theme.onlyOnLand')}</span>
    </label>
  )
}

function GridLayerSelect({ translateLabel, gatedControlValue, emptyComboOption, gridOverlayLayer, setGridOverlayLayer, drawGridOverlay, gridOverlayLayers }) {
  return (
    <>
      <label htmlFor="grid-layer-input">{translateLabel('theme.layer.label')}</label>
      <select id="grid-layer-input" value={gatedControlValue(gridOverlayLayer)} onChange={(e) => setGridOverlayLayer(e.target.value)} disabled={!drawGridOverlay}>
        {emptyComboOption()}
        {Array.isArray(gridOverlayLayers) ? gridOverlayLayers.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        )) : null}
      </select>
    </>
  )
}

function GridOverlayControls({
  translateLabel,
  gatedControlValue,
  emptyComboOption,
  renderColorControl,
  gridOverlayShape,
  setGridOverlayShape,
  drawGridOverlay,
  isVoronoi,
  isVerticalHex,
  gridOverlayRowOrColCount,
  setGridOverlayRowOrColCount,
  gridOverlayLineWidth,
  setGridOverlayLineWidth,
  gridOverlayColorHex,
  setGridOverlayColorHex,
  showGridPicker,
  setShowGridPicker,
  gridOverlayOffsets,
  gridOverlayXOffset,
  setGridOverlayXOffset,
  gridOverlayYOffset,
  setGridOverlayYOffset,
  drawVoronoiGridOverlayOnlyOnLand,
  setDrawVoronoiGridOverlayOnlyOnLand,
  gridOverlayShapes,
  gridOverlayLayers,
  gridOverlayLayer,
  setGridOverlayLayer,
}) {
  

  return (
    <div className={`control-group${drawGridOverlay ? '' : ' is-disabled'}`} style={drawGridOverlay ? undefined : { opacity: 0.5, pointerEvents: 'none' }}>
      <GridShapeSelect
        translateLabel={translateLabel}
        gatedControlValue={gatedControlValue}
        emptyComboOption={emptyComboOption}
        gridOverlayShape={gridOverlayShape}
        setGridOverlayShape={setGridOverlayShape}
        drawGridOverlay={drawGridOverlay}
        gridOverlayShapes={gridOverlayShapes}
      />
      <GridRowsControl
        translateLabel={translateLabel}
        isVerticalHex={isVerticalHex}
        drawGridOverlay={drawGridOverlay}
        isVoronoi={isVoronoi}
        gatedControlValue={gatedControlValue}
        gridOverlayRowOrColCount={gridOverlayRowOrColCount}
        setGridOverlayRowOrColCount={setGridOverlayRowOrColCount}
      />
      <GridLineWidthControl
        translateLabel={translateLabel}
        drawGridOverlay={drawGridOverlay}
        gridOverlayLineWidth={gridOverlayLineWidth}
        setGridOverlayLineWidth={setGridOverlayLineWidth}
      />
      {renderColorControl({ id: 'grid-color', label: translateLabel('theme.color.label'), hexValue: gridOverlayColorHex, onHexChange: setGridOverlayColorHex, showState: showGridPicker, setShowState: setShowGridPicker, disabled: !drawGridOverlay })}
      <GridOffsetsSelects
        translateLabel={translateLabel}
        drawGridOverlay={drawGridOverlay}
        isVoronoi={isVoronoi}
        gatedControlValue={gatedControlValue}
        gridOverlayXOffset={gridOverlayXOffset}
        setGridOverlayXOffset={setGridOverlayXOffset}
        gridOverlayYOffset={gridOverlayYOffset}
        setGridOverlayYOffset={setGridOverlayYOffset}
        gridOverlayOffsets={gridOverlayOffsets}
        emptyComboOption={emptyComboOption}
      />
      <GridVoronoiToggle
        translateLabel={translateLabel}
        drawGridOverlay={drawGridOverlay}
        isVoronoi={isVoronoi}
        drawVoronoiGridOverlayOnlyOnLand={drawVoronoiGridOverlayOnlyOnLand}
        setDrawVoronoiGridOverlayOnlyOnLand={setDrawVoronoiGridOverlayOnlyOnLand}
      />
      <GridLayerSelect
        translateLabel={translateLabel}
        gatedControlValue={gatedControlValue}
        emptyComboOption={emptyComboOption}
        gridOverlayLayer={gridOverlayLayer}
        setGridOverlayLayer={setGridOverlayLayer}
        drawGridOverlay={drawGridOverlay}
        gridOverlayLayers={gridOverlayLayers}
      />
    </div>
  )
}

export default function BackgroundTab(props) {
  if (props == null) return <div />
  const {
    translateLabel,
    gatedControlValue,
    emptyComboOption,
    renderColorControl,
    notifyManualChange,
    recomposeUsingLastBase,
    textures = [],
    backgroundTypes = [],
    strokeTypes = [],
    // values passed directly
    backgroundType,
    setBackgroundType,
    showTextureOptions = false,
    hasTextures = false,
    textureRef,
    setTextureRef,
    drawRegionBoundaries = false,
    setDrawRegionBoundaries,
    regionBoundaryStyle,
    setRegionBoundaryStyle,
    regionBoundaryWidth = 0,
    setRegionBoundaryWidth,
    regionBoundaryColorHex,
    setRegionBoundaryColorHex,
    showRegionBoundaryPicker = false,
    setShowRegionBoundaryPicker,
    colorizeLand = false,
    setColorizeLand,
    finalLandColoringMethod,
    setFinalLandColoringMethod,
    landColorHex,
    setLandColorHex,
    showLandPicker = false,
    setShowLandPicker,
    colorizeOcean = false,
    setColorizeOcean,
    showOceanPicker = false,
    setShowOceanPicker,
    oceanColorHex,
    setOceanColorHex,
    backgroundSeed,
    sanitizeSeedValue = (v) => v,
    setBackgroundSeed,
    drawGridOverlay = false,
    setDrawGridOverlay,
    gridOverlayShape = '',
    setGridOverlayShape,
    gridOverlayRowOrColCount = 0,
    setGridOverlayRowOrColCount,
    gridOverlayLineWidth = 0,
    setGridOverlayLineWidth,
    gridOverlayColorHex,
    setGridOverlayColorHex,
    gridOverlayOffsets = [],
    gridOverlayXOffset,
    setGridOverlayXOffset,
    gridOverlayYOffset,
    setGridOverlayYOffset,
    gridOverlayLayers = [],
    gridOverlayLayer,
    setGridOverlayLayer,
    backgroundPreviewUrl,
    gridOverlayShapes = [],
    showGridPicker = false,
    setShowGridPicker,
    drawVoronoiGridOverlayOnlyOnLand = false,
    setDrawVoronoiGridOverlayOnlyOnLand,
    // landColoringMethods provided by parent via `options`; use only that
    landColoringMethods,
  } = props

  const isVoronoi = String((gridOverlayShape || '')).toLowerCase().includes('voronoi')
  const lowerShape = String(gridOverlayShape || '').toLowerCase()
  const isVerticalHex = lowerShape.includes('vertical')

  return (
    <div className="fields-grid two-col-layout">
      <div className={`fields-column${drawRegionBoundaries ? '' : ' is-disabled'}`}>
        <label htmlFor="bg-type-input">{translateLabel('theme.background.label')}</label>
        <select
          id="bg-type-input"
          value={gatedControlValue(backgroundType)}
          onChange={(e) => setBackgroundType(e.target.value)}
        >
          {emptyComboOption()}
          {backgroundTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <TextureSelect
          emptyComboOption={emptyComboOption}
          textures={textures}
          hasTextures={hasTextures}
          showTextureOptions={showTextureOptions}
          translateLabel={translateLabel}
          gatedControlValue={gatedControlValue}
          textureRef={textureRef}
          setTextureRef={setTextureRef}
        />

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={drawRegionBoundaries}
            onChange={(e) => setDrawRegionBoundaries(e.target.checked)}
          />
          <span>{translateLabel('theme.drawRegionBoundaries')}</span>
        </label>

        <RegionBoundaryControls
          translateLabel={translateLabel}
          gatedControlValue={gatedControlValue}
          emptyComboOption={emptyComboOption}
          strokeTypes={strokeTypes}
          drawRegionBoundaries={drawRegionBoundaries}
          regionBoundaryStyle={regionBoundaryStyle}
          setRegionBoundaryStyle={setRegionBoundaryStyle}
          regionBoundaryWidth={regionBoundaryWidth}
          setRegionBoundaryWidth={setRegionBoundaryWidth}
          regionBoundaryColorHex={regionBoundaryColorHex}
          setRegionBoundaryColorHex={setRegionBoundaryColorHex}
          showRegionBoundaryPicker={showRegionBoundaryPicker}
          setShowRegionBoundaryPicker={setShowRegionBoundaryPicker}
          renderColorControl={renderColorControl}
        />

        <div />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={colorizeLand}
            onChange={(e) => {
              const v = e.target.checked
              setColorizeLand(v)
              notifyManualChange()
              try {
                recomposeUsingLastBase({ colorizeLand: v })
              } catch (err) {
                if (typeof console !== 'undefined' && console.debug) console.debug('BackgroundTab: recomposeUsingLastBase failed', err)
              }
            }}
          />
          <span>{translateLabel('theme.colorLand')}</span>
        </label>

        <LandColorControls
          translateLabel={translateLabel}
          gatedControlValue={gatedControlValue}
          emptyComboOption={emptyComboOption}
          renderColorControl={renderColorControl}
          colorizeLand={colorizeLand}
          finalLandColoringMethod={finalLandColoringMethod}
          setFinalLandColoringMethod={setFinalLandColoringMethod}
          landColorHex={landColorHex}
          setLandColorHex={setLandColorHex}
          showLandPicker={showLandPicker}
          setShowLandPicker={setShowLandPicker}
          notifyManualChange={notifyManualChange}
          recomposeUsingLastBase={recomposeUsingLastBase}
          landColoringMethods={landColoringMethods}
        />

        <div />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={colorizeOcean}
            onChange={(e) => {
              const v = e.target.checked
              setColorizeOcean(v)
              notifyManualChange()
              try {
                recomposeUsingLastBase({ colorizeOcean: v })
              } catch (err) {
                if (typeof console !== 'undefined' && console.debug) console.debug('BackgroundTab: recomposeUsingLastBase failed', err)
              }
            }}
          />
          <span>{translateLabel('theme.colorOcean')}</span>
        </label>

        <OceanColorControls
          translateLabel={translateLabel}
          renderColorControl={renderColorControl}
          colorizeOcean={colorizeOcean}
          oceanColorHex={oceanColorHex}
          setOceanColorHex={setOceanColorHex}
          showOceanPicker={showOceanPicker}
          setShowOceanPicker={setShowOceanPicker}
          notifyManualChange={notifyManualChange}
          recomposeUsingLastBase={recomposeUsingLastBase}
        />
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

        <GridOverlayControls
          translateLabel={translateLabel}
          gatedControlValue={gatedControlValue}
          emptyComboOption={emptyComboOption}
          renderColorControl={renderColorControl}
          gridOverlayShape={gridOverlayShape}
          setGridOverlayShape={setGridOverlayShape}
          drawGridOverlay={drawGridOverlay}
          isVoronoi={isVoronoi}
          isVerticalHex={isVerticalHex}
          gridOverlayRowOrColCount={gridOverlayRowOrColCount}
          setGridOverlayRowOrColCount={setGridOverlayRowOrColCount}
          gridOverlayLineWidth={gridOverlayLineWidth}
          setGridOverlayLineWidth={setGridOverlayLineWidth}
          gridOverlayColorHex={gridOverlayColorHex}
          setGridOverlayColorHex={setGridOverlayColorHex}
          showGridPicker={showGridPicker}
          setShowGridPicker={setShowGridPicker}
          gridOverlayOffsets={gridOverlayOffsets}
          gridOverlayXOffset={gridOverlayXOffset}
          setGridOverlayXOffset={setGridOverlayXOffset}
          gridOverlayYOffset={gridOverlayYOffset}
          setGridOverlayYOffset={setGridOverlayYOffset}
          drawVoronoiGridOverlayOnlyOnLand={drawVoronoiGridOverlayOnlyOnLand}
          setDrawVoronoiGridOverlayOnlyOnLand={setDrawVoronoiGridOverlayOnlyOnLand}
          gridOverlayShapes={gridOverlayShapes}
          gridOverlayLayers={gridOverlayLayers}
          gridOverlayLayer={gridOverlayLayer}
          setGridOverlayLayer={setGridOverlayLayer}
        />

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

BackgroundTab.propTypes = {
  translateLabel: PropTypes.func,
  gatedControlValue: PropTypes.func,
  emptyComboOption: PropTypes.node,
  renderColorControl: PropTypes.func,
  notifyManualChange: PropTypes.func,
  recomposeUsingLastBase: PropTypes.func,

  textures: PropTypes.array,
  backgroundTypes: PropTypes.array,
  strokeTypes: PropTypes.array,

  backgroundType: PropTypes.string,
  setBackgroundType: PropTypes.func,
  showTextureOptions: PropTypes.bool,
  hasTextures: PropTypes.bool,
  textureRef: PropTypes.string,
  setTextureRef: PropTypes.func,

  drawRegionBoundaries: PropTypes.bool,
  setDrawRegionBoundaries: PropTypes.func,
  regionBoundaryStyle: PropTypes.string,
  setRegionBoundaryStyle: PropTypes.func,
  regionBoundaryWidth: PropTypes.number,
  setRegionBoundaryWidth: PropTypes.func,
  regionBoundaryColorHex: PropTypes.string,
  setRegionBoundaryColorHex: PropTypes.func,
  showRegionBoundaryPicker: PropTypes.bool,
  setShowRegionBoundaryPicker: PropTypes.func,

  colorizeLand: PropTypes.bool,
  setColorizeLand: PropTypes.func,
  finalLandColoringMethod: PropTypes.string,
  setFinalLandColoringMethod: PropTypes.func,
  landColorHex: PropTypes.string,
  setLandColorHex: PropTypes.func,
  showLandPicker: PropTypes.bool,
  setShowLandPicker: PropTypes.func,

  colorizeOcean: PropTypes.bool,
  setColorizeOcean: PropTypes.func,
  showOceanPicker: PropTypes.bool,
  setShowOceanPicker: PropTypes.func,
  oceanColorHex: PropTypes.string,
  setOceanColorHex: PropTypes.func,

  backgroundSeed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sanitizeSeedValue: PropTypes.func,
  setBackgroundSeed: PropTypes.func,

  drawGridOverlay: PropTypes.bool,
  setDrawGridOverlay: PropTypes.func,
  gridOverlayShape: PropTypes.string,
  setGridOverlayShape: PropTypes.func,
  gridOverlayRowOrColCount: PropTypes.number,
  setGridOverlayRowOrColCount: PropTypes.func,
  gridOverlayLineWidth: PropTypes.number,
  setGridOverlayLineWidth: PropTypes.func,
  gridOverlayColorHex: PropTypes.string,
  setGridOverlayColorHex: PropTypes.func,
  gridOverlayOffsets: PropTypes.array,
  gridOverlayXOffset: PropTypes.string,
  setGridOverlayXOffset: PropTypes.func,
  gridOverlayYOffset: PropTypes.string,
  setGridOverlayYOffset: PropTypes.func,
  gridOverlayLayers: PropTypes.array,
  gridOverlayLayer: PropTypes.string,
  setGridOverlayLayer: PropTypes.func,
  gridOverlayShapes: PropTypes.array,
  showGridPicker: PropTypes.bool,
  setShowGridPicker: PropTypes.func,
  drawVoronoiGridOverlayOnlyOnLand: PropTypes.bool,
  setDrawVoronoiGridOverlayOnlyOnLand: PropTypes.func,
  landColoringMethods: PropTypes.array,
  backgroundPreviewUrl: PropTypes.string,
}

RegionBoundaryControls.propTypes = {
  translateLabel: PropTypes.func,
  gatedControlValue: PropTypes.func,
  emptyComboOption: PropTypes.node,
  strokeTypes: PropTypes.array,
  drawRegionBoundaries: PropTypes.bool,
  regionBoundaryStyle: PropTypes.string,
  setRegionBoundaryStyle: PropTypes.func,
  regionBoundaryWidth: PropTypes.number,
  setRegionBoundaryWidth: PropTypes.func,
  regionBoundaryColorHex: PropTypes.string,
  setRegionBoundaryColorHex: PropTypes.func,
  showRegionBoundaryPicker: PropTypes.bool,
  setShowRegionBoundaryPicker: PropTypes.func,
  renderColorControl: PropTypes.func,
}

LandColorControls.propTypes = {
  translateLabel: PropTypes.func,
  gatedControlValue: PropTypes.func,
  emptyComboOption: PropTypes.node,
  renderColorControl: PropTypes.func,
  colorizeLand: PropTypes.bool,
  finalLandColoringMethod: PropTypes.string,
  setFinalLandColoringMethod: PropTypes.func,
  landColorHex: PropTypes.string,
  setLandColorHex: PropTypes.func,
  showLandPicker: PropTypes.bool,
  setShowLandPicker: PropTypes.func,
  notifyManualChange: PropTypes.func,
  recomposeUsingLastBase: PropTypes.func,
  landColoringMethods: PropTypes.array,
}

OceanColorControls.propTypes = {
  translateLabel: PropTypes.func,
  renderColorControl: PropTypes.func,
  colorizeOcean: PropTypes.bool,
  oceanColorHex: PropTypes.string,
  setOceanColorHex: PropTypes.func,
  showOceanPicker: PropTypes.bool,
  setShowOceanPicker: PropTypes.func,
  notifyManualChange: PropTypes.func,
  recomposeUsingLastBase: PropTypes.func,
}

TextureSelect.propTypes = {
  emptyComboOption: PropTypes.node,
  textures: PropTypes.array,
  hasTextures: PropTypes.bool,
  showTextureOptions: PropTypes.bool,
  translateLabel: PropTypes.func,
  gatedControlValue: PropTypes.func,
  textureRef: PropTypes.string,
  setTextureRef: PropTypes.func,
}

GridOverlayControls.propTypes = {
  translateLabel: PropTypes.func,
  gatedControlValue: PropTypes.func,
  emptyComboOption: PropTypes.node,
  renderColorControl: PropTypes.func,
  gridOverlayShape: PropTypes.string,
  setGridOverlayShape: PropTypes.func,
  drawGridOverlay: PropTypes.bool,
  isVoronoi: PropTypes.bool,
  isVerticalHex: PropTypes.bool,
  gridOverlayRowOrColCount: PropTypes.number,
  setGridOverlayRowOrColCount: PropTypes.func,
  gridOverlayLineWidth: PropTypes.number,
  setGridOverlayLineWidth: PropTypes.func,
  gridOverlayColorHex: PropTypes.string,
  setGridOverlayColorHex: PropTypes.func,
  showGridPicker: PropTypes.bool,
  setShowGridPicker: PropTypes.func,
  gridOverlayOffsets: PropTypes.array,
  gridOverlayXOffset: PropTypes.string,
  setGridOverlayXOffset: PropTypes.func,
  gridOverlayYOffset: PropTypes.string,
  setGridOverlayYOffset: PropTypes.func,
  drawVoronoiGridOverlayOnlyOnLand: PropTypes.bool,
  setDrawVoronoiGridOverlayOnlyOnLand: PropTypes.func,
  gridOverlayShapes: PropTypes.array,
  gridOverlayLayers: PropTypes.array,
  gridOverlayLayer: PropTypes.string,
  setGridOverlayLayer: PropTypes.func,
}

GridShapeSelect.propTypes = {
  translateLabel: PropTypes.func,
  gatedControlValue: PropTypes.func,
  emptyComboOption: PropTypes.node,
  gridOverlayShape: PropTypes.string,
  setGridOverlayShape: PropTypes.func,
  drawGridOverlay: PropTypes.bool,
  gridOverlayShapes: PropTypes.array,
}

GridRowsControl.propTypes = {
  translateLabel: PropTypes.func,
  isVerticalHex: PropTypes.bool,
  drawGridOverlay: PropTypes.bool,
  isVoronoi: PropTypes.bool,
  gatedControlValue: PropTypes.func,
  gridOverlayRowOrColCount: PropTypes.number,
  setGridOverlayRowOrColCount: PropTypes.func,
}

GridLineWidthControl.propTypes = {
  translateLabel: PropTypes.func,
  drawGridOverlay: PropTypes.bool,
  gridOverlayLineWidth: PropTypes.number,
  setGridOverlayLineWidth: PropTypes.func,
}

GridOffsetsSelects.propTypes = {
  translateLabel: PropTypes.func,
  drawGridOverlay: PropTypes.bool,
  isVoronoi: PropTypes.bool,
  gatedControlValue: PropTypes.func,
  gridOverlayXOffset: PropTypes.string,
  setGridOverlayXOffset: PropTypes.func,
  gridOverlayYOffset: PropTypes.string,
  setGridOverlayYOffset: PropTypes.func,
  gridOverlayOffsets: PropTypes.array,
  emptyComboOption: PropTypes.node,
}

GridVoronoiToggle.propTypes = {
  translateLabel: PropTypes.func,
  drawGridOverlay: PropTypes.bool,
  isVoronoi: PropTypes.bool,
  drawVoronoiGridOverlayOnlyOnLand: PropTypes.bool,
  setDrawVoronoiGridOverlayOnlyOnLand: PropTypes.func,
}

GridLayerSelect.propTypes = {
  translateLabel: PropTypes.func,
  gatedControlValue: PropTypes.func,
  emptyComboOption: PropTypes.node,
  gridOverlayLayer: PropTypes.string,
  setGridOverlayLayer: PropTypes.func,
  drawGridOverlay: PropTypes.bool,
  gridOverlayLayers: PropTypes.array,
}
