import React, { useEffect } from 'react'
import { render, waitFor } from '@testing-library/react'
import { vi, expect, it, describe, beforeEach, afterEach } from 'vitest'
import useRandomSettings from '../useRandomSettings'
import PropTypes from 'prop-types'

function TestComponent({ initial }) {
  const hook = useRandomSettings(initial)

  useEffect(() => {
    globalThis.__useRandom = {
      get: () => hook.randomOverrides,
      setRandomOverrides: hook.setRandomOverrides,
      updateRandomOverride: hook.updateRandomOverride,
      makeRandomHandler: hook.makeRandomHandler,
      handleSelectedBooksChange: hook.handleSelectedBooksChange,
      booksLoadedRef: hook.booksLoadedRef,
    }
  }, [hook.randomOverrides, hook.setRandomOverrides, hook.updateRandomOverride, hook.makeRandomHandler, hook.handleSelectedBooksChange, hook.booksLoadedRef])

  return null
}

TestComponent.propTypes = {
  initial: PropTypes.any,
}

describe('useRandomSettings hook', () => {
  let origLocalStorage
  beforeEach(() => {
    origLocalStorage = globalThis.localStorage
    // ensure clean
    try {
      globalThis.localStorage?.removeItem?.('vellaris-random-manual-overrides')
    } catch (e) {
      // Log removal failures so tests running in restricted environments surface the issue
      // eslint-disable-next-line no-console
      console.warn('useRandomSettings test: failed to clear storage key', e)
    }
  })
  afterEach(() => {
    globalThis.localStorage = origLocalStorage
    delete globalThis.__useRandom
    vi.restoreAllMocks()
  })

  it('updateRandomOverride adds and deletes keys as expected', async () => {
    render(<TestComponent initial={{ foo: 'bar' }} />)

    await waitFor(() => expect(globalThis.__useRandom.get().foo).toBe('bar'))

    globalThis.__useRandom.updateRandomOverride('baz', 42)
    await waitFor(() => expect(globalThis.__useRandom.get().baz).toBe(42))

    globalThis.__useRandom.updateRandomOverride('baz', null)
    await waitFor(() => expect(globalThis.__useRandom.get().baz).toBeUndefined())
  })

  it('makeRandomHandler calls setter and persists override', async () => {
    render(<TestComponent initial={{}} />)

    let last
    const setter = (v) => {
      last = v
    }

    const mh = globalThis.__useRandom.makeRandomHandler(setter, 'alpha')
    mh('X')

    await waitFor(() => expect(last).toBe('X'))
    await waitFor(() => expect(globalThis.__useRandom.get().alpha).toBe('X'))
  })

  it('handleSelectedBooksChange persists only after booksLoadedRef is true', async () => {
    render(<TestComponent initial={{}} />)

    const books = new Set(['a', 'b'])
    globalThis.__useRandom.handleSelectedBooksChange(books, () => {})
    await waitFor(() => expect(globalThis.__useRandom.get().selectedBooks).toBeUndefined())

    globalThis.__useRandom.booksLoadedRef.current = true
    globalThis.__useRandom.handleSelectedBooksChange(books, () => {})

    await waitFor(() => expect(globalThis.__useRandom.get().selectedBooks).toEqual(['a', 'b']))
  })

  it('logs a warning when localStorage.setItem throws during persistence', async () => {
    // mock localStorage to throw
    globalThis.localStorage = { setItem: vi.fn(() => { throw new Error('no storage') }) }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(<TestComponent initial={{}} />)

    globalThis.__useRandom.setRandomOverrides({ z: 1 })

    await waitFor(() => expect(warn).toHaveBeenCalled())
  })
})
