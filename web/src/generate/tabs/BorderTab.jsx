import React from 'react'

export default function BorderTab({ context }) {
  if (!context) return <div />
  const { translateLabel, gatedControlValue, emptyComboOption, renderColorControl } = context
  const get = (k) => (context[k] !== undefined ? context[k] : (context.values && context.values[k]))

  const drawBorder = get('drawBorder')
  const setDrawBorder = get('setDrawBorder')
  const borderRef = get('borderRef')
  const setBorderRef = get('setBorderRef')
  const borderTypes = get('borderTypes')
  const borderWidth = get('borderWidth')
  const setBorderWidth = get('setBorderWidth')
  const borderPosition = get('borderPosition')
  const setBorderPosition = get('setBorderPosition')
  const borderPositions = get('borderPositions')
  const borderColorOption = get('borderColorOption')
  const setBorderColorOption = get('setBorderColorOption')
  const borderColorOptions = get('borderColorOptions')
  const borderColorHex = get('borderColorHex')
  const setBorderColorHex = get('setBorderColorHex')
  const frayedBorder = get('frayedBorder')
  const setFrayedBorder = get('setFrayedBorder')
  const frayedBorderBlurLevel = get('frayedBorderBlurLevel')
  const setFrayedBorderBlurLevel = get('setFrayedBorderBlurLevel')
  const frayedBorderSize = get('frayedBorderSize')
  const setFrayedBorderSize = get('setFrayedBorderSize')
  const frayedBorderSeed = get('frayedBorderSeed')
  const setFrayedBorderSeed = get('setFrayedBorderSeed')
  const drawGrunge = get('drawGrunge')
  const setDrawGrunge = get('setDrawGrunge')
  const grungeWidth = get('grungeWidth')
  const setGrungeWidth = get('setGrungeWidth')
  const frayedBorderColorHex = get('frayedBorderColorHex')
  const setFrayedBorderColorHex = get('setFrayedBorderColorHex')

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
            {(borderTypes || []).map((borderType) => {
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
            {(borderPositions || []).map((item) => (
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
            {(borderColorOptions || []).map((item) => (
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
              showState: context.showBorderColorPicker,
              setShowState: context.setShowBorderColorPicker,
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
              showState: context.showFrayedBorderPicker,
              setShowState: context.setShowFrayedBorderPicker,
              disabled: !drawGrunge,
            })}
          </div>
        </div>
      </div>
  )
}
