import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from '@jest/globals'

import { FindBarProvider } from './FindBarContext'
import PageFindBar from './PageFindBar'

const renderFindBar = () =>
  render(
    <FindBarProvider>
      <PageFindBar />
      <p>Searchable page content with the word phenylketonuria in it.</p>
    </FindBarProvider>
  )

const pressFindShortcut = (init: KeyboardEventInit) =>
  // fireEvent returns false when the event's default action was prevented.
  fireEvent.keyDown(window, { key: 'f', cancelable: true, ...init })

describe('PageFindBar', () => {
  beforeEach(() => {
    document.body.focus()
  })

  it('is not rendered until the find shortcut is pressed', () => {
    renderFindBar()
    expect(screen.queryByPlaceholderText('Find on page')).toBeNull()
  })

  it('opens and suppresses native find on Ctrl+F', async () => {
    renderFindBar()

    const defaultNotPrevented = pressFindShortcut({ ctrlKey: true })

    expect(defaultNotPrevented).toBe(false)
    const input = await screen.findByPlaceholderText('Find on page')
    await waitFor(() => expect(document.activeElement).toBe(input))
  })

  it('opens and suppresses native find on Meta+F (macOS)', async () => {
    renderFindBar()

    const defaultNotPrevented = pressFindShortcut({ metaKey: true })

    expect(defaultNotPrevented).toBe(false)
    expect(await screen.findByPlaceholderText('Find on page')).not.toBeNull()
  })

  it('does not intercept a plain "f" keypress', () => {
    renderFindBar()

    const defaultNotPrevented = pressFindShortcut({})

    expect(defaultNotPrevented).toBe(true)
    expect(screen.queryByPlaceholderText('Find on page')).toBeNull()
  })

  it('closes on Escape and on the close button', async () => {
    renderFindBar()

    pressFindShortcut({ ctrlKey: true })
    const input = await screen.findByPlaceholderText('Find on page')

    fireEvent.keyDown(input, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByPlaceholderText('Find on page')).toBeNull())

    pressFindShortcut({ ctrlKey: true })
    await screen.findByPlaceholderText('Find on page')
    await userEvent.click(screen.getByRole('button', { name: 'Close find bar' }))
    await waitFor(() => expect(screen.queryByPlaceholderText('Find on page')).toBeNull())
  })

  it('updates the query as the user types', async () => {
    const user = userEvent.setup()
    renderFindBar()

    pressFindShortcut({ ctrlKey: true })
    const input = (await screen.findByPlaceholderText('Find on page')) as HTMLInputElement

    await user.type(input, 'pku')

    expect(input.value).toBe('pku')
  })

  it('removes the global key listener on unmount', () => {
    const { unmount } = renderFindBar()
    unmount()

    const defaultNotPrevented = pressFindShortcut({ ctrlKey: true })

    expect(defaultNotPrevented).toBe(true)
  })
})
