import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from '@jest/globals'

import { FindBarProvider, useFindBar } from './FindBarContext'
import PageFindBar from './PageFindBar'
import useVariantFindBridge from './useVariantFindBridge'

const Harness = ({ matchCount }: { matchCount: number }) => {
  useVariantFindBridge({ matchCount })
  return null
}

const VariantMatchCountProbe = () => {
  const { variantMatchCount } = useFindBar()
  return <div data-testid="variant-match-count">{String(variantMatchCount)}</div>
}

const renderBridge = (matchCount = 0) =>
  render(
    <FindBarProvider>
      <PageFindBar />
      <Harness matchCount={matchCount} />
      <VariantMatchCountProbe />
    </FindBarProvider>
  )

const variantMatchCountContent = () => screen.getByTestId('variant-match-count').textContent

const openFindBar = () => fireEvent.keyDown(window, { key: 'f', ctrlKey: true, cancelable: true })

describe('useVariantFindBridge', () => {
  it('does not report a match count until the find bar is open with a query', () => {
    renderBridge(142)
    expect(variantMatchCountContent()).toBe('null')
  })

  it('reports the variant match count while open and clears it on close', async () => {
    const user = userEvent.setup()
    renderBridge(142)

    expect(variantMatchCountContent()).toBe('null')

    openFindBar()
    const input = await screen.findByPlaceholderText('Find on page')
    await user.type(input, 'synonymous')

    await waitFor(() => expect(variantMatchCountContent()).toBe('142'))

    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => expect(variantMatchCountContent()).toBe('null'))
  })
})
