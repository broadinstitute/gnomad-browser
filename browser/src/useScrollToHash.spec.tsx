import React from 'react'
import { render, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import useScrollToHash from './useScrollToHash'

const TestComponent = () => {
  useScrollToHash()
  return <div id="age-distribution">Age Distribution</div>
}

// jsdom implements neither scrollIntoView nor layout, so both are stubbed.
const scrollIntoView = jest.fn()
window.HTMLElement.prototype.scrollIntoView = scrollIntoView

const originalGetBoundingClientRect = window.HTMLElement.prototype.getBoundingClientRect

// Report the target as `top` pixels from the top of the viewport.
const mockOffsetFromViewportTop = (top: number) => {
  window.HTMLElement.prototype.getBoundingClientRect = jest.fn(
    () => ({ top } as DOMRect)
  ) as typeof originalGetBoundingClientRect
}

const flushAnimationFrames = async (count = 3) => {
  for (let i = 0; i < count; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve(null))
      })
    })
  }
}

describe('useScrollToHash', () => {
  beforeEach(() => {
    scrollIntoView.mockClear()
    window.location.hash = ''
    mockOffsetFromViewportTop(500)
  })

  afterEach(() => {
    window.HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
  })

  test('scrolls to the element identified by the hash', async () => {
    window.location.hash = '#age-distribution'
    render(<TestComponent />)
    await flushAnimationFrames()
    expect(scrollIntoView).toHaveBeenCalled()
  })

  test('keeps re-aligning while the page is still growing', async () => {
    window.location.hash = '#age-distribution'
    render(<TestComponent />)
    await flushAnimationFrames(3)
    // The target never reaches the top here, standing in for a document too short to scroll
    // that far, so the hook should have tried more than once.
    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(1)
  })

  test('does not scroll once the element is already at the top', async () => {
    window.location.hash = '#age-distribution'
    mockOffsetFromViewportTop(0)
    render(<TestComponent />)
    await flushAnimationFrames()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  test('stops re-aligning once the reader scrolls', async () => {
    window.location.hash = '#age-distribution'
    render(<TestComponent />)
    await flushAnimationFrames(1)
    const callsBeforeUserScroll = scrollIntoView.mock.calls.length

    act(() => {
      window.dispatchEvent(new Event('wheel'))
    })
    await flushAnimationFrames(3)

    expect(scrollIntoView.mock.calls.length).toBe(callsBeforeUserScroll)
  })

  test('does not scroll when the URL has no hash', async () => {
    render(<TestComponent />)
    await flushAnimationFrames()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  test('does not scroll when no element matches the hash', async () => {
    window.location.hash = '#not-a-section-on-this-page'
    render(<TestComponent />)
    await flushAnimationFrames()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  test('does not throw when the hash is not a valid CSS selector', async () => {
    window.location.hash = '#123 not a selector'
    expect(() => render(<TestComponent />)).not.toThrow()
    await flushAnimationFrames()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
