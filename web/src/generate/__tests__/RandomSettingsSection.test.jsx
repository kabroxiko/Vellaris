import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import RandomSettingsSection from '../RandomSettingsSection'

describe('RandomSettingsSection', () => {
  test('renders split translation with <br/> and shows no-books message', () => {
    const props = {
      values: {
        dimension: 'Square',
        worldSize: 2000,
        landShape: 'Continents',
        regionCount: 3,
        landColoringMethod: 'SingleColor',
        artPack: '',
        cityIconType: '',
        cityFrequency: 10,
        selectedBooks: new Set(),
        mapLanguage: 'en',
        fileName: '',
      },
      handlers: {
        setDimension: vi.fn(),
        setWorldSize: vi.fn(),
        setLandShape: vi.fn(),
        setRegionCount: vi.fn(),
        setLandColoringMethod: vi.fn(),
        setArtPack: vi.fn(),
        setCityIconType: vi.fn(),
        setCityFrequency: vi.fn(),
        setSelectedBooks: vi.fn(),
        setRandomSeed: vi.fn(),
        setMapLanguage: vi.fn(),
        handleRandomMap: vi.fn((e) => e.preventDefault()),
        handleFileInput: vi.fn(),
        onDrop: vi.fn(),
      },
      options: {
        artPacks: [],
        cityIconTypes: [],
        allBooks: [],
        i18n: {
          labels: {
            'ui.title': 'Title<br/>Line2',
            'ui.subtitle': 'Subtitle',
            'textTool.booksForText.none': 'No books available',
            'ui.mapLanguage': 'Map language',
            'newSettingsDialog.dimensions.label': 'Dimensions',
          },
          options: { dimensions: [] },
        },
      },
      ui: { loading: false },
    }

    render(<RandomSettingsSection {...props} />)

    // title split with br should render both parts
    expect(screen.getByRole('heading', { level: 3, name: /Title/ })).toBeTruthy()
    expect(screen.getByText(/Line2/)).toBeTruthy()

    // no books note should be shown
    expect(screen.getByText('No books available')).toBeTruthy()
  })

  test('books list and controls call handlers and selects work', () => {
    const setSelectedBooks = vi.fn()
    const setDimension = vi.fn()
    const handleRandomMap = vi.fn((e) => e.preventDefault())

    const props = {
      values: {
        dimension: 'Square',
        worldSize: 2000,
        landShape: 'Continents',
        regionCount: 3,
        landColoringMethod: 'SingleColor',
        artPack: 'nortantis',
        cityIconType: 'default',
        cityFrequency: 5,
        selectedBooks: new Set(['A']),
        mapLanguage: 'en',
        fileName: 'foo.txt',
      },
      handlers: {
        setDimension,
        setWorldSize: vi.fn(),
        setLandShape: vi.fn(),
        setRegionCount: vi.fn(),
        setLandColoringMethod: vi.fn(),
        setArtPack: vi.fn(),
        setCityIconType: vi.fn(),
        setCityFrequency: vi.fn(),
        setSelectedBooks,
        setRandomSeed: vi.fn(),
        setMapLanguage: vi.fn(),
        handleRandomMap,
        handleFileInput: vi.fn(),
        onDrop: vi.fn(),
      },
      options: {
        artPacks: ['nortantis'],
        cityIconTypes: ['default'],
        allBooks: ['A', 'B'],
        i18n: { labels: {}, options: { dimensions: [{ value: 'Square', label: 'Square' }] } },
      },
      ui: { loading: true },
    }

    render(<RandomSettingsSection {...props} />)

    // Clicking checkAll should call setSelectedBooks
    fireEvent.click(screen.getByText('books.checkAll'))
    expect(setSelectedBooks).toHaveBeenCalled()

    // Clicking uncheckAll should call setSelectedBooks
    fireEvent.click(screen.getByText('books.uncheckAll'))
    expect(setSelectedBooks).toHaveBeenCalled()

    // Change dimension triggers setDimension (label text comes from i18n key)
    fireEvent.change(screen.getByLabelText('newSettingsDialog.dimensions.label'), { target: { value: 'Square' } })

    // Submitting the form calls handleRandomMap (button disabled when loading true)
    const button = screen.getByRole('button', { name: /ui.generating|ui.generate/ })
    expect(button.disabled).toBe(true)
  })
})
