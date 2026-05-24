import React from 'react'
import { render, screen } from '@testing-library/react'
import EffectsTab from '../tabs/EffectsTab'

describe('EffectsTab swatchReplacement', () => {
  it('passes sanitized swatchReplacement when landColoringMethod is ColorPoliticalRegions', () => {
    const renderColorControl = (opts) => (
      <div data-swatch={opts.swatchReplacement}>{opts.label}</div>
    )
    const translateLabel = (k) => {
      if (k === 'theme.coastShadingColor.disabled') return '<b>Disabled {0}</b>'
      if (k === 'LandColoringMethod.ColorPoliticalRegions') return 'Political'
      return k
    }

    const props = {
      translateLabel,
      gatedControlValue: (v) => v,
      emptyComboOption: null,
      renderColorControl,
      landColoringMethod: 'ColorPoliticalRegions',
      oceanShadingLevel: 1,
      oceanShadingColor: '#112233',
      showOceanPicker: false,
      oceanWaveTypes: [],
      oceanWavesType: null,
      concentricWaveValue: 'concentric',
      noneWaveValue: 'none',
      oceanWavesLevel: 0,
      oceanWavesAlpha: 0,
      oceanWavesColor: '#000000',
      showOceanWavesPicker: false,
      coastShadingLevel: 0,
      coastShadingAlpha: 0,
      coastlineWidth: 0,
      coastlineColor: '#000',
    }

    render(<EffectsTab {...props} />)

    const el = screen.getByText('theme.oceanShadingColor.label')
    // element has data-swatch with sanitized replacement containing 'Political'
    expect(el.dataset.swatch).toContain('Political')
  })
})
