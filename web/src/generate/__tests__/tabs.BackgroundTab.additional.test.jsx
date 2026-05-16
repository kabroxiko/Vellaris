import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import BackgroundTab from '../../generate/tabs/BackgroundTab'
import { vi, expect } from 'vitest'

describe('BackgroundTab additional coverage', () => {
  test('renders with minimal props', () => {
    const { container } = render(
      <BackgroundTab translateLabel={(k) => k} gatedControlValue={(v) => v} emptyComboOption={<option />} renderColorControl={() => <div />} />
    )
    expect(container.querySelector('.fields-grid')).toBeTruthy()
  })

  test('GeneratedFromTexture enables colorize toggles and calls recomposeUsingLastBase on change', () => {
    const setColorizeLand = vi.fn()
    const setColorizeOcean = vi.fn()
    const notifyManualChange = vi.fn()
    const recomposeUsingLastBase = vi.fn()
    const translateLabel = (k) => k
    const gatedControlValue = (v) => v

    const { getByLabelText } = render(
      <BackgroundTab
        translateLabel={translateLabel}
        gatedControlValue={gatedControlValue}
        emptyComboOption={<option value="" />}
        renderColorControl={() => <div />}
        notifyManualChange={notifyManualChange}
        recomposeUsingLastBase={recomposeUsingLastBase}
        backgroundTypes={[{ value: 'GeneratedFromTexture', label: 'gen' }]}
        backgroundType={'GeneratedFromTexture'}
        colorizeLand={false}
        setColorizeLand={setColorizeLand}
        colorizeOcean={false}
        setColorizeOcean={setColorizeOcean}
      />
    )

    const landCheckbox = getByLabelText('theme.colorLand')
    fireEvent.click(landCheckbox)
    expect(setColorizeLand).toHaveBeenCalled()
    expect(recomposeUsingLastBase).toHaveBeenCalledWith({ colorizeLand: true })
  })

  test('seed input calls setBackgroundSeed', () => {
    const setBackgroundSeed = vi.fn()
    const translateLabel = (k) => k
    const gatedControlValue = (v) => v
    const { container } = render(
      <BackgroundTab
        translateLabel={translateLabel}
        gatedControlValue={gatedControlValue}
        emptyComboOption={<option value="" />}
        renderColorControl={() => <div />}
        setBackgroundSeed={setBackgroundSeed}
        backgroundSeed={''}
      />
    )

    const seedInput = container.querySelector('#bg-seed-input')
    fireEvent.change(seedInput, { target: { value: '42' } })
    expect(setBackgroundSeed).toHaveBeenCalledWith('42')
  })

  test('grid overlay controls call setters and toggle voronoi checkbox', () => {
    const setGridOverlayRowOrColCount = vi.fn()
    const setGridOverlayLineWidth = vi.fn()
    const setDrawVoronoiGridOverlayOnlyOnLand = vi.fn()
    const translateLabel = (k) => k
    const gatedControlValue = (v) => v

    const { container, getByLabelText } = render(
      <BackgroundTab
        translateLabel={translateLabel}
        gatedControlValue={gatedControlValue}
        emptyComboOption={<option value="" />}
        renderColorControl={() => <div />}
        drawGridOverlay={true}
        gridOverlayShape={'voronoi'}
        gridOverlayRowOrColCount={8}
        setGridOverlayRowOrColCount={setGridOverlayRowOrColCount}
        gridOverlayLineWidth={2}
        setGridOverlayLineWidth={setGridOverlayLineWidth}
        drawVoronoiGridOverlayOnlyOnLand={false}
        setDrawVoronoiGridOverlayOnlyOnLand={setDrawVoronoiGridOverlayOnlyOnLand}
      />
    )

    const rowsInput = container.querySelector('#grid-rows-input')
    fireEvent.change(rowsInput, { target: { value: '12' } })
    expect(setGridOverlayRowOrColCount).toHaveBeenCalledWith(12)

    const linewidthInput = container.querySelector('#grid-linewidth-input')
    fireEvent.change(linewidthInput, { target: { value: '5' } })
    expect(setGridOverlayLineWidth).toHaveBeenCalledWith(5)

    const voronoiCheckbox = getByLabelText('theme.onlyOnLand')
    fireEvent.click(voronoiCheckbox)
    expect(setDrawVoronoiGridOverlayOnlyOnLand).toHaveBeenCalled()
  })

  test('renderColorControl onClose handles recomposeUsingLastBase throwing', () => {
    const recomposeUsingLastBase = vi.fn(() => { throw new Error('boom') })
    const translateLabel = (k) => k
    const gatedControlValue = (v) => v

    const renderColorControl = ({ id, onClose }) => (
      <button data-testid={`rc-${id}`} onClick={() => onClose && onClose()}>
        close
      </button>
    )

    const { getByTestId } = render(
      <BackgroundTab
        translateLabel={translateLabel}
        gatedControlValue={gatedControlValue}
        emptyComboOption={<option value="" />}
        renderColorControl={renderColorControl}
        recomposeUsingLastBase={recomposeUsingLastBase}
      />
    )

    const btn = getByTestId('rc-land-color')
    // should not throw even though recomposeUsingLastBase throws internally
    expect(() => fireEvent.click(btn)).not.toThrow()
  })
})
