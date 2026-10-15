import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import { scrollToAnchorOrStartOfPage } from './App'

describe('App hash scrolling', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.replaceChildren()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  test.each(['h2', 'a'])('scrolls to a %s target after the render tick', (tag) => {
    scrollToAnchorOrStartOfPage({ hash: '#section' })
    const target = document.createElement(tag)
    target.id = 'section'
    target.scrollIntoView = jest.fn()
    document.body.appendChild(target)
    expect(target.scrollIntoView).not.toHaveBeenCalled()

    jest.runOnlyPendingTimers()
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1)
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  test.each(['#missing', '#[', '#123 not a selector'])(
    'safely falls back to the top for missing target %s',
    (hash) => {
      scrollToAnchorOrStartOfPage({ hash })
      expect(window.scrollTo).not.toHaveBeenCalled()
      expect(() => jest.runOnlyPendingTimers()).not.toThrow()
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    }
  )

  test('scrolls to the top immediately when there is no hash', () => {
    scrollToAnchorOrStartOfPage({ hash: '' })
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(jest.getTimerCount()).toBe(0)
  })
})
