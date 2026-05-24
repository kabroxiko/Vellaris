import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BackgroundTab from '../tabs/BackgroundTab'

describe('BackgroundTab component', () => {
  // skip placeholder render test — component expects props in normal use

  it('disables texture select when no textures available', () => {
    const props = {
      translateLabel: (k) => k,
      gatedControlValue: (v) => v || '',
      emptyComboOption: <option value="">Empty</option>,
      renderColorControl: () => null,
      showTextureOptions: true,
      hasTextures: false,
      textures: [],
    }
    const { getByLabelText } = render(<BackgroundTab {...props} />)
    const select = getByLabelText('theme.texture.label')
    expect(select.disabled).toBeTruthy()
  })

  it('toggles drawRegionBoundaries via checkbox and calls setter', () => {
    const setDrawRegionBoundaries = vi.fn()
    const props = {
      translateLabel: (k) => k,
      gatedControlValue: (v) => v || '',
      emptyComboOption: <option value="">Empty</option>,
      renderColorControl: () => null,
      drawRegionBoundaries: false,
      setDrawRegionBoundaries,
    }
    const { getByLabelText } = render(<BackgroundTab {...props} />)
    const checkbox = getByLabelText('theme.drawRegionBoundaries')
    fireEvent.click(checkbox)
    expect(setDrawRegionBoundaries).toHaveBeenCalledWith(true)
  })

  it('calls recomposeUsingLastBase when land color control onClose runs', () => {
    const recomposeUsingLastBase = vi.fn()
    const setLandColor = vi.fn()
    const notifyManualChange = vi.fn()
    const renderColorControl = ({ id, onClose, onHexChange, hexValue }) => {
      if (id !== 'land-color') return null
      return (
        <>
          <button data-testid="color-change" onClick={() => onHexChange('#112233')}>
            change
          </button>
          <button data-testid="color-close" onClick={onClose}>
            close
          </button>
        </>
      )
    }

    const props = {
      translateLabel: (k) => k,
      gatedControlValue: (v) => v || '',
      emptyComboOption: <option value="">Empty</option>,
      renderColorControl,
      notifyManualChange,
      recomposeUsingLastBase,
      colorizeLand: true,
      landColoringMethod: 'SingleColor',
      landColor: '#001122',
      setLandColor,
    }

    const { getByTestId } = render(<BackgroundTab {...props} />)
    fireEvent.click(getByTestId('color-close'))
    expect(recomposeUsingLastBase).toHaveBeenCalledWith({ landColor: '#001122' })
  })
})
