import React from 'react'
import { describe, expect, test, jest } from '@jest/globals'
import { render, screen, fireEvent, act } from '@testing-library/react'
import renderer from 'react-test-renderer'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'

import Cursor from './RegionViewerCursor'

const regions = [{ start: 100, stop: 600 }]

const regionViewerContextValue = {
  centerPanelWidth: 500,
  isPositionDefined: () => true,
  leftPanelWidth: 100,
  regions,
  rightPanelWidth: 50,
  scalePosition: regionViewerScale(regions, [0, 500]),
}

const renderCursorInContext = (onClick = jest.fn()) =>
  render(
    <RegionViewerContext.Provider value={regionViewerContextValue}>
      <Cursor onClick={onClick}>
        <div data-testid="child-track">Track content</div>
      </Cursor>
    </RegionViewerContext.Provider>
  )

describe('RegionViewerCursor', () => {
  test('renders children', () => {
    renderCursorInContext()
    expect(screen.getByTestId('child-track')).toBeTruthy()
    expect(screen.getByText('Track content')).toBeTruthy()
  })

  test('does not render cursor line before any mouse interaction', () => {
    renderCursorInContext()
    expect(screen.queryByTestId('region-viewer-cursor-line')).toBeNull()
  })

  test('renders cursor line on mouseMove within the center panel', () => {
    renderCursorInContext()
    const child = screen.getByTestId('child-track')
    // The CursorWrapper is the parent of the child
    const wrapper = child.closest('div[class]')!

    // Simulate mouse entering the center panel area
    fireEvent.mouseMove(wrapper, { clientX: 250 })

    expect(screen.queryByTestId('region-viewer-cursor-line')).not.toBeNull()
  })

  test('removes cursor line on mouseLeave', () => {
    renderCursorInContext()
    const child = screen.getByTestId('child-track')
    const wrapper = child.closest('div[class]')!

    fireEvent.mouseMove(wrapper, { clientX: 250 })
    expect(screen.queryByTestId('region-viewer-cursor-line')).not.toBeNull()

    fireEvent.mouseLeave(wrapper)
    expect(screen.queryByTestId('region-viewer-cursor-line')).toBeNull()
  })

  test('calls onClick with inverted genomic position on click', () => {
    const onClick = jest.fn()
    const { container } = renderCursorInContext(onClick)

    const child = screen.getByTestId('child-track')

    // Fire mouseMove to set cursorPosition inside the center panel.
    fireEvent.mouseMove(child, { clientX: 250 })
    expect(screen.queryByTestId('region-viewer-cursor-line')).not.toBeNull()

    // Dispatch a click from the CursorWrapper div. React's synthetic event
    // system picks up the native DOM event and routes it to the onClick handler.
    act(() => {
      container.firstElementChild!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: 250 })
      )
    })

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(typeof onClick.mock.calls[0][0]).toBe('number')
  })

  test('cursor overlay SVG has pointer-events none', () => {
    renderCursorInContext()
    const child = screen.getByTestId('child-track')
    const wrapper = child.closest('div[class]')!

    fireEvent.mouseMove(wrapper, { clientX: 250 })

    const line = screen.getByTestId('region-viewer-cursor-line')
    const svg = line.closest('svg')!
    expect(
      svg.style.pointerEvents === 'none' || getComputedStyle(svg).pointerEvents === 'none'
    ).toBe(true)
  })

  test('cursor line is an SVG line element with expected attributes', () => {
    renderCursorInContext()
    const child = screen.getByTestId('child-track')
    const wrapper = child.closest('div[class]')!

    fireEvent.mouseMove(wrapper, { clientX: 250 })

    const line = screen.getByTestId('region-viewer-cursor-line')
    expect(line.tagName.toLowerCase()).toBe('line')
    expect(line.getAttribute('y1')).toBe('0')
    expect(line.getAttribute('y2')).toBe('100%')
    expect(line.getAttribute('stroke')).toBe('#000')
    expect(line.getAttribute('stroke-width')).toBe('1')
  })

  test('has no unexpected changes', () => {
    const tree = renderer.create(
      <RegionViewerContext.Provider value={regionViewerContextValue}>
        <Cursor onClick={() => {}}>
          <div>Track content</div>
        </Cursor>
      </RegionViewerContext.Provider>
    )
    expect(tree).toMatchSnapshot()
  })
})
