import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import FontsTab from '../tabs/FontsTab'

describe('FontsTab', () => {
  it('toggles font combo and invokes option click handler', () => {
    const setOpenFontComboId = vi.fn()
    const handleFontOptionClick = vi.fn()
    const props = {
      translateLabel: (k) => (k === 'common.choose' ? 'Choose' : k),
      renderColorControl: (opts) => <span key={opts.id}>{opts.label}</span>,
      drawText: true,
      setDrawText: vi.fn(),
      fontFields: [{ id: 'f1', label: 'Title', value: '' }],
      availableFontFamilies: ['Arial'],
      openFontComboId: null,
      setOpenFontComboId,
      handleFontOptionClick,
      textColor: '#000',
      setTextColor: vi.fn(),
    }

    const { rerender } = render(<FontsTab {...props} />)

    // trigger should call setter with the field id
    const trigger = screen.getByText('Choose')
    fireEvent.click(trigger)
    expect(setOpenFontComboId).toHaveBeenCalledWith('f1')

    // render with menu open and click option
    rerender(<FontsTab {...props} openFontComboId={'f1'} />)
    const option = screen.getByText('Arial')
    fireEvent.click(option)
    expect(handleFontOptionClick).toHaveBeenCalled()
  })
})
