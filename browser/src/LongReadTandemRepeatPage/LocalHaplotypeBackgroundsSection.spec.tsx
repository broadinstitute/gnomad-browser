import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import LocalHaplotypeBackgroundsSection, {
  boundedRowExactAlleleIds,
  decomposeUniqueExactAlleles,
  ExactSequenceStrip,
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

const renderStrip = (props: React.ComponentProps<typeof ExactSequenceStrip>) =>
  render(
    <ThemeProvider
      theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
    >
      <ExactSequenceStrip {...props} />
    </ThemeProvider>
  )

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

describe('local haplotype exact target sequence strip', () => {
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

  test('motif-highlights one observed exact identity and marks selection with text and outline state', () => {
    renderStrip({
      allele: allele(),
      exactId: 'source-record~7',
      motifs: ['CAG'],
      selected: true,
    })

    const strip = screen.getByLabelText(/ALT 7 · \+6 bp; observed exact allele; selected/)
    expect(strip.getAttribute('data-exact-allele-id')).toBe('source-record~7')
    expect(strip.getAttribute('data-selected-exact-allele')).toBe('true')
    expect(strip.textContent).toContain('Selected')
    expect(strip.getAttribute('title')).toContain('not a cluster consensus')
  })

  test('falls back to an ordinary exact identity/length glyph instead of truncating unreadable sequence', () => {
    renderStrip({
      allele: allele({ alt: `C${'AG'.repeat(1_100)}`, length: 2_198 }),
      exactId: 'source-record~7',
      motifs: ['CAG'],
      selected: false,
    })

    expect(screen.getByText(/Exact identity \/ length glyph/)).not.toBeNull()
    expect(screen.getByLabelText(/exact sequence preview unavailable/)).not.toBeNull()
  })

  test.each([
    { allele: allele({ alt: null }), motifs: [] },
    { allele: allele({ ref: `C${'AG'.repeat(1_100)}` }), motifs: ['CAG'] },
    { allele: allele(), motifs: Array.from({ length: 65 }, (_, index) => `C${index}G`) },
  ])(
    'fails to the same glyph before decomposing an unavailable or over-bounded input',
    ({ allele: exactAllele, motifs }) => {
      renderStrip({
        allele: exactAllele,
        exactId: 'source-record~7',
        motifs,
        selected: false,
      })

      expect(screen.getByText(/sequence preview unavailable/)).not.toBeNull()
    }
  )
})
