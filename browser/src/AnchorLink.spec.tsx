import React from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import styled from 'styled-components'

import { AnchoredSectionHeading, withAnchor } from './AnchorLink'

const PlainHeading = withAnchor(styled.h2``)

const writeText = jest.fn(() => Promise.resolve())

const originalClipboard = navigator.clipboard

const setClipboard = (value: any) => {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true })
}

describe('withAnchor', () => {
  beforeEach(() => {
    writeText.mockClear()
    setClipboard({ writeText })
    window.history.pushState({}, '', '/variant/1-55051215-G-GA?dataset=gnomad_r4')
  })

  afterEach(() => {
    setClipboard(originalClipboard)
  })

  test('renders an anchor carrying the section id', () => {
    const { container } = render(
      <PlainHeading id="age-distribution">Age Distribution</PlainHeading>
    )
    const anchor = container.querySelector('#age-distribution')
    expect(anchor).not.toBeNull()
    expect(anchor!.getAttribute('href')).toBe('#age-distribution')
  })

  test('does not touch the clipboard by default', async () => {
    const { container } = render(
      <PlainHeading id="age-distribution">Age Distribution</PlainHeading>
    )
    await userEvent.click(container.querySelector('#age-distribution')!)
    expect(writeText).not.toHaveBeenCalled()
  })

  test('AnchoredSectionHeading copies the full section URL on click', async () => {
    const { container } = render(
      <AnchoredSectionHeading id="age-distribution">Age Distribution</AnchoredSectionHeading>
    )
    await userEvent.click(container.querySelector('#age-distribution')!)
    expect(writeText).toHaveBeenCalledWith(
      'http://localhost/variant/1-55051215-G-GA?dataset=gnomad_r4#age-distribution'
    )
  })

  test('does nothing when the Clipboard API is unavailable', async () => {
    setClipboard(undefined)
    const { container } = render(
      <AnchoredSectionHeading id="age-distribution">Age Distribution</AnchoredSectionHeading>
    )
    await expect(
      userEvent.click(container.querySelector('#age-distribution')!)
    ).resolves.not.toThrow()
  })
})
