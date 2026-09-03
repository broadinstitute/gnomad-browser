import React from 'react'
import { afterEach, beforeAll, describe, expect, test, jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import 'jest-styled-components'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'

import { CursorSyncProvider, SynchronizedCursor } from './CursorSync'

// jsdom positions everything at (0, 0): getBoundingClientRect().left is 0, so a
// mouse event's clientX maps directly to the wrapper-relative x used by the
// component. With leftPanelWidth=100 / centerPanelWidth=500, a clientX of 250
// lands inside the centre panel and broadcasts x = 250 - 100 = 150.
const regions = [{ start: 100, stop: 600 }]
const regionViewerContextValue = {
  centerPanelWidth: 500,
  isPositionDefined: () => true,
  leftPanelWidth: 100,
  regions,
  rightPanelWidth: 50,
  scalePosition: regionViewerScale(regions, [0, 500]),
}

// jsdom does not implement SVGElement.prototype.getBBox, which the showLabel
// path calls. Provide a stub so the label branch can run.
beforeAll(() => {
  ;(window as any).SVGElement.prototype.getBBox = jest.fn(() => ({
    x: 0,
    y: 0,
    width: 50,
    height: 10,
  }))
})

const renderWithProvider = (ui: React.ReactNode, onClick = jest.fn()) =>
  render(
    <RegionViewerContext.Provider value={regionViewerContextValue}>
      <CursorSyncProvider onClick={onClick}>{ui}</CursorSyncProvider>
    </RegionViewerContext.Provider>
  )

const getLine = () => screen.getByTestId('region-viewer-cursor-line')
const wrapperOf = (testId: string) => screen.getByTestId(testId).closest('div[class]')!

describe('SynchronizedCursor', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('renders children', () => {
    renderWithProvider(
      <SynchronizedCursor>
        <div data-testid="child-track">Track content</div>
      </SynchronizedCursor>
    )
    expect(screen.getByText('Track content')).toBeTruthy()
  })

  test('cursor line is present but hidden before any mouse interaction', () => {
    renderWithProvider(
      <SynchronizedCursor>
        <div data-testid="child-track">Track content</div>
      </SynchronizedCursor>
    )
    expect(getLine().style.display).toBe('none')
  })

  test('shows the line and positions it on mouseMove within the centre panel', () => {
    renderWithProvider(
      <SynchronizedCursor>
        <div data-testid="child-track">Track content</div>
      </SynchronizedCursor>
    )
    fireEvent.mouseMove(wrapperOf('child-track'), { clientX: 250 })

    const line = getLine()
    expect(line.style.display).toBe('')
    // clientX 250 - leftPanelWidth 100 = 150
    expect(line.getAttribute('x1')).toBe('150')
    expect(line.getAttribute('x2')).toBe('150')
  })

  test('keeps the line hidden when the mouse is left of the centre panel', () => {
    renderWithProvider(
      <SynchronizedCursor>
        <div data-testid="child-track">Track content</div>
      </SynchronizedCursor>
    )
    // clientX 50 < leftPanelWidth 100 -> outside centre panel -> broadcast null
    fireEvent.mouseMove(wrapperOf('child-track'), { clientX: 50 })
    expect(getLine().style.display).toBe('none')
  })

  test('hides the line again on mouseLeave', () => {
    renderWithProvider(
      <SynchronizedCursor>
        <div data-testid="child-track">Track content</div>
      </SynchronizedCursor>
    )
    const wrapper = wrapperOf('child-track')
    fireEvent.mouseMove(wrapper, { clientX: 250 })
    expect(getLine().style.display).toBe('')

    fireEvent.mouseLeave(wrapper)
    expect(getLine().style.display).toBe('none')
  })

  test('calls onClick with the inverted genomic position after a hover', () => {
    const onClick = jest.fn()
    renderWithProvider(
      <SynchronizedCursor>
        <div data-testid="child-track">Track content</div>
      </SynchronizedCursor>,
      onClick
    )
    const wrapper = wrapperOf('child-track')
    fireEvent.mouseMove(wrapper, { clientX: 250 })
    fireEvent.click(wrapper)

    expect(onClick).toHaveBeenCalledTimes(1)
    // regionViewerScale([{100, 600}], [0, 500]).invert(150) === 250
    expect(onClick.mock.calls[0][0]).toBeCloseTo(250)
  })

  test('does not call onClick when clicking without a hover position', () => {
    const onClick = jest.fn()
    renderWithProvider(
      <SynchronizedCursor>
        <div data-testid="child-track">Track content</div>
      </SynchronizedCursor>,
      onClick
    )
    fireEvent.click(wrapperOf('child-track'))
    expect(onClick).not.toHaveBeenCalled()
  })

  test('the overlay SVG ignores pointer events so clicks reach the tracks', () => {
    renderWithProvider(
      <SynchronizedCursor>
        <div data-testid="child-track">Track content</div>
      </SynchronizedCursor>
    )
    const svg = getLine().closest('svg')!
    // jest-styled-components augments the legacy `jest.Matchers`, not the
    // `@jest/globals` expect used here, so cast to reach the matcher.
    ;(expect(svg) as any).toHaveStyleRule('pointer-events', 'none')
  })

  test('synchronises the line across sibling cursors in the same provider', () => {
    renderWithProvider(
      <>
        <SynchronizedCursor>
          <div data-testid="track-a">Track A</div>
        </SynchronizedCursor>
        <SynchronizedCursor>
          <div data-testid="track-b">Track B</div>
        </SynchronizedCursor>
      </>
    )
    // Move the mouse in the first cursor only.
    fireEvent.mouseMove(wrapperOf('track-a'), { clientX: 250 })

    const lines = screen.getAllByTestId('region-viewer-cursor-line')
    expect(lines).toHaveLength(2)
    lines.forEach((line) => {
      expect(line.style.display).toBe('')
      expect(line.getAttribute('x1')).toBe('150')
    })
  })

  test('renders a coordinate label when showLabel is set', () => {
    renderWithProvider(
      <SynchronizedCursor showLabel>
        <div data-testid="child-track">Track content</div>
      </SynchronizedCursor>
    )
    fireEvent.mouseMove(wrapperOf('child-track'), { clientX: 250 })

    // The label shows the inverted, comma-formatted genomic position (250).
    expect(screen.getByText('250')).toBeTruthy()
  })
})
