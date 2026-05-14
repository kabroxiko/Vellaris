import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EffectsTab from '../tabs/EffectsTab'

describe('EffectsTab swatchReplacement sanitization', () => {
  it('sanitizes swatchReplacement and disables ocean picker when replaced', () => {
    const translateLabel = (k) => {
      if (k === 'theme.coastShadingColor.disabled') return "This is <b>disabled</b> for {0}''"
      if (k.startsWith('LandColoringMethod.')) return 'PolReg'
      return k
    }

    const renderColorControl = ({ id, swatchReplacement, disabled }) => (
      <div data-testid={`color-${id}`} data-swatch={swatchReplacement || ''} data-disabled={disabled ? '1' : '0'} />
    )

    render(
      <EffectsTab
        translateLabel={translateLabel}
        gatedControlValue={(v) => v}
        emptyComboOption={<option value="">-</option>}
        renderColorControl={renderColorControl}
        // props used by the swatch replacement path
        finalLandColoringMethod={'ColorPoliticalRegions'}
        oceanWavesType={null}
        concentricWaveValue={'concentric'}
        noneWaveValue={'none'}
        oceanWavesLevel={10}
        concentricWaveCount={2}
        fadeConcentricWaves={false}
        jitterToConcentricWaves={false}
        brokenLinesForConcentricWaves={false}
        drawOceanEffectsInLakes={false}
        // color fields
        coastlineColorHex={null}
        oceanShadingColorHex={null}
        showOceanPicker={false}
      />
    )

    const oceanColor = screen.getByTestId('color-ocean-shading-color')
    // swatchReplacement should have had HTML removed and placeholder replaced
    expect(oceanColor.getAttribute('data-swatch')).toContain('PolReg')
    expect(oceanColor.getAttribute('data-swatch')).not.toMatch(/[<>]/)
    // when replaced, disabled flag should be set
    expect(oceanColor.getAttribute('data-disabled')).toBe('1')
  })
})
