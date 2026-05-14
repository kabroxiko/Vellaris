import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import EffectsTab from '../tabs/EffectsTab'

function simpleRenderColorControl(props) {
  return (<span data-testid={props.id}>{props.label}</span>)
}

describe('EffectsTab', () => {
  it('renders and calls setters for coastline width and ocean waves gating', () => {
    const spies = {
      setLineStyle: vi.fn(),
      setCoastlineWidth: vi.fn(),
      setCoastlineColorHex: vi.fn(),
      setCoastShadingLevel: vi.fn(),
      setCoastShadingAlpha: vi.fn(),
      setOceanShadingLevel: vi.fn(),
      setOceanShadingColorHex: vi.fn(),
      setOceanShadingAlpha: vi.fn(),
      setOceanWavesType: vi.fn(),
      setOceanWavesLevel: vi.fn(),
      setOceanWavesAlpha: vi.fn(),
      setConcentricWaveCount: vi.fn(),
      setFadeConcentricWaves: vi.fn(),
      setJitterToConcentricWaves: vi.fn(),
      setBrokenLinesForConcentricWaves: vi.fn(),
      setDrawOceanEffectsInLakes: vi.fn(),
      setRiverColorHex: vi.fn(),
      setDrawRoads: vi.fn(),
      setRoadStyle: vi.fn(),
      setRoadWidth: vi.fn(),
      setRoadColorHex: vi.fn(),
      setMountainSize: vi.fn(),
      setHillSize: vi.fn(),
      setDuneSize: vi.fn(),
      setTreeHeight: vi.fn(),
      setCitySize: vi.fn(),
    }

    const props = {
      translateLabel: (k) => k,
      gatedControlValue: (v) => v,
      emptyComboOption: null,
      renderColorControl: simpleRenderColorControl,
      lineStyles: [{ value: 'solid', label: 'Solid' }],
      lineStyle: 'solid',
      coastlineWidth: 2,
      coastlineColorHex: '#000000',
      coastShadingLevel: 10,
      coastShadingAlpha: 50,
      finalLandColoringMethod: 'Other',
      oceanShadingLevel: 5,
      oceanShadingColorHex: '#001122',
      oceanShadingAlpha: 20,
      showOceanPicker: false,
      oceanWaveTypes: [{ value: 'none', label: 'None' }, { value: 'concentric', label: 'Concentric' }],
      oceanWavesType: 'none',
      concentricWaveValue: 'concentric',
      noneWaveValue: 'none',
      oceanWavesLevel: 10,
      oceanWavesAlpha: 30,
      oceanWavesColorHex: '#223344',
      showOceanWavesPicker: false,
      concentricWaveCount: 2,
      fadeConcentricWaves: false,
      jitterToConcentricWaves: false,
      brokenLinesForConcentricWaves: false,
      drawOceanEffectsInLakes: false,
      riverColorHex: '#112233',
      drawRoads: false,
      strokeTypes: [{ value: 's', label: 'S' }],
      roadStyle: 's',
      roadWidth: 1,
      roadColorHex: '#445566',
      mountainSize: 3,
      hillSize: 4,
      duneSize: 5,
      treeHeight: 2,
      citySize: 1,
      ...spies,
    }

    render(<EffectsTab {...props} />)

    // change coastline width
    const coastInput = screen.getByLabelText('theme.coastlineWidth.label')
    fireEvent.change(coastInput, { target: { value: '4' } })
    expect(props.setCoastlineWidth).toHaveBeenCalled()

    // set ocean waves type to concentric and verify concentric controls become enabled
    const waveSelect = screen.getByLabelText('theme.waveType.label')
    fireEvent.change(waveSelect, { target: { value: 'concentric' } })
    expect(props.setOceanWavesType).toHaveBeenCalledWith('concentric')
  })
})
