import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import styled from 'styled-components'

import { AgeDistributionHeading, withAnchor } from './AnchorLink'
import Notifications from './Notifications'

const PlainHeading = withAnchor(styled.h2``)

const writeText = jest.fn(() => Promise.resolve())

const originalClipboard = navigator.clipboard

const setClipboard = (value: any) => {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true })
}

const renderAgeDistributionHeading = () =>
  render(
    <>
      <Notifications />
      <AgeDistributionHeading>Age Distribution</AgeDistributionHeading>
    </>
  )

describe('withAnchor', () => {
  beforeEach(() => {
    writeText.mockClear()
    setClipboard({ writeText })
    window.history.pushState({}, '', '/variant/1-55051215-G-GA?dataset=gnomad_r4')
  })

  afterEach(() => {
    setClipboard(originalClipboard)
  })

  test('keeps existing heading anchors unchanged and does not touch the clipboard', async () => {
    const { container } = render(<PlainHeading id="help-section">Help section</PlainHeading>)
    const anchor = container.querySelector('#help-section')

    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute('href')).toBe('#help-section')
    expect(anchor?.getAttribute('aria-hidden')).toBe('true')

    await userEvent.click(anchor!)
    expect(writeText).not.toHaveBeenCalled()
  })

  test('renders the Age Distribution control as a named link with a practical target', () => {
    renderAgeDistributionHeading()

    const link = screen.getByRole('link', { name: 'Copy link to Age Distribution' })
    expect(link.getAttribute('href')).toBe('#age-distribution')
    expect(link.getAttribute('id')).toBe('age-distribution')
    expect(getComputedStyle(link).width).toBe('44px')
    expect(getComputedStyle(link).height).toBe('44px')
  })

  test('focuses and activates the Age Distribution link from the keyboard', async () => {
    renderAgeDistributionHeading()
    const link = screen.getByRole('link', { name: 'Copy link to Age Distribution' })

    await userEvent.tab()
    expect(document.activeElement).toBe(link)
    expect(getComputedStyle(link).opacity).toBe('1')
    await userEvent.keyboard('{Enter}')

    expect(writeText).toHaveBeenCalledWith(
      'http://localhost/variant/1-55051215-G-GA?dataset=gnomad_r4#age-distribution'
    )
    expect(window.location.hash).toBe('#age-distribution')
    expect(screen.getByRole('status').textContent).toContain('Link copied')
  })

  test('preserves the full current URL when replacing its fragment', async () => {
    window.history.pushState({}, '', '/variant/1-55051215-G-GA?dataset=gnomad_r4#another-section')
    renderAgeDistributionHeading()

    await userEvent.click(screen.getByRole('link', { name: 'Copy link to Age Distribution' }))

    expect(writeText).toHaveBeenCalledWith(
      'http://localhost/variant/1-55051215-G-GA?dataset=gnomad_r4#age-distribution'
    )
  })

  test('shows an announced error and still navigates when clipboard access is rejected', async () => {
    writeText.mockRejectedValueOnce(new Error('Permission denied'))
    renderAgeDistributionHeading()

    await userEvent.click(screen.getByRole('link', { name: 'Copy link to Age Distribution' }))

    expect(window.location.hash).toBe('#age-distribution')
    expect(screen.getByRole('alert').textContent).toContain('Unable to copy link')
  })

  test('shows an announced error and still navigates when clipboard access throws', async () => {
    writeText.mockImplementationOnce(() => {
      throw new Error('Clipboard failure')
    })
    renderAgeDistributionHeading()

    await userEvent.click(screen.getByRole('link', { name: 'Copy link to Age Distribution' }))

    expect(window.location.hash).toBe('#age-distribution')
    expect(screen.getByRole('alert').textContent).toContain('Unable to copy link')
  })

  test('shows an announced error and still navigates when the Clipboard API is unavailable', async () => {
    setClipboard(undefined)
    renderAgeDistributionHeading()

    await userEvent.click(screen.getByRole('link', { name: 'Copy link to Age Distribution' }))

    expect(window.location.hash).toBe('#age-distribution')
    expect(screen.getByRole('alert').textContent).toContain('Unable to copy link')
  })
})
