import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import DataPage from './DataPage/DataPage'
import HelpPage from './help/HelpPage'
import Notifications from './Notifications'
import StatsPage from './StatsPage/StatsPage'

const originalClipboard = navigator.clipboard
const originalIntersectionObserver = window.IntersectionObserver
const observe = jest.fn()
const writeText = jest.fn(() => Promise.resolve())

beforeEach(() => {
  writeText.mockClear()
  observe.mockClear()
  Object.defineProperty(window, 'IntersectionObserver', {
    value: jest.fn(() => ({ observe, disconnect: jest.fn() })),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
})

afterEach(() => {
  window.IntersectionObserver = originalIntersectionObserver
  Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true })
  window.history.replaceState({}, '', '/')
})

test.each([
  { path: '/help', Page: HelpPage, count: 1, id: 'frequently-asked-questions' },
  { path: '/data', Page: DataPage, count: 61, id: 'v4-genetic-ancestry-group-classification' },
  { path: '/stats', Page: StatsPage, count: 6, id: 'age-and-sex-distribution' },
])(
  '$path uses shared, copyable headings with stable fragment targets',
  async ({ path, Page, count, id }) => {
    window.history.replaceState({}, '', `${path}?dataset=gnomad_r4`)
    const { container } = render(
      <BrowserRouter>
        <Notifications />
        <Page />
      </BrowserRouter>
    )

    const links = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2[id]')).map(
      (heading) => within(heading).getByRole('link', { name: /^Copy link to / })
    )
    expect(links).toHaveLength(count)
    links.forEach((link) => {
      const heading = link.closest('h2')!
      expect(heading).not.toBeNull()
      expect(link.getAttribute('href')).toBe(`#${heading.id}`)
      expect(link.getAttribute('aria-label')).toBe(`Copy link to ${heading.textContent}`)
      expect(container.querySelectorAll(`[id="${heading.id}"]`)).toHaveLength(1)
      expect(link.hasAttribute('aria-hidden')).toBe(false)
    })

    const heading = document.getElementById(id)!
    const link = within(heading).getByRole('link')
    window.history.replaceState({}, '', `${path}?dataset=gnomad_r4#previous-section`)
    link.focus()
    await userEvent.keyboard('{Enter}')
    expect(writeText).toHaveBeenCalledWith(`http://localhost${path}?dataset=gnomad_r4#${id}`)
    expect(window.location.hash).toBe(`#${id}`)
    expect(screen.getByRole('status').textContent).toContain('Link copied')

    if (path === '/help') {
      expect(getComputedStyle(link).position).toBe('static')
      expect(getComputedStyle(link).display).toBe('inline-flex')
    }
    if (path === '/data') {
      expect(getComputedStyle(document.getElementById('v4')!).fontSize).toBe('2.25rem')
      expect(getComputedStyle(document.getElementById('v4-core-dataset')!).fontSize).toBe('1.88rem')
      expect(getComputedStyle(heading).fontSize).toBe('1.5rem')
      expect(container.querySelector('[subject]')).toBeNull()
      expect(observe).toHaveBeenCalledTimes(count)
      links.forEach((sectionLink) => {
        expect(observe).toHaveBeenCalledWith(sectionLink.closest('h2'))
      })
    }
  }
)
