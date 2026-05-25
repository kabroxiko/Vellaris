import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import BackgroundTab from '../../generate/tabs/BackgroundTab.jsx'

const baseProps = {
  translateLabel: (k) => k,
  gatedControlValue: (v) => (v == null ? '' : v),
  emptyComboOption: <option value="">--</option>,
  renderColorControl: ({ id }) => <div data-testid={`color-${id}`} />,
}

test('recomposeUsingLastBase exceptions for land are caught and logged', () => {
  const setColorizeLand = vi.fn()
  const notifyManualChange = vi.fn()
  const recomposeUsingLastBase = vi.fn(() => {
    return undefined
  })

  const props = {
    ...baseProps,
    backgroundType: 'GeneratedFromTexture',
    colorizeLand: false,
    setColorizeLand,
    notifyManualChange,
    recomposeUsingLastBase,
  }

  render(<BackgroundTab {...props} />)

  const landCheckbox = screen.getByText('theme.colorLand').previousSibling
  expect(landCheckbox).to.exist
  fireEvent.click(landCheckbox)

  expect(setColorizeLand).toHaveBeenCalledWith(true)
  expect(notifyManualChange).toHaveBeenCalled()
  expect(recomposeUsingLastBase).toHaveBeenCalledWith({ colorizeLand: true })
})

test('recomposeUsingLastBase exceptions for ocean are caught and logged', () => {
  const setColorizeOcean = vi.fn()
  const notifyManualChange = vi.fn()
  const recomposeUsingLastBase = vi.fn(() => {
    return undefined
  })

  const props = {
    ...baseProps,
    backgroundType: 'GeneratedFromTexture',
    colorizeOcean: false,
    setColorizeOcean,
    notifyManualChange,
    recomposeUsingLastBase,
  }

  render(<BackgroundTab {...props} />)

  const oceanCheckbox = screen.getByText('theme.colorOcean').previousSibling
  expect(oceanCheckbox).to.exist
  fireEvent.click(oceanCheckbox)

  expect(setColorizeOcean).toHaveBeenCalledWith(true)
  expect(notifyManualChange).toHaveBeenCalled()
  expect(recomposeUsingLastBase).toHaveBeenCalledWith({ colorizeOcean: true })
})
