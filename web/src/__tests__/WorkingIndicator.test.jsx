import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import WorkingIndicator from '../generate/WorkingIndicator'

describe('WorkingIndicator', () => {
  it('renders generating text', () => {
    const { getByText } = render(<WorkingIndicator phase="generating" className="c" />)
    expect(getByText('Generating map…')).toBeTruthy()
  })

  it('renders downloading text', () => {
    const { getByText } = render(<WorkingIndicator phase="downloading" className="c" />)
    expect(getByText('Downloading map…')).toBeTruthy()
  })
})
