import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import { decomposeUniqueExactAlleles, ExactSequenceStrip } from './LocalHaplotypeBackgroundsSection'
import type { LongReadTrAllele } from './types'

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

describe('local haplotype exact target sequence strip', () => {
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

  test('fails to the same glyph when sequence or motif vocabulary is missing', () => {
    renderStrip({
      allele: allele({ alt: null }),
      exactId: 'source-record~7',
      motifs: [],
      selected: false,
    })

    expect(screen.getByText(/sequence preview unavailable/)).not.toBeNull()
  })
})
