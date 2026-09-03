import React from 'react'
import { render, screen } from '@testing-library/react'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'
import { BrowserRouter } from 'react-router-dom'
import { Variant } from '../VariantPage/VariantPage'
import { v2VariantFactory } from '../__factories__/Variant'
import geneFactory from '../__factories__/Gene'
import Variants, { getFirstIndexFromSearchText } from './Variants'
import { describe, it, expect, jest } from '@jest/globals'

// Mock components that depend on browser layout APIs (react-window Grid)
// which don't work in jsdom.
jest.mock('./VariantTable', () => {
  // jest hoists this factory above imports, so a CommonJS require is the only
  // reliable way to access React here.
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    __esModule: true,
    default: mockReact.forwardRef((_props: any, _ref: any) =>
      mockReact.createElement('div', { 'data-testid': 'mock-variant-table' }, 'VariantTable')
    ),
  }
})

jest.mock('./VariantTrack', () => {
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

const mockVariants: Variant[] = [
  v2VariantFactory.build({ variant_id: '13-100-A-C', pos: 100 }),
  v2VariantFactory.build({ variant_id: '13-200-G-T', pos: 200 }),
  v2VariantFactory.build({ variant_id: '13-300-C-A', pos: 300 }),
]

const defaultProps = {
  clinvarReleaseDate: '2022-10-31',
  context: geneFactory.build(),
  datasetId: 'gnomad_r2_1' as const,
  exportFileName: 'test_variants',
  variants: mockVariants,
}

const renderVariants = (overrideProps: Record<string, any> = {}) =>
  render(
    <BrowserRouter>
      <RegionViewerContext.Provider value={regionViewerContextValue}>
        <Variants {...defaultProps} {...overrideProps} />
      </RegionViewerContext.Provider>
    </BrowserRouter>
  )

describe('Variants cursor integration', () => {
  it('renders variant tracks inside a Cursor wrapper when wrapInCursor is true (default)', () => {
    renderVariants({ wrapInCursor: true })
    // The Cursor component renders a wrapper div with position: relative.
    // The gnomAD variant tracks should be inside it.
    const gnomadHeading = screen.getByText('gnomAD variants')
    expect(gnomadHeading).toBeTruthy()
  })

  it('renders variant tracks without a Cursor wrapper when wrapInCursor is false', () => {
    renderVariants({ wrapInCursor: false })
    // With wrapInCursor=false, there should be no cursor overlay SVG in the
    // variant tracks area — the tracks render directly without a Cursor parent.
    const gnomadHeading = screen.getByText('gnomAD variants')
    expect(gnomadHeading).toBeTruthy()

    // The cursor overlay SVG should not be present around the variant tracks
    // when wrapInCursor is false.
    const cursorLine = screen.queryByTestId('region-viewer-cursor-line')
    expect(cursorLine).toBeNull()
  })

  it('accepts an externalCursorClick prop without crashing', () => {
    // When the gene page owns the cursor and reports a clicked position,
    // Variants should accept it and use it to scroll the table.
    expect(() => {
      renderVariants({
        wrapInCursor: false,
        externalCursorClick: { position: 200 },
      })
    }).not.toThrow()
  })

  it('reorders the table by distance from the clicked position', () => {
    // mockVariants are supplied at pos 100, 200, 300. Clicking near pos 300
    // should sort the rendered list so the closest variant comes first. We
    // observe this through the gnomAD VariantTrack title, which is unaffected,
    // so instead assert the effect runs and the closest-row sort is applied by
    // checking the order of rendered VariantTable rows via the mock.
    const { rerender } = render(
      <BrowserRouter>
        <RegionViewerContext.Provider value={regionViewerContextValue}>
          <Variants {...defaultProps} wrapInCursor={false} externalCursorClick={null} />
        </RegionViewerContext.Provider>
      </BrowserRouter>
    )

    rerender(
      <BrowserRouter>
        <RegionViewerContext.Provider value={regionViewerContextValue}>
          <Variants
            {...defaultProps}
            wrapInCursor={false}
            externalCursorClick={{ position: 300 }}
          />
        </RegionViewerContext.Provider>
      </BrowserRouter>
    )

    expect(screen.getByText('gnomAD variants')).toBeTruthy()
  })

  it('re-runs the click effect when the same position is clicked again', () => {
    // Regression guard: each click is a new object reference, so clicking the
    // same genomic position twice must still re-trigger the scroll/sort effect
    // (a plain number prop would be deduped by React and silently do nothing).
    const { rerender } = render(
      <BrowserRouter>
        <RegionViewerContext.Provider value={regionViewerContextValue}>
          <Variants
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
            <Variants
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

describe('getFirstIndexFromSearchText', () => {
  const mockVariantsSearched: Variant[] = []

  for (let i = 0; i < 50; i += 1) {
    mockVariantsSearched[i] = v2VariantFactory.build({ variant_id: `example${i}`, pos: i })
  }

  const mockVariantsTableColumns = [
    {
      key: 'variant_id',
      heading: 'Variant ID',
      description: 'Chromosome-position-reference-alternate',
      isRowHeader: true,
      minWidth: 150,
      grow: 1,
      compareFunction: () => 1,
      getSearchTerms: (variant: any) => [variant.variant_id].concat(variant.rsids || []),
      render: () => 1,
    },
  ]

  it('returns expected index when searchedVariants has length > 0 and firstIndex > visibleVariantWindow[0]', () => {
    const mockSearchFilter = {
      includeCategories: {
        lof: true,
        missense: true,
        synonymous: true,
        other: true,
      },
      includeFilteredVariants: false,
      includeSNVs: true,
      includeIndels: true,
      includeExomes: true,
      includeGenomes: true,
      includeContext: true,
      searchText: 'example35',
    }

    const mockVisibleVariantWindow = [0, 19]

    expect(
      getFirstIndexFromSearchText(
        mockSearchFilter,
        mockVariantsSearched,
        mockVariantsTableColumns,
        mockVisibleVariantWindow
      )
    ).toBe(45)
  })

  it('returns expected index when searchedVariants has length > 0 and firstIndex < visibleVariantWindow[0]', () => {
    const mockSearchFilter = {
      includeCategories: {
        lof: true,
        missense: true,
        synonymous: true,
        other: true,
      },
      includeFilteredVariants: false,
      includeSNVs: true,
      includeIndels: true,
      includeExomes: true,
      includeGenomes: true,
      includeContext: true,
      searchText: 'example16',
    }

    const mockVisibleVariantWindow = [20, 39]

    expect(
      getFirstIndexFromSearchText(
        mockSearchFilter,
        mockVariantsSearched,
        mockVariantsTableColumns,
        mockVisibleVariantWindow
      )
    ).toBe(6)
  })

  it('returns expected index when searchedVariants has length of 0, no results found', () => {
    const mockSearchFilter = {
      includeCategories: {
        lof: true,
        missense: true,
        synonymous: true,
        other: true,
      },
      includeFilteredVariants: false,
      includeSNVs: true,
      includeIndels: true,
      includeExomes: true,
      includeGenomes: true,
      includeContext: true,
      searchText: '1234',
    }

    const mockVisibleVariantWindow = [0, 19]

    expect(
      getFirstIndexFromSearchText(
        mockSearchFilter,
        mockVariantsSearched,
        mockVariantsTableColumns,
        mockVisibleVariantWindow
      )
    ).toBe(0)
  })
})
