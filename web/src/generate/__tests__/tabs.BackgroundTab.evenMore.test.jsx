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

test('preview shows image when backgroundPreviewUrl provided', () => {
  render(<BackgroundTab {...baseProps} backgroundPreviewUrl={'data:,x'} />)
  const img = screen.getByAltText('theme.background.label')
  expect(img).toBeTruthy()
})

test('seed input triggers setter on change', () => {
  const setBackgroundSeed = vi.fn()
  render(<BackgroundTab {...baseProps} setBackgroundSeed={setBackgroundSeed} backgroundSeed={''} />)
  const input = screen.getByLabelText('theme.randomSeed.label')
  fireEvent.change(input, { target: { value: '42' } })
  expect(setBackgroundSeed).toHaveBeenCalledWith('42')
})

test('grid layer and shape selects call setters when changed', () => {
  const setGridOverlayLayer = vi.fn()
  const setGridOverlayShape = vi.fn()
  const layers = [{ value: 'layerA', label: 'Layer A' }]
  const shapes = [{ value: 'square', label: 'Square' }, { value: 'voronoi', label: 'Voronoi' }]

  render(
    <BackgroundTab
      {...baseProps}
      drawGridOverlay={true}
      gridOverlayLayers={layers}
      gridOverlayShapes={shapes}
      setGridOverlayLayer={setGridOverlayLayer}
      setGridOverlayShape={setGridOverlayShape}
    />
  )

  const layerSelect = screen.getByLabelText('theme.layer.label')
  fireEvent.change(layerSelect, { target: { value: 'layerA' } })
  expect(setGridOverlayLayer).toHaveBeenCalledWith('layerA')

  const shapeSelect = screen.getByLabelText('theme.shape.label')
  fireEvent.change(shapeSelect, { target: { value: 'voronoi' } })
  expect(setGridOverlayShape).toHaveBeenCalledWith('voronoi')
})

test('grid rows and line width sliders call setters', () => {
  const setGridOverlayRowOrColCount = vi.fn()
  const setGridOverlayLineWidth = vi.fn()
  render(
    <BackgroundTab
      {...baseProps}
      drawGridOverlay={true}
      setGridOverlayRowOrColCount={setGridOverlayRowOrColCount}
      setGridOverlayLineWidth={setGridOverlayLineWidth}
      gridOverlayRowOrColCount={0}
      gridOverlayLineWidth={0}
    />
  )

  const rowsInput = screen.getByLabelText('theme.rows.label')
  fireEvent.change(rowsInput, { target: { value: '12' } })
  expect(setGridOverlayRowOrColCount).toHaveBeenCalledWith(12)

  const lwInput = screen.getByLabelText('theme.lineWidth.label')
  fireEvent.change(lwInput, { target: { value: '3' } })
  expect(setGridOverlayLineWidth).toHaveBeenCalledWith(3)
})

test('region boundary controls are disabled when drawRegionBoundaries=false', () => {
  render(<BackgroundTab {...baseProps} drawRegionBoundaries={false} />)
  const styleSelect = screen.getByLabelText('theme.style.label')
  const widthInput = screen.getByLabelText('theme.regionBoundaryWidth.help')
  expect(styleSelect.disabled).to.equal(true)
  expect(widthInput.disabled).to.equal(true)
})
