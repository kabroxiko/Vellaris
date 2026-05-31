import React from 'react'
import { fontSpecToFamily } from '../utils'
import PropTypes from 'prop-types'

export default function FontsTab(props) {
  if (props == null) return <div />
  const { translateLabel, renderColorControl } = props

  const {
    drawText = false,
    setDrawText,
    fontFields = [],
    availableFontFamilies = [],
    openFontComboId,
    setOpenFontComboId,
    handleFontOptionClick,

    textColor,
    setTextColor,
    showTextColorPicker = false,
    setShowTextColorPicker,

    drawBoldBackground = false,
    setDrawBoldBackground,
    boldBackgroundColor,
    setBoldBackgroundColor,
    showBoldBackgroundPicker = false,
    setShowBoldBackgroundPicker,
  } = props

  // Normalize `availableFontFamilies` which may be an array or a map
  let families
  if (Array.isArray(availableFontFamilies)) {
    families = availableFontFamilies
  } else if (availableFontFamilies && typeof availableFontFamilies === 'object') {
    families = Object.keys(availableFontFamilies)
  } else {
    families = []
  }

  return (
    <div className="fields-grid two-col-layout customize-fonts-panel">
      <div className="fields-column">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={drawText}
            onChange={(e) => setDrawText(e.target.checked)}
          />
          <span>{translateLabel('theme.enableText')}</span>
        </label>

        <div
          className={`control-group${drawText ? '' : ' is-disabled'}`}
          style={drawText ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
        >
          {fontFields.map((field) => (
            <React.Fragment key={field.id}>
              <label htmlFor={field.id}>{field.label}</label>
              <div className="font-combo" id={field.id}>
                <button
                  type="button"
                  className="font-combo-trigger"
                  onClick={() => setOpenFontComboId(openFontComboId === field.id ? null : field.id)}
                  style={{
                    fontFamily: fontSpecToFamily(field.value) || field.value || 'serif',
                    fontStyle: (fontSpecToFamily(field.value) || field.value || '').toLowerCase().includes('chancery') ? 'italic' : 'normal'
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={openFontComboId === field.id}
                  disabled={!drawText}
                >
                  {fontSpecToFamily(field.value) || field.value || translateLabel('common.choose')}
                </button>
                {openFontComboId === field.id && (
                  <div className="font-combo-menu">
                    {families.map((family) => (
                      <button
                        key={family}
                        type="button"
                        className={`font-combo-option${field.value === family ? ' is-selected' : ''}`}
                        data-field-id={field.id}
                        data-family={family}
                        onClick={handleFontOptionClick}
                        style={{
                          fontFamily: fontSpecToFamily(family) || family,
                          fontStyle: (fontSpecToFamily(family) || family).toLowerCase().includes('chancery') ? 'italic' : 'normal'
                        }}
                        disabled={!drawText}
                      >
                          {fontSpecToFamily(family) || family}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="fields-column">
        <div
          className={`control-group${drawText ? '' : ' is-disabled'}`}
          style={drawText ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
        >
          {renderColorControl({
            id: 'text-color',
            label: translateLabel('theme.textColor.label'),
            hexValue: textColor,
            onHexChange: setTextColor,
            showState: showTextColorPicker,
            setShowState: setShowTextColorPicker,
            disabled: !drawText,
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

          <div
            className={`control-group${drawText && drawBoldBackground ? '' : ' is-disabled'}`}
            style={
              drawText && drawBoldBackground ? undefined : { opacity: 0.5, pointerEvents: 'none' }
            }
          >
            {renderColorControl({
              id: 'bold-background-color',
              label: translateLabel('theme.boldBackgroundColor.label'),
              hexValue: boldBackgroundColor,
              onHexChange: setBoldBackgroundColor,
              showState: showBoldBackgroundPicker,
              setShowState: setShowBoldBackgroundPicker,
              disabled: !drawText || !drawBoldBackground,
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

FontsTab.propTypes = {
  translateLabel: PropTypes.func,
  renderColorControl: PropTypes.func,

  drawText: PropTypes.bool,
  setDrawText: PropTypes.func,
  fontFields: PropTypes.array,
  availableFontFamilies: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  openFontComboId: PropTypes.string,
  setOpenFontComboId: PropTypes.func,
  handleFontOptionClick: PropTypes.func,

  textColor: PropTypes.string,
  setTextColor: PropTypes.func,
  showTextColorPicker: PropTypes.bool,
  setShowTextColorPicker: PropTypes.func,

  drawBoldBackground: PropTypes.bool,
  setDrawBoldBackground: PropTypes.func,
  boldBackgroundColor: PropTypes.string,
  setBoldBackgroundColor: PropTypes.func,
  showBoldBackgroundPicker: PropTypes.bool,
  setShowBoldBackgroundPicker: PropTypes.func,
}
