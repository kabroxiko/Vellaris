import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import CustomizeSettingsSection from '../CustomizeSettingsSection'

// Mock background cache to avoid network / blob work during mount
vi.mock('./backgroundBaseCache', () => ({
  default: {
    preload: vi.fn(),
    get: vi.fn().mockResolvedValue(new Blob()),
  },
}))

describe('CustomizeSettingsSection', () => {
  it('renders header and basic structure', () => {
    const opts = {
      textures: [],
      i18n: {
        labels: {
          'ui.title.customize': 'ui.title.customize',
          'ui.subtitle.customize': 'ui.subtitle.customize',
        },
        options: { tabs: [] },
      },
    }
    render(
      <CustomizeSettingsSection values={{}} handlers={{}} options={opts} ui={{ loading: false }} />
    )
    // translateLabel returns the key when no i18n provided
    expect(screen.getByText('ui.title.customize')).toBeTruthy()
    expect(screen.getByText('ui.subtitle.customize')).toBeTruthy()
  })
})
