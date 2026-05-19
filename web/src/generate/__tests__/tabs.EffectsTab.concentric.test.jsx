import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import EffectsTab from '../tabs/EffectsTab'

describe('EffectsTab concentric waves behavior', () => {
  it('disables wave level when concentric selected and enables concentric controls', () => {
    const setters = {
      setOceanWavesLevel: vi.fn(),
      setConcentricWaveCount: vi.fn(),
      setFadeConcentricWaves: vi.fn(),
      setJitterToConcentricWaves: vi.fn(),
      setBrokenLinesForConcentricWaves: vi.fn(),
    }

    const props = {
      translateLabel: (k) => k,
      gatedControlValue: (v) => v,
      emptyComboOption: <option value="">Empty</option>,
      renderColorControl: () => null,
      oceanWaveTypes: [
        { value: 'none', label: 'None' },
        { value: 'concentric', label: 'Concentric' },
      ],
      oceanWavesType: 'concentric',
      concentricWaveValue: 'concentric',
      noneWaveValue: 'none',
      oceanWavesLevel: 10,
      setOceanWavesLevel: setters.setOceanWavesLevel,
      concentricWaveCount: 2,
      setConcentricWaveCount: setters.setConcentricWaveCount,
      fadeConcentricWaves: false,
      setFadeConcentricWaves: setters.setFadeConcentricWaves,
      jitterToConcentricWaves: false,
      setJitterToConcentricWaves: setters.setJitterToConcentricWaves,
      brokenLinesForConcentricWaves: false,
      setBrokenLinesForConcentricWaves: setters.setBrokenLinesForConcentricWaves,
    }

    const { getByLabelText } = render(<EffectsTab {...props} />)

    const waveLevel = getByLabelText('theme.waveWidth.label')
    expect(waveLevel.disabled).toBeTruthy()

    const concentricCount = getByLabelText('theme.waveCount.label')
    expect(concentricCount.disabled).toBeFalsy()

    const fadeCheckbox = getByLabelText('theme.fadeOuterWaves')
    fireEvent.click(fadeCheckbox)
    expect(setters.setFadeConcentricWaves).toHaveBeenCalledWith(true)
  })
})
