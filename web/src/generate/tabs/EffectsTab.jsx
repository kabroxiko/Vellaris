import React from 'react'

export default function EffectsTab(props) {
  if (!props) return <div />
  const { translateLabel, gatedControlValue, emptyComboOption, renderColorControl } = props

  const {
    lineStyles = [],
    lineStyle,
    setLineStyle,
    coastlineWidth = 0,
    setCoastlineWidth,
    coastlineColorHex,
    setCoastlineColorHex,
    showCoastlinePicker = false,
    setShowCoastlinePicker,
    coastShadingLevel = 0,
    setCoastShadingLevel,
    coastShadingAlpha = 0,
    setCoastShadingAlpha,
    finalLandColoringMethod,

    oceanShadingLevel = 0,
    setOceanShadingLevel,
    oceanShadingColorHex,
    setOceanShadingColorHex,
    oceanShadingAlpha = 0,
    setOceanShadingAlpha,
    showOceanPicker = false,
    setShowOceanPicker,

    oceanWaveTypes = [],
    oceanWavesType,
    setOceanWavesType,
    concentricWaveValue,
    noneWaveValue,
    oceanWavesLevel = 0,
    setOceanWavesLevel,
    oceanWavesAlpha = 0,
    setOceanWavesAlpha,
    oceanWavesColorHex,
    setOceanWavesColorHex,
    showOceanWavesPicker = false,
    setShowOceanWavesPicker,

    concentricWaveCount = 0,
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
    showRiverPicker = false,
    setShowRiverPicker,

    drawRoads,
    setDrawRoads,
    roadStyle,
    setRoadStyle,
    strokeTypes = [],
    roadWidth = 0,
    setRoadWidth,
    roadColorHex,
    setRoadColorHex,
    showRoadPicker = false,
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
          {lineStyles.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
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

        <>
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
        </>

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
          let swatchReplacement = undefined
          if (shouldReplace) {
            try {
              let txt = translateLabel('theme.coastShadingColor.disabled')
              if (typeof txt === 'string') {
                txt = txt.replace(/<[^>]*>/g, '')
                txt = txt.replace(/''/g, "'")
              }
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

        <>
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
        </>

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

        <div className={`control-group${!drawRoads ? ' is-disabled' : ''}`} style={!drawRoads ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
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
