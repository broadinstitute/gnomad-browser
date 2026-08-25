import React from 'react'
import 'jest-styled-components'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import LocalHaplotypeBackgroundsSection, {
  boundedExactTrDecomposition,
  boundedRowExactAlleleIds,
  decomposeUniqueExactAlleles,
  LocalAncestryLegend,
  LocalHaplotypeHorizontalScroller,
} from './LocalHaplotypeBackgroundsSection'
import type { LongReadTrAllele, LongReadTrLocus } from './types'

const allele = (overrides: Partial<LongReadTrAllele> = {}): LongReadTrAllele => ({
  variant_id: 'canonical-display-id',
  source_variant_id: 'source-record',
  alt_index: 7,
  alt_count: 9,
  ref: 'CAG',
  alt: 'CAGCAGCAG',
  length: 6,
  repeat_count: null,
  repeat_count_source: null,
  motif_purity: null,
  freq: { all: { ac: 2, an: 100, af: 0.02 }, populations: [] },
  ...overrides,
})

describe('local haplotype section availability', () => {
  const originalFetch = (global as any).fetch

  beforeEach(() => {
    ;(global as any).fetch = jest.fn()
  })

  afterEach(() => {
    if (originalFetch) (global as any).fetch = originalFetch
    else delete (global as any).fetch
  })

  const renderSection = (locus: Partial<LongReadTrLocus>) =>
    render(
      <ThemeProvider
        theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
      >
        <LocalHaplotypeBackgroundsSection
          locus={
            {
              chrom: '22',
              region: { chrom: '22', start0: 100, end0: 110, size: 10 },
              motifs: [],
              source_records: [],
              selected_allele: null,
              alleles: { nodes: [], page_info: { has_next_page: false } },
              ...locus,
            } as LongReadTrLocus
          }
          selectedAlleleId={undefined}
        />
      </ThemeProvider>
    )

  test('fails closed for AoU without requesting haplotype data', () => {
    renderSection({
      lr_cohort: 'aou',
      selected_allele: null,
      alleles: { nodes: [], page_info: { has_next_page: false } },
    })
    expect(screen.getByText(/unavailable for this cohort/)).not.toBeNull()
    expect((global as any).fetch).not.toHaveBeenCalled()
  })

  test('prompts for an exact allele without requesting haplotype data', () => {
    renderSection({
      lr_cohort: 'hgsvc_hprc',
      selected_allele: null,
      alleles: { nodes: [], page_info: { has_next_page: false } },
    })
    expect(screen.getByText(/Select an exact allele/)).not.toBeNull()
    expect((global as any).fetch).not.toHaveBeenCalled()
  })
})

describe('local haplotype narrow-width scrolling', () => {
  test('keeps fixed-width aligned content in a focusable horizontal region', () => {
    render(
      <LocalHaplotypeHorizontalScroller aria-label="Narrow local haplotype visualization">
        <div style={{ width: 720 }}>Aligned cluster, genomic, and genealogy columns</div>
      </LocalHaplotypeHorizontalScroller>
    )

    const scroller = screen.getByRole('region', {
      name: 'Narrow local haplotype visualization',
    })
    expect(scroller.getAttribute('tabindex')).toBe('0')
    expect(scroller).toHaveStyleRule('box-sizing', 'border-box')
    expect(scroller).toHaveStyleRule('width', '100%')
    expect(scroller).toHaveStyleRule('max-width', '100%')
    expect(scroller).toHaveStyleRule('min-width', '0')
    expect(scroller).toHaveStyleRule('overflow-x', 'auto')
    expect(scroller).toHaveStyleRule('outline', '3px solid #111', {
      modifier: ':focus-visible',
    })

    scroller.focus()
    expect(document.activeElement).toBe(scroller)
  })
})

describe('local haplotype ancestry legend placement', () => {
  test('right-justifies the legend above the local genealogy panel', () => {
    render(
      <LocalAncestryLegend aria-label="Local ancestry legend">
        <span>AFR</span>
        <span>EUR</span>
      </LocalAncestryLegend>
    )

    const legend = screen.getByLabelText('Local ancestry legend')
    expect(legend).toHaveStyleRule('justify-content', 'flex-end')
    expect(legend).toHaveStyleRule('text-align', 'right')
    expect(legend).toHaveStyleRule('padding-right', '0.75rem')
  })
})

describe('local haplotype exact target motif diagrams', () => {
  test('always keeps the selected identity in the bounded strip set and exposes all omissions', () => {
    expect(
      boundedRowExactAlleleIds(['source~1', 'source~2', 'source~3', 'source~7'], 'source~7')
    ).toEqual({
      displayed: ['source~1', 'source~2', 'source~7'],
      omitted: ['source~3'],
    })
  })

  test('decomposes each unique exact identity at most once across mixed cluster rows', () => {
    const decompose = jest.fn(() => null)
    const exactAllele = allele()
    const result = decomposeUniqueExactAlleles({
      exactAlleleIds: ['source-record~7', 'source-record~8', 'source-record~7'],
      alleleByExactId: new Map([
        ['source-record~7', exactAllele],
        ['source-record~8', allele({ alt_index: 8 })],
      ]),
      motifs: ['CAG'],
      decompose,
    })

    expect(decompose).toHaveBeenCalledTimes(2)
    expect(result.size).toBe(2)
  })

  test('fails closed before decomposing unavailable or over-large exact sequences', () => {
    expect(
      boundedExactTrDecomposition(allele({ alt: `C${'AG'.repeat(1_100)}`, length: 2_198 }), ['CAG'])
    ).toBeNull()
    expect(boundedExactTrDecomposition(allele({ alt: null }), ['CAG'])).toBeNull()
    expect(
      boundedExactTrDecomposition(
        allele(),
        Array.from({ length: 65 }, (_, index) => `C${index}G`)
      )
    ).toBeNull()
  })
})
