import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import BorderTab from '../tabs/BorderTab'

describe('BorderTab', () => {
  it('renders border controls and calls setters when toggled/changed', () => {
    const spies = {
      setDrawBorder: vi.fn(),
      setBorderRef: vi.fn(),
      setBorderWidth: vi.fn(),
      setBorderPosition: vi.fn(),
      setBorderColorOption: vi.fn(),
      setBorderColorHex: vi.fn(),
      setFrayedBorder: vi.fn(),
      setFrayedBorderBlurLevel: vi.fn(),
      setFrayedBorderSize: vi.fn(),
      setFrayedBorderSeed: vi.fn(),
      setDrawGrunge: vi.fn(),
      setGrungeWidth: vi.fn(),
      setFrayedBorderColorHex: vi.fn(),
    }

    const props = {
      translateLabel: (k) => k,
      gatedControlValue: (v) => v,
      emptyComboOption: <option value="">(none)</option>,
      renderColorControl: (opts) => <span data-testid={opts.id}>{opts.label}</span>,
      drawBorder: true,
      borderTypes: [{ artPack: 'packA', name: 'borderA' }],
      borderRef: 'packA|borderA',
      borderWidth: 10,
      borderPosition: 'inside',
      borderPositions: [{ value: 'inside', label: 'Inside' }],
      borderColorOption: 'Default',
      borderColorOptions: [{ value: 'Default', label: 'Default' }, { value: 'Choose_color', label: 'Choose' }],
      borderColorHex: '#000000',
      frayedBorder: false,
      frayedBorderBlurLevel: 2,
      frayedBorderSize: 3,
      frayedBorderSeed: 'seed',
      drawGrunge: false,
      grungeWidth: 0,
      frayedBorderColorHex: '#111111',
      showBorderColorPicker: false,
      showFrayedBorderPicker: false,
      ...spies,
    }

    render(<BorderTab {...props} />)

    // checkbox toggles
    const checkbox = screen.getByLabelText('theme.drawBorder')
    fireEvent.click(checkbox)
    expect(props.setDrawBorder).toHaveBeenCalled()

    // change border select
    const select = screen.getByLabelText('theme.borderType.label')
    fireEvent.change(select, { target: { value: 'packA|borderA' } })
    expect(props.setBorderRef).toHaveBeenCalled()
  })
})
