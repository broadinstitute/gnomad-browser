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
    jest.restoreAllMocks()
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

  test('re-aligns after an aligned frame if later content moves the target', async () => {
    window.location.hash = '#age-distribution'
    mockOffsetFromViewportTop(0)
    render(<TestComponent />)
    await flushAnimationFrames(1)
    expect(scrollIntoView).not.toHaveBeenCalled()

    mockOffsetFromViewportTop(200)
    await flushAnimationFrames(1)
    expect(scrollIntoView).toHaveBeenCalled()
  })

  test.each(['wheel', 'touchstart', 'keydown', 'mousedown'])(
    'cancels the pending frame and detaches listeners on reader %s input',
    async (eventType) => {
      const cancelFrame = jest.spyOn(window, 'cancelAnimationFrame')
      const removeEventListener = jest.spyOn(window, 'removeEventListener')
      window.location.hash = '#age-distribution'
      render(<TestComponent />)
      await flushAnimationFrames(1)
      const callsBeforeUserScroll = scrollIntoView.mock.calls.length

      act(() => {
        window.dispatchEvent(new Event(eventType))
      })
      await flushAnimationFrames(3)

      expect(scrollIntoView.mock.calls.length).toBe(callsBeforeUserScroll)
      expect(cancelFrame).toHaveBeenCalled()
      expect(removeEventListener).toHaveBeenCalledWith('wheel', expect.any(Function))
      expect(removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function))
      expect(removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function))
    }
  )

  test('stops scheduling frames and detaches listeners when the settle window expires', () => {
    const frameCallbacks: FrameRequestCallback[] = []
    const requestFrame = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frameCallbacks.push(callback)
        return frameCallbacks.length
      })
    const removeEventListener = jest.spyOn(window, 'removeEventListener')
    let now = 0
    jest.spyOn(performance, 'now').mockImplementation(() => now)
    window.location.hash = '#age-distribution'

    render(<TestComponent />)
    expect(frameCallbacks).toHaveLength(1)

    now = 2001
    act(() => {
      frameCallbacks.shift()!(now)
    })

    expect(requestFrame).toHaveBeenCalledTimes(1)
    expect(frameCallbacks).toHaveLength(0)
    expect(removeEventListener).toHaveBeenCalledWith('wheel', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function))
  })

  test('cancels the pending frame and detaches listeners on unmount', () => {
    const cancelFrame = jest.spyOn(window, 'cancelAnimationFrame')
    const removeEventListener = jest.spyOn(window, 'removeEventListener')
    window.location.hash = '#age-distribution'

    const { unmount } = render(<TestComponent />)
    unmount()

    expect(cancelFrame).toHaveBeenCalled()
    expect(removeEventListener).toHaveBeenCalledWith('wheel', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function))
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
