import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import RandomSettingsSection from '../RandomSettingsSection'

describe('RandomSettingsSection', () => {
  it('renders labels and calls handlers when controls change', () => {
    const handlers = {
      setMapLanguage: vi.fn(),
      setSelectedBooks: vi.fn(),
      setDimension: vi.fn(),
      setWorldSize: vi.fn(),
      setLandShape: vi.fn(),
      setRegionCount: vi.fn(),
      setLandColoringMethod: vi.fn(),
      setArtPack: vi.fn(),
      setCityIconType: vi.fn(),
      setCityFrequency: vi.fn(),
      handleRandomMap: vi.fn((e) => e && e.preventDefault()),
    }

    const values = {
      dimension: 'small',
      worldSize: 2000,
      landShape: 'island',
      regionCount: 5,
      landColoringMethod: 'methodA',
      artPack: 'pack1',
      cityIconType: '',
      cityFrequency: 10,
      selectedBooks: new Set(['A']),
      mapLanguage: 'en',
    }

    const options = {
      artPacks: ['pack1'],
      cityIconTypes: [],
      allBooks: ['A', 'B'],
      i18n: {
        labels: {
          'ui.title': 'Random',
          'ui.subtitle': 'Sub',
          'ui.mapLanguage': 'Language',
          'textTool.booksForText.label': 'Books',
          'books.checkAll': 'Check all',
          'books.uncheckAll': 'Uncheck all',
          'textTool.booksForText.none': 'None',
          'newSettingsDialog.dimensions.label': 'Dimensions',
          'newSettingsDialog.worldSize.label': 'World',
          'newSettingsDialog.landShape.label': 'Land shape',
          'newSettingsDialog.regionCount.label': 'Regions',
          'theme.landColoringMethod.label': 'Land color',
          'newSettingsDialog.artPack.label': 'Art pack',
          'newSettingsDialog.cityIconType.label': 'City icon',
          'newSettingsDialog.cityFrequency.label': 'City freq',
        },
        options: {
          dimensions: [{ value: 'small', label: 'Small' }],
          landShapes: [{ value: 'island', label: 'Island' }],
          landColoringMethods: [{ value: 'methodA', label: 'Method A' }],
        },
      },
    }

    const ui = { loading: false }

    render(<RandomSettingsSection values={values} handlers={handlers} options={options} ui={ui} />)

    expect(screen.getByText('Random')).toBeTruthy()

    // change language select
    const lang = screen.getByLabelText('Language')
    fireEvent.change(lang, { target: { value: 'es' } })
    expect(handlers.setMapLanguage).toHaveBeenCalledWith('es')

    // click check all
    const checkAll = screen.getByText('Check all')
    fireEvent.click(checkAll)
    expect(handlers.setSelectedBooks).toHaveBeenCalled()
  })
})
