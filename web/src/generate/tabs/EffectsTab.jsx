import React from 'react'
import PropTypes from 'prop-types'

export default function EffectsTab(props) {
  if (props == null) return <div />
  const { translateLabel, gatedControlValue, emptyComboOption, renderColorControl } = props

  const {
    lineStyles,
    lineStyle,
    setLineStyle,
    coastlineWidth,
    setCoastlineWidth,
    coastlineColorHex,
    setCoastlineColorHex,
    showCoastlinePicker,
    setShowCoastlinePicker,
    coastShadingLevel,
    setCoastShadingLevel,
    coastShadingAlpha,
    setCoastShadingAlpha,
    finalLandColoringMethod,

    oceanShadingLevel,
    setOceanShadingLevel,
    oceanShadingColorHex,
    setOceanShadingColorHex,
    oceanShadingAlpha,
    setOceanShadingAlpha,
    showOceanPicker,
    setShowOceanPicker,

    oceanWaveTypes,
    oceanWavesType,
    setOceanWavesType,
    concentricWaveValue,
    noneWaveValue,
    oceanWavesLevel,
    setOceanWavesLevel,
    oceanWavesAlpha,
    setOceanWavesAlpha,
    oceanWavesColorHex,
    setOceanWavesColorHex,
    showOceanWavesPicker,
    setShowOceanWavesPicker,

    concentricWaveCount,
    setConcentricWaveCount,
    fadeConcentricWaves,
    setFadeConcentricWaves,
    jitterToConcentricWaves,
    setJitterToConcentricWaves,
    brokenLinesForConcentricWaves,
    setBrokenLinesForConcentricWaves,

    drawOceanEffectsInLakes,
    setDrawOceanEffectsInLakes,

    riverColorHex,
    setRiverColorHex,
    showRiverPicker,
    setShowRiverPicker,

    drawRoads,
    setDrawRoads,
    roadStyle,
    setRoadStyle,
    strokeTypes,
    roadWidth,
    setRoadWidth,
    roadColorHex,
    setRoadColorHex,
    showRoadPicker,
    setShowRoadPicker,

    mountainSize,
    setMountainSize,
    hillSize,
    setHillSize,
    duneSize,
    setDuneSize,
    treeHeight,
    setTreeHeight,
    citySize,
    setCitySize,
  } = props

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
            {Array.isArray(lineStyles)
            ? lineStyles.map((item) => {
                if (item?.value === undefined) return null
                return (
                  <option key={String(item.value)} value={item.value}>
                    {item.label}
                  </option>
                )
              })
            : null}
        </select>

        <label htmlFor="coastline-width-input">{translateLabel('theme.coastlineWidth.label')}</label>
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
          <span className="slider-value">{Number(coastlineWidth).toFixed(1)}</span>
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

        <label htmlFor="coast-shading-level-input">{translateLabel('theme.coastShadingWidth.label')}</label>
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

          <label htmlFor="coast-shading-alpha-input">{translateLabel('theme.coastShadingTransparency.label')}</label>
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

        <label htmlFor="ocean-shading-level-input">{translateLabel('theme.oceanShadingWidth.label')}</label>
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
          let swatchReplacement
          if (shouldReplace) {
            let txt = translateLabel('theme.coastShadingColor.disabled')
            const MAX_SANITIZE_LENGTH = 2000
            if (typeof txt === 'string' && txt.length > MAX_SANITIZE_LENGTH) txt = txt.slice(0, MAX_SANITIZE_LENGTH)
            if (typeof txt === 'string') {
              // Remove HTML tags using a linear-time scanner to avoid ReDoS
              const removeTags = (s) => {
                let out = ''
                let inTag = false
                for (let i = 0; i < s.length; i++) {
                  const ch = s.charAt(i)
                  if (!inTag) {
                    if (ch === '<') {
                      inTag = true
                    } else {
                      out += ch
                    }
                  } else if (ch === '>') inTag = false
                }
                return out
              }
              txt = removeTags(txt)
              txt = txt.replaceAll("''", "'")
            }
            const methodLabel = translateLabel(`LandColoringMethod.${finalLandColoringMethod}`)
            if (typeof txt === 'string' && txt.includes('{0}')) txt = txt.replace('{0}', methodLabel)
            swatchReplacement = txt
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
          {Array.isArray(oceanWaveTypes)
            ? oceanWaveTypes.map((item) => {
                if (item?.value === undefined) return null
                return (
                  <option key={String(item.value)} value={item.value}>
                    {item.label}
                  </option>
                )
              })
            : null}
        </select>

          <label htmlFor="ocean-waves-level-input" className={oceanWavesType === concentricWaveValue ? 'is-disabled' : ''}>{translateLabel('theme.waveWidth.label')}</label>
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

        {renderColorControl({
          id: 'ocean-waves-color',
          label: translateLabel('theme.waveColor.label'),
          hexValue: oceanWavesColorHex,
          onHexChange: setOceanWavesColorHex,
          alphaValue: oceanWavesAlpha,
          onAlphaChange: setOceanWavesAlpha,
          showState: showOceanWavesPicker,
          setShowState: setShowOceanWavesPicker,
          disabled: oceanWavesType === noneWaveValue,
        })}

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

          <label htmlFor="fade-concentric-waves-checkbox" className={`section-subheading ${oceanWavesType === concentricWaveValue ? '' : 'is-disabled'}`} style={{ marginTop: '0.5rem' }}>Style options:</label>

          <div className="style-options">
            <label className={`checkbox-label ${oceanWavesType === concentricWaveValue ? '' : 'is-disabled'}`}>
              <input id="fade-concentric-waves-checkbox" type="checkbox" checked={fadeConcentricWaves} onChange={(e) => setFadeConcentricWaves(e.target.checked)} disabled={oceanWavesType !== concentricWaveValue} />
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

        <div className={`control-group${drawRoads ? '' : ' is-disabled'}`} style={drawRoads ? undefined : { opacity: 0.5, pointerEvents: 'none' }}>
          <label htmlFor="road-style-input">{translateLabel('theme.roadStyle.label')}</label>
          <select
            id="road-style-input"
            value={gatedControlValue(roadStyle)}
            onChange={(e) => setRoadStyle(e.target.value)}
            disabled={!drawRoads}
          >
            {emptyComboOption}
            {Array.isArray(strokeTypes) && strokeTypes.length > 0
              ? strokeTypes.map((item) => {
                  if (item?.value === undefined) return null
                  return (
                    <option key={String(item.value)} value={item.value}>
                      {item.label}
                    </option>
                  )
                })
              : null}
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

        <div className="control-group parameters-group" style={{ marginTop: 8 }}>
          <label htmlFor="mountain-size-input">{translateLabel('theme.mountainSize.label')}</label>
          <div className="slider-row">
            <input id="mountain-size-input" type="range" min={1} max={15} step={1} value={mountainSize} onChange={(e) => setMountainSize(Number(e.target.value))} />
            <span className="slider-value">{mountainSize}</span>
          </div>

          <label htmlFor="hill-size-input">{translateLabel('theme.hillSize.label')}</label>
          <div className="slider-row">
            <input id="hill-size-input" type="range" min={1} max={15} step={1} value={hillSize} onChange={(e) => setHillSize(Number(e.target.value))} />
            <span className="slider-value">{hillSize}</span>
          </div>

          <label htmlFor="dune-size-input">{translateLabel('theme.duneSize.label')}</label>
          <div className="slider-row">
            <input id="dune-size-input" type="range" min={1} max={15} step={1} value={duneSize} onChange={(e) => setDuneSize(Number(e.target.value))} />
            <span className="slider-value">{duneSize}</span>
          </div>

          <label htmlFor="tree-height-input">{translateLabel('theme.treeHeight.label')}</label>
          <div className="slider-row">
            <input id="tree-height-input" type="range" min={1} max={15} step={1} value={treeHeight} onChange={(e) => setTreeHeight(Number(e.target.value))} />
            <span className="slider-value">{treeHeight}</span>
          </div>

          <label htmlFor="city-size-input">{translateLabel('theme.citySize.label')}</label>
          <div className="slider-row">
            <input id="city-size-input" type="range" min={1} max={15} step={1} value={citySize} onChange={(e) => setCitySize(Number(e.target.value))} />
            <span className="slider-value">{citySize}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

EffectsTab.propTypes = {
  translateLabel: PropTypes.func,
  gatedControlValue: PropTypes.func,
  emptyComboOption: PropTypes.node,
  renderColorControl: PropTypes.func,

  lineStyles: PropTypes.array,
  lineStyle: PropTypes.string,
  setLineStyle: PropTypes.func,
  coastlineWidth: PropTypes.number,
  setCoastlineWidth: PropTypes.func,
  coastlineColorHex: PropTypes.string,
  setCoastlineColorHex: PropTypes.func,
  showCoastlinePicker: PropTypes.bool,
  setShowCoastlinePicker: PropTypes.func,
  coastShadingLevel: PropTypes.number,
  setCoastShadingLevel: PropTypes.func,
  coastShadingAlpha: PropTypes.number,
  setCoastShadingAlpha: PropTypes.func,
  finalLandColoringMethod: PropTypes.string,

  oceanShadingLevel: PropTypes.number,
  setOceanShadingLevel: PropTypes.func,
  oceanShadingColorHex: PropTypes.string,
  setOceanShadingColorHex: PropTypes.func,
  oceanShadingAlpha: PropTypes.number,
  setOceanShadingAlpha: PropTypes.func,
  showOceanPicker: PropTypes.bool,
  setShowOceanPicker: PropTypes.func,

  oceanWaveTypes: PropTypes.array,
  oceanWavesType: PropTypes.string,
  setOceanWavesType: PropTypes.func,
  concentricWaveValue: PropTypes.any,
  noneWaveValue: PropTypes.any,
  oceanWavesLevel: PropTypes.number,
  setOceanWavesLevel: PropTypes.func,
  oceanWavesAlpha: PropTypes.number,
  setOceanWavesAlpha: PropTypes.func,
  oceanWavesColorHex: PropTypes.string,
  setOceanWavesColorHex: PropTypes.func,
  showOceanWavesPicker: PropTypes.bool,
  setShowOceanWavesPicker: PropTypes.func,

  concentricWaveCount: PropTypes.number,
  setConcentricWaveCount: PropTypes.func,
  fadeConcentricWaves: PropTypes.bool,
  setFadeConcentricWaves: PropTypes.func,
  jitterToConcentricWaves: PropTypes.bool,
  setJitterToConcentricWaves: PropTypes.func,
  brokenLinesForConcentricWaves: PropTypes.bool,
  setBrokenLinesForConcentricWaves: PropTypes.func,

  drawOceanEffectsInLakes: PropTypes.bool,
  setDrawOceanEffectsInLakes: PropTypes.func,

  riverColorHex: PropTypes.string,
  setRiverColorHex: PropTypes.func,
  showRiverPicker: PropTypes.bool,
  setShowRiverPicker: PropTypes.func,

  drawRoads: PropTypes.bool,
  setDrawRoads: PropTypes.func,
  roadStyle: PropTypes.string,
  setRoadStyle: PropTypes.func,
  strokeTypes: PropTypes.array,
  roadWidth: PropTypes.number,
  setRoadWidth: PropTypes.func,
  roadColorHex: PropTypes.string,
  setRoadColorHex: PropTypes.func,
  showRoadPicker: PropTypes.bool,
  setShowRoadPicker: PropTypes.func,

  mountainSize: PropTypes.number,
  setMountainSize: PropTypes.func,
  hillSize: PropTypes.number,
  setHillSize: PropTypes.func,
  duneSize: PropTypes.number,
  setDuneSize: PropTypes.func,
  treeHeight: PropTypes.number,
  setTreeHeight: PropTypes.func,
  citySize: PropTypes.number,
  setCitySize: PropTypes.func,
}
