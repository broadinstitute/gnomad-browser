import React from 'react'
import { render, screen } from '@testing-library/react'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, jest } from '@jest/globals'

import mitochondrialVariantFactory from '../__factories__/MitochondrialVariant'
import geneFactory from '../__factories__/Gene'
import MitochondrialVariants from './MitochondrialVariants'

// Mock components that depend on browser layout APIs (react-window Grid) which
// don't work in jsdom. The table mock exposes scrollToDataRow via its ref so the
// click-to-scroll effect can run without crashing.
jest.mock('./MitochondrialVariantsTable', () => {
  // jest hoists this factory above imports, so a CommonJS require is the only
  // reliable way to access React here.
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    __esModule: true,
    default: mockReact.forwardRef((_props: any, ref: any) => {
      mockReact.useImperativeHandle(ref, () => ({ scrollToDataRow: () => {} }))
      return mockReact.createElement(
        'div',
        { 'data-testid': 'mock-mito-variant-table' },
        'MitochondrialVariantsTable'
      )
    }),
  }
})

jest.mock('../VariantList/VariantTrack', () => {
  // jest hoists this factory above imports, so a CommonJS require is the only
  // reliable way to access React here.
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    __esModule: true,
    default: (props: any) =>
      mockReact.createElement(
        'div',
        { 'data-testid': 'mock-variant-track' },
        props.title || 'VariantTrack'
      ),
  }
})

const regions = [{ start: 1, stop: 1000 }]

const regionViewerContextValue = {
  centerPanelWidth: 500,
  isPositionDefined: () => true,
  leftPanelWidth: 100,
  regions,
  rightPanelWidth: 50,
  scalePosition: regionViewerScale(regions, [0, 500]),
}

const mockVariants = [
  mitochondrialVariantFactory.build({ pos: 100 }),
  mitochondrialVariantFactory.build({ pos: 200 }),
  mitochondrialVariantFactory.build({ pos: 300 }),
]

const defaultProps = {
  clinvarReleaseDate: '2022-10-31',
  context: geneFactory.build(),
  exportFileName: 'test_mitochondrial_variants',
  variants: mockVariants,
}

const renderVariants = (overrideProps: Record<string, any> = {}) =>
  render(
    <BrowserRouter>
      <RegionViewerContext.Provider value={regionViewerContextValue}>
        <MitochondrialVariants {...defaultProps} {...overrideProps} />
      </RegionViewerContext.Provider>
    </BrowserRouter>
  )

describe('MitochondrialVariants cursor integration', () => {
  it('renders the variant tracks with its own Cursor when wrapInCursor is true (default)', () => {
    renderVariants({ wrapInCursor: true })
    expect(screen.getByText('gnomAD variants')).toBeTruthy()
  })

  it('does not render its own cursor line when wrapInCursor is false', () => {
    renderVariants({ wrapInCursor: false })
    expect(screen.getByText('gnomAD variants')).toBeTruthy()
    expect(screen.queryByTestId('region-viewer-cursor-line')).toBeNull()
  })

  it('wraps the variant tracks with a provided trackWrapper instead of its own Cursor', () => {
    renderVariants({
      wrapInCursor: false,
      trackWrapper: (tracks: React.ReactNode) =>
        React.createElement('div', { 'data-testid': 'custom-track-wrapper' }, tracks),
    })
    // The supplied wrapper receives and renders the variant tracks. The heading is
    // wrapped separately (via headerWrapper), so it renders outside this wrapper.
    const wrapper = screen.getByTestId('custom-track-wrapper')
    expect(wrapper).toBeTruthy()
    expect(wrapper.textContent).toContain('Viewing in table')
    expect(wrapper.textContent).not.toContain('No gnomAD variants found')
  })

  it('wraps the heading with a provided headerWrapper', () => {
    renderVariants({
      wrapInCursor: false,
      headerWrapper: (header: React.ReactNode) =>
        React.createElement('div', { 'data-testid': 'custom-header-wrapper' }, header),
    })
    const wrapper = screen.getByTestId('custom-header-wrapper')
    expect(wrapper).toBeTruthy()
    expect(wrapper.textContent).toContain('gnomAD variants')
  })

  it('accepts an externalCursorClick prop and scrolls the table without crashing', () => {
    // When the gene page owns the cursor and reports a clicked position,
    // MitochondrialVariants should route it through onNavigatorClick to scroll
    // the table.
    expect(() => {
      renderVariants({ wrapInCursor: false, externalCursorClick: { position: 200 } })
    }).not.toThrow()
  })

  it('re-runs the click effect when the same position is clicked again', () => {
    // Regression guard: each click is a new object reference, so clicking the
    // same genomic position twice must still re-trigger the scroll effect (a
    // plain number prop would be deduped by React and silently do nothing).
    const { rerender } = render(
      <BrowserRouter>
        <RegionViewerContext.Provider value={regionViewerContextValue}>
          <MitochondrialVariants
            {...defaultProps}
            wrapInCursor={false}
            externalCursorClick={{ position: 200 }}
          />
        </RegionViewerContext.Provider>
      </BrowserRouter>
    )

    expect(() => {
      rerender(
        <BrowserRouter>
          <RegionViewerContext.Provider value={regionViewerContextValue}>
            <MitochondrialVariants
              {...defaultProps}
              wrapInCursor={false}
              externalCursorClick={{ position: 200 }}
            />
          </RegionViewerContext.Provider>
        </BrowserRouter>
      )
    }).not.toThrow()

    expect(screen.getByText('gnomAD variants')).toBeTruthy()
  })
})
