import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import Notifications, { showNotification } from './Notifications'

const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')

describe('Notifications', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
    if (originalVisualViewport) {
      Object.defineProperty(window, 'visualViewport', originalVisualViewport)
    } else {
      Reflect.deleteProperty(window, 'visualViewport')
    }
  })

  test('positions feedback relative to the viewport with a narrow-screen width bound', () => {
    const { container, unmount } = render(<Notifications />)
    act(() => {
      showNotification({ title: 'Link copied', status: 'success' })
    })
    const notification = container.querySelector('strong')!.parentElement!
    const styles = getComputedStyle(notification.parentElement!)
    expect(styles.position).toBe('fixed')
    expect(styles.top).toBe('1rem')
    expect(styles.left).toBe('calc(100vw - 1rem)')
    expect(styles.transform).toBe('translateX(-100%)')
    expect(styles.zIndex).toBe('1000')
    expect(getComputedStyle(notification).maxWidth).toBe('calc(100vw - 2rem)')
    // Only the pre-mounted region announces success, not the visual notification too.
    expect(notification.getAttribute('role')).toBeNull()
    expect(notification.getAttribute('aria-live')).toBeNull()
    unmount()
  })

  test.each(['success', 'info', 'warning'])(
    'updates a pre-mounted polite region for %s',
    (status) => {
      const { unmount } = render(<Notifications />)
      const region = screen.getByRole('status')
      expect(region.textContent).toBe('')
      expect(region.getAttribute('aria-atomic')).toBe('false')
      expect(region.getAttribute('aria-relevant')).toBe('additions')

      act(() => {
        showNotification({ title: 'Notification title', message: 'Details', status, duration: 2 })
      })
      expect(screen.getByRole('status')).toBe(region)
      expect(region.textContent).toBe('Notification title Details')
      expect(region.firstElementChild?.getAttribute('aria-atomic')).toBe('true')

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(screen.getByRole('status')).toBe(region)
      expect(region.textContent).toBe('')
      unmount()
    }
  )

  test('adds distinct updates for repeated messages without replacing older announcements', () => {
    const { unmount } = render(<Notifications />)
    const region = screen.getByRole('status')
    act(() => {
      showNotification({ title: 'Link copied', status: 'success', duration: 2 })
    })
    const firstAnnouncement = region.firstElementChild
    act(() => {
      jest.advanceTimersByTime(1000)
      showNotification({ title: 'Link copied', status: 'success', duration: 2 })
    })
    expect(region.children).toHaveLength(2)
    expect(region.lastElementChild).toBe(firstAnnouncement)
    expect(region.firstElementChild).not.toBe(firstAnnouncement)

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(region.children).toHaveLength(1)
    expect(region.textContent).toBe('Link copied')
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(region.textContent).toBe('')
    unmount()
  })

  test('urgently announces errors once, outside the polite region', () => {
    const { unmount } = render(<Notifications />)

    act(() => {
      showNotification({ title: 'Unable to copy link', status: 'error', duration: 2 })
    })
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByRole('alert').textContent).toBe('Unable to copy link')
    expect(screen.getByRole('status').textContent).toBe('')

    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(screen.queryByRole('alert')).toBeNull()
    unmount()
  })

  describe('mobile visual viewport', () => {
    let viewport: EventTarget & { offsetTop: number }

    beforeEach(() => {
      viewport = Object.assign(new EventTarget(), { offsetTop: 462 })
      Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true })
      expect(window.visualViewport).toBe(viewport)
    })

    test.each([
      { status: 'success', title: 'Link copied' },
      { status: 'error', title: 'Unable to copy link' },
    ])(
      'keeps $status feedback below the visible top without re-rendering on pan',
      ({ status, title }) => {
        const renderSpy = jest.spyOn(Notifications.prototype, 'render')
        const scrollSpy = jest.spyOn(window, 'scrollTo')
        const { container, unmount } = render(<Notifications />)
        const focused = document.activeElement
        viewport.offsetTop = 500
        act(() => {
          showNotification({ title, status })
        })
        const stack = container.querySelector('strong')!.parentElement!.parentElement!
        expect(stack.style.top).toBe('calc(500px + 1rem)')
        viewport.offsetTop = 462
        act(() => {
          showNotification({ title, status })
        })
        expect(stack.style.top).toBe('calc(462px + 1rem)')
        const renders = renderSpy.mock.calls.length

        act(() => {
          viewport.offsetTop = 300
          viewport.dispatchEvent(new Event('scroll'))
        })
        expect(stack.style.top).toBe('calc(300px + 1rem)')
        act(() => {
          viewport.offsetTop = 0
          viewport.dispatchEvent(new Event('resize'))
        })
        expect(stack.style.top).toBe('calc(0px + 1rem)')
        expect(renderSpy).toHaveBeenCalledTimes(renders)
        expect(document.activeElement).toBe(focused)
        expect(scrollSpy).not.toHaveBeenCalled()
        unmount()
      }
    )

    test('listens only while notifications exist and re-reads the viewport for the next batch', () => {
      const addListener = jest.spyOn(viewport, 'addEventListener')
      const removeListener = jest.spyOn(viewport, 'removeEventListener')
      const { container, unmount } = render(<Notifications />)
      expect(addListener).not.toHaveBeenCalled()
      act(() => {
        showNotification({ title: 'First', duration: 1 })
        showNotification({ title: 'Second', duration: 2 })
      })
      const stack = container.querySelector('strong')!.parentElement!.parentElement!
      expect(addListener.mock.calls.map(([event]) => event)).toEqual(['scroll', 'resize'])
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(removeListener).not.toHaveBeenCalled()
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(removeListener.mock.calls).toEqual(addListener.mock.calls)
      expect(stack.style.top).toBe('')
      viewport.offsetTop = 200
      viewport.dispatchEvent(new Event('scroll'))
      expect(stack.style.top).toBe('')

      act(() => {
        showNotification({ title: 'Next batch' })
      })
      expect(stack.style.top).toBe('calc(200px + 1rem)')
      expect(addListener).toHaveBeenCalledTimes(4)
      unmount()
      expect(removeListener.mock.calls).toEqual(addListener.mock.calls)
      expect(jest.getTimerCount()).toBe(0)
    })
  })

  test('unsubscribes and clears all removal timers on unmount', () => {
    const { unmount } = render(<Notifications />)
    act(() => {
      showNotification({ title: 'First' })
      showNotification({ title: 'Second', status: 'error' })
    })
    expect(jest.getTimerCount()).toBe(2)
    unmount()
    expect(jest.getTimerCount()).toBe(0)
    act(() => {
      showNotification({ title: 'After unmount' })
    })
    expect(jest.getTimerCount()).toBe(0)
  })
})
