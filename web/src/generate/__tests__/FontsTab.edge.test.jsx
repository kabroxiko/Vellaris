import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FontsTab from '../tabs/FontsTab'

describe('FontsTab interactions', () => {
  it('renders font options and calls handler when option clicked', () => {
    const translateLabel = (k) => k
    const handleFontOptionClick = vi.fn()

    const fontFields = [{ id: 'f1', label: 'Field 1', value: '' }]
    render(
      <FontsTab
        translateLabel={translateLabel}
        renderColorControl={() => <div />}
        drawText={true}
        setDrawText={() => {}}
        fontFields={fontFields}
        availableFontFamilies={['Arial', 'Times New Roman']}
        openFontComboId={'f1'}
        setOpenFontComboId={() => {}}
        handleFontOptionClick={handleFontOptionClick}
      />
    )

    const option = screen.getByText('Arial')
    fireEvent.click(option)
    expect(handleFontOptionClick).toHaveBeenCalled()
  })
})
