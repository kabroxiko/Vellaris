import React from 'react'
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

    textColorHex,
    setTextColorHex,
    showTextColorPicker = false,
    setShowTextColorPicker,

    drawBoldBackground = false,
    setDrawBoldBackground,
    boldBackgroundColorHex,
    setBoldBackgroundColorHex,
    showBoldBackgroundPicker = false,
    setShowBoldBackgroundPicker,
  } = props

  return (
    <div className="fields-grid two-col-layout customize-fonts-panel">
      <div className="fields-column">
        <label className="checkbox-label">
          <input type="checkbox" checked={drawText} onChange={(e) => setDrawText(e.target.checked)} />
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
                  style={{ fontFamily: field.value || 'serif' }}
                  aria-haspopup="listbox"
                  aria-expanded={openFontComboId === field.id}
                  disabled={!drawText}
                >
                  {field.value || translateLabel('common.choose')}
                </button>
                {openFontComboId === field.id && (
                  <div className="font-combo-menu">
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
            hexValue: textColorHex,
            onHexChange: setTextColorHex,
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
            style={drawText && drawBoldBackground ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
          >
            {renderColorControl({
              id: 'bold-background-color',
              label: translateLabel('theme.boldBackgroundColor.label'),
              hexValue: boldBackgroundColorHex,
              onHexChange: setBoldBackgroundColorHex,
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
  availableFontFamilies: PropTypes.array,
  openFontComboId: PropTypes.string,
  setOpenFontComboId: PropTypes.func,
  handleFontOptionClick: PropTypes.func,

  textColorHex: PropTypes.string,
  setTextColorHex: PropTypes.func,
  showTextColorPicker: PropTypes.bool,
  setShowTextColorPicker: PropTypes.func,

  drawBoldBackground: PropTypes.bool,
  setDrawBoldBackground: PropTypes.func,
  boldBackgroundColorHex: PropTypes.string,
  setBoldBackgroundColorHex: PropTypes.func,
  showBoldBackgroundPicker: PropTypes.bool,
  setShowBoldBackgroundPicker: PropTypes.func,
}
