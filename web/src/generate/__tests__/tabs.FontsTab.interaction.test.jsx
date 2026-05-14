import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FontsTab from '../tabs/FontsTab'

describe('FontsTab interactions', () => {
  it('opens font combo and triggers handleFontOptionClick when option clicked', () => {
    const setOpenFontComboId = vi.fn()
    const handleFontOptionClick = vi.fn()
    const props = {
      translateLabel: (k) => k,
      renderColorControl: () => null,
      drawText: true,
      setDrawText: vi.fn(),
      fontFields: [{ id: 'f1', label: 'Title', value: '' }],
      availableFontFamilies: ['Alpha', 'Beta'],
      openFontComboId: null,
      setOpenFontComboId,
      handleFontOptionClick,
    }

    const { getByRole, getByText } = render(<FontsTab {...props} />)
    const trigger = getByRole('button', { name: 'common.choose' })
    fireEvent.click(trigger)
    // clicking the trigger toggles open id; ensure setter called
    expect(setOpenFontComboId).toHaveBeenCalled()

    // simulate opening by rerendering with openFontComboId set
    const { rerender } = render(<FontsTab {...props} openFontComboId={'f1'} />)
    const option = getByText('Alpha')
    fireEvent.click(option)
    expect(handleFontOptionClick).toHaveBeenCalled()
  })
})
