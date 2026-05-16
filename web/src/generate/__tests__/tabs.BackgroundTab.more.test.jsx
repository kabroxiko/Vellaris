import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import BackgroundTab from '../../generate/tabs/BackgroundTab.jsx'

const baseProps = {
  translateLabel: (k) => k,
  gatedControlValue: (v) => (v == null ? '' : v),
  emptyComboOption: <option value="">--</option>,
  renderColorControl: ({ id }) => <div data-testid={`color-${id}`} />,
  notifyManualChange: () => {},
  recomposeUsingLastBase: () => {},
  backgroundTypes: [{ value: 'SolidColor', label: 'Solid' }, { value: 'GeneratedFromTexture', label: 'Generated' }],
  textures: [],
  strokeTypes: [],
}

test('returns empty div when props are null/undefined', () => {
  // call the component function directly with null to exercise the early-return branch
  const el = BackgroundTab(null)
  // should return a React element for a div
  expect(el && el.type).to.equal('div')
})

test('TextureSelect renders no-textures option and is disabled when hasTextures=false', () => {
  render(
    <BackgroundTab
      {...baseProps}
      textures={[]}
      hasTextures={false}
      showTextureOptions={true}
    />
  )

  const select = screen.getByLabelText('theme.texture.label')
  expect(select).to.exist
  // select should be disabled because there are no textures
  expect(select.disabled).to.equal(true)
  // the "none available" option should be present
  expect(screen.getByText('ui.texture.noneAvailable')).to.exist
})

test('TextureSelect renders available textures when provided', () => {
  const textures = [{ artPack: 'packA', name: 'image1.png' }, { artPack: 'packB', name: 'tile.jpg' }]
  render(
    <BackgroundTab
      {...baseProps}
      textures={textures}
      hasTextures={true}
      showTextureOptions={true}
    />
  )

  const optionA = screen.getByText(/image1 \[packA\]/)
  const optionB = screen.getByText(/tile \[packB\]/)
  expect(optionA).to.exist
  expect(optionB).to.exist
})

test('GridOffsetsSelects shows offset options when drawGridOverlay=true and not Voronoi', () => {
  const offsets = [{ value: 'off1', label: 'Offset 1' }, { value: 'off2', label: 'Offset 2' }]
  render(
    <BackgroundTab
      {...baseProps}
      drawGridOverlay={true}
      gridOverlayOffsets={offsets}
      gridOverlayShape={'square'}
    />
  )

  const xSelect = screen.getByLabelText('theme.xOffset.label')
  const ySelect = screen.getByLabelText('theme.yOffset.label')
  expect(xSelect).to.exist
  expect(ySelect).to.exist
  // selects should be enabled because drawGridOverlay=true and shape is not voronoi
  expect(xSelect.disabled).to.equal(false)
  expect(ySelect.disabled).to.equal(false)
  // options present (both X and Y selects include the offsets)
  const offsetOnes = screen.getAllByText('Offset 1')
  const offsetTwos = screen.getAllByText('Offset 2')
  expect(offsetOnes.length).to.be.at.least(2)
  expect(offsetTwos.length).to.be.at.least(2)
})

test('colorize checkboxes disabled when backgroundType != GeneratedFromTexture and enabled when it is', () => {
  const { rerender } = render(
    <BackgroundTab
      {...baseProps}
      backgroundType={''}
    />
  )

  // when backgroundType is not GeneratedFromTexture the colorize checkboxes should be disabled
  const landCheckboxDisabled = screen.getByText('theme.colorLand').previousSibling
  expect(landCheckboxDisabled.disabled).to.equal(true)

  // rerender with GeneratedFromTexture
  rerender(<BackgroundTab {...baseProps} backgroundType={'GeneratedFromTexture'} />)
  const landCheckbox = screen.getByText('theme.colorLand').previousSibling
  expect(landCheckbox.disabled).to.equal(false)
})
