import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import styled from 'styled-components'

import { SectionHeading, withAnchor } from './AnchorLink'
import Notifications from './Notifications'

const PlainHeading = withAnchor(styled.h2``)
const writeText = jest.fn(() => Promise.resolve())
const originalClipboard = navigator.clipboard

const setClipboard = (value: any) => {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true })
}

beforeEach(() => {
  writeText.mockClear()
  setClipboard({ writeText })
  window.history.pushState({}, '', '/variant/1-55051215-G-GA?dataset=gnomad_r4')
})

afterEach(() => {
  setClipboard(originalClipboard)
})

test('withAnchor keeps legacy anchor targets unchanged and does not touch the clipboard', async () => {
  const { container } = render(<PlainHeading id="help-section">Help section</PlainHeading>)
  const anchor = container.querySelector('#help-section')

  expect(anchor?.tagName).toBe('A')
  expect(anchor?.getAttribute('href')).toBe('#help-section')
  expect(anchor?.getAttribute('aria-hidden')).toBe('true')

  await userEvent.click(anchor!)
  expect(writeText).not.toHaveBeenCalled()
})

test('SectionHeading renders its title and adornments and forwards h2 attributes', () => {
  const { container } = render(
    <SectionHeading id="ancestry" title="Genetic Ancestry" className="custom" data-test="heading">
      <button type="button">More information</button>
    </SectionHeading>
  )
  const heading = screen.getByRole('heading', { level: 2 })
  expect(heading.textContent).toBe('Genetic Ancestry More information')
  expect(container.firstElementChild).toBe(heading)
  expect(getComputedStyle(heading).position).toBe('relative')
  expect(heading.classList.contains('custom')).toBe(true)
  expect(heading.getAttribute('data-test')).toBe('heading')
  expect(heading.hasAttribute('title')).toBe(false)
  expect(within(heading).getByRole('button', { name: 'More information' })).toBeTruthy()
  expect(within(heading).getByRole('link', { name: 'Copy link to Genetic Ancestry' })).toBeTruthy()
})

describe.each([
  ['age-distribution', 'Age Distribution'],
  ['variant-effect-predictor', 'Ensembl Variant Effect Predictor'],
])('SectionHeading #%s', (id, title) => {
  const renderHeading = () => {
    render(
      <>
        <Notifications />
        <SectionHeading id={id} title={title} />
      </>
    )
    return screen.getByRole('link', { name: `Copy link to ${title}` })
  }
  const expectedUrl = `http://localhost/variant/1-55051215-G-GA?dataset=gnomad_r4#${id}`

  test('puts the unique target ID on h2 and provides a named native link with a practical target', () => {
    const link = renderHeading()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.tagName).toBe('H2')
    expect(heading.id).toBe(id)
    expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1)
    expect(link.getAttribute('href')).toBe(`#${id}`)
    expect(link.hasAttribute('id')).toBe(false)
    expect(getComputedStyle(link).width).toBe('44px')
    expect(getComputedStyle(link).height).toBe('44px')
  })

  test('focuses and activates the link from the keyboard', async () => {
    const link = renderHeading()
    await userEvent.tab()
    expect(document.activeElement).toBe(link)
    expect(getComputedStyle(link).opacity).toBe('1')
    await userEvent.keyboard('{Enter}')

    expect(writeText).toHaveBeenCalledWith(expectedUrl)
    expect(window.location.hash).toBe(`#${id}`)
    expect(screen.getByRole('status').textContent).toContain('Link copied')
  })

  test('preserves the full current URL when replacing its fragment', async () => {
    window.history.pushState({}, '', '/variant/1-55051215-G-GA?dataset=gnomad_r4#another-section')
    await userEvent.click(renderHeading())
    expect(writeText).toHaveBeenCalledWith(expectedUrl)
    expect(window.location.hash).toBe(`#${id}`)
  })

  test.each(['rejects', 'throws', 'is unavailable'])(
    'announces an error and still navigates by keyboard when clipboard access %s',
    async (failure) => {
      if (failure === 'rejects') {
        writeText.mockRejectedValueOnce(new Error('Permission denied'))
      } else if (failure === 'throws') {
        writeText.mockImplementationOnce(() => {
          throw new Error('Clipboard failure')
        })
      } else {
        setClipboard(undefined)
      }
      renderHeading()
      await userEvent.tab()
      await userEvent.keyboard('{Enter}')

      expect(window.location.hash).toBe(`#${id}`)
      expect(screen.getByRole('alert').textContent).toContain('Unable to copy link')
      expect(screen.getByRole('status').textContent).toBe('')
    }
  )
})
