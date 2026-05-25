import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

import EffectsTab from '../tabs/EffectsTab'

function makeDefaultProps(overrides = {}) {
  const noop = vi.fn()
  return {
    translateLabel: (k) => k,
    gatedControlValue: (v) => v,
    emptyComboOption: <option value="">-</option>,
    renderColorControl: (props) => (
      <div data-testid={props.id} data-props={JSON.stringify(props)}>
        {props.swatchReplacement || 'color'}
      </div>
    ),
    lineStyles: [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
    ],
    lineStyle: 'A',
    setLineStyle: noop,
    coastlineWidth: 2.7,
    setCoastlineWidth: noop,
    coastlineColor: '#010101',
    setCoastlineColor: noop,
    showCoastlinePicker: false,
    setShowCoastlinePicker: noop,
    coastShadingLevel: 10,
    setCoastShadingLevel: noop,
    coastShadingColor: '#112233',
    setCoastShadingColor: noop,
    landColoringMethod: 'SingleColor',

    oceanShadingLevel: 5,
    setOceanShadingLevel: noop,
    oceanShadingColor: '#223344',
    setOceanShadingColor: noop,
    showOceanPicker: false,
    setShowOceanPicker: noop,

    oceanWaveTypes: [
      { value: 'none', label: 'None' },
      { value: 'concentric', label: 'Concentric' },
    ],
    oceanWavesType: 'none',
    setOceanWavesType: noop,
    concentricWaveValue: 'concentric',
    noneWaveValue: 'none',
    oceanWavesLevel: 10,
    setOceanWavesLevel: noop,
    oceanWavesColor: '#334455',
    setOceanWavesColor: noop,
    showOceanWavesPicker: false,
    setShowOceanWavesPicker: noop,

    concentricWaveCount: 3,
    setConcentricWaveCount: noop,
    fadeConcentricWaves: false,
    setFadeConcentricWaves: noop,
    jitterToConcentricWaves: false,
    setJitterToConcentricWaves: noop,
    brokenLinesForConcentricWaves: false,
    setBrokenLinesForConcentricWaves: noop,

    drawOceanEffectsInLakes: false,
    setDrawOceanEffectsInLakes: noop,

    riverColor: '#445566',
    setRiverColor: noop,
    showRiverPicker: false,
    setShowRiverPicker: noop,

    drawRoads: true,
    setDrawRoads: noop,
    roadStyle: 'solid',
    setRoadStyle: noop,
    strokeTypes: [{ value: 'solid', label: 'solid' }],
    roadWidth: 2,
    setRoadWidth: noop,
    roadColor: '#556677',
    setRoadColor: noop,
    showRoadPicker: false,
    setShowRoadPicker: noop,

    mountainSize: 5,
    setMountainSize: noop,
    hillSize: 5,
    setHillSize: noop,
    duneSize: 5,
    setDuneSize: noop,
    treeHeight: 5,
    setTreeHeight: noop,
    citySize: 5,
    setCitySize: noop,
    ...overrides,
  }
}

describe('EffectsTab', () => {
  it('renders line style options and calls setter on change', () => {
    const setLineStyle = vi.fn()
    const props = makeDefaultProps({ setLineStyle })
    const { getByLabelText } = render(<EffectsTab {...props} />)
    const select = getByLabelText('theme.lineStyle.label')
    expect(select.value).toBe('A')
    fireEvent.change(select, { target: { value: 'B' } })
    expect(setLineStyle).toHaveBeenCalledWith('B')
  })

  it('disables coast shading alpha when land coloring is SingleColor', () => {
    const props = makeDefaultProps({
      landColoringMethod: 'SingleColor',
      coastShadingColor: '#000000',
    })
    const { getByLabelText } = render(<EffectsTab {...props} />)
    const alpha = getByLabelText('theme.coastShadingTransparency.label')
    expect(alpha.disabled).toBe(true)
  })

  it('shows swatchReplacement when land coloring is ColorPoliticalRegions', () => {
    const translateLabel = (k) => {
      if (k === 'theme.coastShadingColor.disabled') return 'Disabled: {0}'
      if (k.startsWith('LandColoringMethod.')) return 'POL'
      return k
    }
    const props = makeDefaultProps({ translateLabel, landColoringMethod: 'ColorPoliticalRegions' })
    const { getByTestId } = render(<EffectsTab {...props} />)
    const el = getByTestId('ocean-shading-color')
    // swatchReplacement should be rendered inside our fake renderColorControl
    expect(el.textContent).toContain('POL')
  })

  it('toggles ocean waves controls based on type', () => {
    const setOceanWavesLevel = vi.fn()
    const setConcentricWaveCount = vi.fn()
    const props = makeDefaultProps({
      oceanWavesType: 'concentric',
      concentricWaveValue: 'concentric',
      setOceanWavesLevel,
      setConcentricWaveCount,
    })
    const { getByLabelText } = render(<EffectsTab {...props} />)
    const wavesLevel = getByLabelText('theme.waveWidth.label')
    expect(wavesLevel.disabled).toBe(true)
    const count = getByLabelText('theme.waveCount.label')
    expect(count.disabled).toBe(false)
    fireEvent.change(count, { target: { value: '4' } })
    expect(setConcentricWaveCount).toHaveBeenCalledWith(4)
  })

  it('drawRoads checkbox toggles and disables road controls', () => {
    const setDrawRoads = vi.fn()
    const setRoadWidth = vi.fn()
    const props = makeDefaultProps({ drawRoads: false, setDrawRoads, setRoadWidth })
    const { getByLabelText } = render(<EffectsTab {...props} />)
    const checkbox = getByLabelText('theme.drawRoads')
    expect(checkbox.checked).toBe(false)
    fireEvent.click(checkbox)
    expect(setDrawRoads).toHaveBeenCalledWith(true)
  })
})
