import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import Notifications, { showNotification } from './Notifications'

describe('Notifications', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
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
