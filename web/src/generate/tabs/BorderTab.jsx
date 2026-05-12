import React from 'react'
import PropTypes from 'prop-types'

function SliderRow({ id, label, min, max, step, value, onChange, disabled, format }) {
  const displayValue = (() => {
    if (value == null) return null
    return format ? format(value) : Math.round(Number(value))
  })()

  return (
    <>
      <label htmlFor={id} className={disabled ? 'is-disabled' : ''}>{label}</label>
      <div className="slider-row">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          {...(value == null ? {} : { value })}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
        />
        <span className="slider-value">{displayValue}</span>
      </div>
    </>
  )
}

SliderRow.propTypes = {
  id: PropTypes.string,
  label: PropTypes.node,
  min: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  max: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  step: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  format: PropTypes.func,
}

function SelectList({ id, label, value, onChange, disabled, emptyComboOption, items, renderItem }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {emptyComboOption()}
        {Array.isArray(items) ? items.map((item, idx) => renderItem(item, idx)) : null}
      </select>
    </>
  )
}

SelectList.propTypes = {
  id: PropTypes.string,
  label: PropTypes.node,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  emptyComboOption: PropTypes.node,
  items: PropTypes.array,
  renderItem: PropTypes.func,
}

export default function BorderTab(props) {
  if (props == null) return <div />
  const { translateLabel, gatedControlValue, emptyComboOption, renderColorControl } = props

  const {
    drawBorder,
    setDrawBorder,
    borderRef,
    setBorderRef,
    borderTypes,
    borderWidth,
    setBorderWidth,
    borderPosition,
    setBorderPosition,
    borderPositions,
    borderColorOption,
    setBorderColorOption,
    borderColorOptions,
    borderColorHex,
    setBorderColorHex,
    frayedBorder,
    setFrayedBorder,
    frayedBorderBlurLevel,
    setFrayedBorderBlurLevel,
    frayedBorderSize,
    setFrayedBorderSize,
    frayedBorderSeed,
    setFrayedBorderSeed,
    drawGrunge,
    setDrawGrunge,
    grungeWidth,
    setGrungeWidth,
    frayedBorderColorHex,
    setFrayedBorderColorHex,
    showBorderColorPicker,
    setShowBorderColorPicker,
    showFrayedBorderPicker,
    setShowFrayedBorderPicker,
  } = props

  // Runtime debug: log types/values for grunge props to diagnose value/setter swaps
  // debug effect removed
  

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
          className={`control-group${drawBorder ? '' : ' is-disabled'}`}
          style={drawBorder ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
        >
          <label htmlFor="border-type-input">{translateLabel('theme.borderType.label')}</label>
          <select
            id="border-type-input"
            value={gatedControlValue(borderRef)}
            onChange={(e) => setBorderRef(e.target.value)}
            disabled={!drawBorder}
          >
            {emptyComboOption()}
            
            {Array.isArray(borderTypes) ? borderTypes.map((borderType) => {
              const ref = `${borderType.artPack}|${borderType.name}`
              return (
                <option key={ref} value={ref}>
                  {borderType.name} [{borderType.artPack}]
                </option>
              )
            }) : null}
          </select>

          <SliderRow
            id="border-width-input"
            label={translateLabel('theme.borderWidth.label')}
            min={0}
            max={600}
            step={1}
            value={borderWidth}
            onChange={setBorderWidth}
            disabled={!drawBorder}
          />

          <SelectList
            id="border-position-input"
            label={translateLabel('theme.borderPosition.label')}
            value={gatedControlValue(borderPosition)}
            onChange={setBorderPosition}
            disabled={!drawBorder}
            emptyComboOption={emptyComboOption}
            items={borderPositions}
            renderItem={(item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            )}
          />

          <SelectList
            id="border-color-option-input"
            label={translateLabel('theme.borderColor.label')}
            value={gatedControlValue(borderColorOption)}
            onChange={setBorderColorOption}
            disabled={!drawBorder}
            emptyComboOption={emptyComboOption}
            items={borderColorOptions}
            renderItem={(item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            )}
          />

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
            className={`control-group${frayedBorder ? '' : ' is-disabled'}`}
            style={frayedBorder ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
          >
            <SliderRow
              id="frayed-border-blur-input"
              label={translateLabel('theme.shadingWidth.label')}
              min={0}
              max={500}
              step={1}
              value={frayedBorderBlurLevel}
              onChange={setFrayedBorderBlurLevel}
              disabled={!frayedBorder}
            />

            <SliderRow
              id="frayed-border-size-input"
              label={translateLabel('theme.fraySize.label')}
              min={1}
              max={15}
              step={1}
              value={frayedBorderSize}
              onChange={setFrayedBorderSize}
              disabled={!frayedBorder}
            />

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
            className={`control-group${drawGrunge ? '' : ' is-disabled'}`}
            style={drawGrunge ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
          >
            <SliderRow
              id="grunge-width-input"
              label={translateLabel('theme.width.label')}
              min={0}
              max={2000}
              step={1}
              value={grungeWidth}
              onChange={setGrungeWidth}
              disabled={!drawGrunge}
            />

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

BorderTab.propTypes = {
  translateLabel: PropTypes.func,
  gatedControlValue: PropTypes.func,
  emptyComboOption: PropTypes.node,
  renderColorControl: PropTypes.func,

  // border controls
  drawBorder: PropTypes.bool,
  setDrawBorder: PropTypes.func,
  borderRef: PropTypes.string,
  setBorderRef: PropTypes.func,
  borderTypes: PropTypes.array,
  borderWidth: PropTypes.number,
  setBorderWidth: PropTypes.func,
  borderPosition: PropTypes.string,
  setBorderPosition: PropTypes.func,
  borderPositions: PropTypes.array,
  borderColorOption: PropTypes.string,
  setBorderColorOption: PropTypes.func,
  borderColorOptions: PropTypes.array,
  borderColorHex: PropTypes.string,
  setBorderColorHex: PropTypes.func,

  // frayed / grunge
  frayedBorder: PropTypes.bool,
  setFrayedBorder: PropTypes.func,
  frayedBorderBlurLevel: PropTypes.number,
  setFrayedBorderBlurLevel: PropTypes.func,
  frayedBorderSize: PropTypes.number,
  setFrayedBorderSize: PropTypes.func,
  frayedBorderSeed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  setFrayedBorderSeed: PropTypes.func,
  drawGrunge: PropTypes.bool,
  setDrawGrunge: PropTypes.func,
  grungeWidth: PropTypes.number,
  setGrungeWidth: PropTypes.func,
  frayedBorderColorHex: PropTypes.string,
  setFrayedBorderColorHex: PropTypes.func,

  showBorderColorPicker: PropTypes.bool,
  setShowBorderColorPicker: PropTypes.func,
  showFrayedBorderPicker: PropTypes.bool,
  setShowFrayedBorderPicker: PropTypes.func,
}
