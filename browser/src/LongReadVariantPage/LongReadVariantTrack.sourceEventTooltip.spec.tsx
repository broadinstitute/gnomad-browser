import React from 'react'
import { render, screen } from '@testing-library/react'

import {
  SourceEventTooltip,
  TrLocusTooltip,
  VariantTooltip,
  getTrReferenceBarGeometry,
} from './LongReadVariantTrack'
import { aggregateSourceEvents, type SourceEventRecord } from './sourceEventAggregation'
import { aggregateTrLoci } from './trLocusAggregation'

const allele = (overrides: Partial<SourceEventRecord> = {}): SourceEventRecord => ({
  variant_id: '1-100-event-alt',
  source_variant_id: 'event-1',
  chrom: '1',
  pos: 100,
  end: 130,
  start: 100,
  stop: 130,
  allele_length: 30,
  allele_type: 'INS',
  main_reference_region: null,
  freq: { all: { af: 0.01 } },
  ...overrides,
})

describe('TR reference-locus rendering', () => {
  test('uses the reference span instead of a fixed-width summary mark', () => {
    expect(getTrReferenceBarGeometry(424, 479, (position) => position - 400)).toEqual({
      startX: 24,
      blockWidth: 55,
    })
    expect(getTrReferenceBarGeometry(424, 424, (position) => position - 400)).toEqual({
      startX: 22.5,
      blockWidth: 3,
    })
  })

  test('distinguishes reference span from signed ALT length differences', () => {
    const locus = aggregateTrLoci([
      {
        variant_id: 'chr4-424-TRV-55~1',
        source_variant_id: 'chr4-424-TRV-55',
        chrom: '4',
        pos: 424,
        end: 479,
        allele_length: -25,
        main_reference_region: null,
        freq: { all: { af: 0.2, ac: 2 } },
      },
      {
        variant_id: 'chr4-424-TRV-55~2',
        source_variant_id: 'chr4-424-TRV-55',
        chrom: '4',
        pos: 424,
        end: 479,
        allele_length: 3606,
        main_reference_region: null,
        freq: { all: { af: 0.01, ac: 1 } },
      },
    ])[0]

    const { container } = render(
      <TrLocusTooltip hovered={{ locus: locus as any, x: 0, y: 0 }} />
    )

    expect(container.textContent).toContain('Reference locus: 4:424-479')
    expect(container.textContent).toContain('Reference span: 56 bp')
    expect(container.textContent).toContain('ALT−REF length: -25 bp to +3606 bp')
    expect(container.textContent).toContain('Added ALT bases have no GRCh38 coordinates')
  })
})

describe('summary variant hover details', () => {
  test('normalizes the displayed ID without changing the hovered record', () => {
    const variant = {
      variant_id: 'chr22-100-A-T',
      chrom: 'chr22',
      pos: 100,
      end: 100,
      ref: 'A',
      alt: 'T',
      allele_length: 0,
      allele_type: 'SNV',
      major_consequence: null,
      motifs: null,
      main_reference_region: null,
      filters: [],
      sv_consequences: [],
      freq: { all: { af: 0.1 } },
    }

    const { container } = render(
      <VariantTooltip hovered={{ variant, x: 0, y: 0 } as any} />
    )

    expect(container.textContent).toContain('Variant ID: 22-100-A-T')
    expect(container.textContent).not.toContain('chr22-100-A-T')
    expect(variant.variant_id).toBe('chr22-100-A-T')
  })
})

describe('source event hover details', () => {
  test('renders insertion distribution and explicit multi-ALT click behavior', () => {
    const event = aggregateSourceEvents([
      allele({ allele_length: 20 }),
      allele({ variant_id: 'alt-2', allele_length: 35, freq: { all: { af: 0.2 } } }),
    ])[0]

    render(<SourceEventTooltip hovered={{ event: event as any, band: 'ins', x: 0, y: 0 }} />)

    expect(screen.getByText('20 bp to 35 bp')).not.toBeNull()
    expect(screen.getByLabelText('Insertion length distribution')).not.toBeNull()
    expect(screen.getByText(/Click opens the maximum-AF ALT record/)).not.toBeNull()
  })

  test('renders per-record deletion AF scatter and preserves unavailable AF/AN details', () => {
    const event = aggregateSourceEvents([
      allele({
        allele_type: 'DEL',
        allele_length: -7,
        start: 20077152,
        stop: 20077159,
        freq: { all: { af: 0.1, ac: 2, an: 20 } },
      }),
      allele({
        variant_id: 'equal-length',
        allele_type: 'ALU_DEL',
        allele_length: -7,
        start: 20077152,
        stop: 20077159,
        freq: { all: { af: 0.2, ac: 4, an: 20 } },
      }),
      allele({
        variant_id: 'missing-af',
        allele_type: 'SVA_DEL',
        allele_length: -17,
        start: 20077152,
        stop: 20077169,
        freq: { all: { ac: 1 } },
      }),
    ])[0]

    const { container } = render(
      <SourceEventTooltip hovered={{ event: event as any, band: 'del', x: 0, y: 0 }} />
    )

    expect(container.textContent).toContain('Structural locus: 1:20077152-20077169 (deletion)')
    expect(screen.getByText('7 bp to 17 bp')).not.toBeNull()
    expect(screen.getByText('1:20077152 to 20077159-20077169')).not.toBeNull()
    expect(
      screen.getByLabelText('Deletion allelic-series plot').querySelectorAll('circle')
    ).toHaveLength(2)
    expect(screen.getByLabelText('Deletion ALT frequency details').textContent).toContain(
      '17 bp: AC 1, AN Unavailable, AF Unavailable'
    )
  })

  test('reports normalized duplication-family constituents without losing subtype detail', () => {
    const event = aggregateSourceEvents([
      allele({ allele_type: 'DUP', allele_length: 30 }),
      allele({
        variant_id: 'complex',
        source_variant_id: 'allele-specific',
        allele_type: 'COMPLEX_DUP',
        allele_length: 45,
      }),
    ])[0]

    const { container } = render(
      <SourceEventTooltip hovered={{ event: event as any, band: 'dup', x: 0, y: 0 }} />
    )

    expect(container.textContent).toContain('Structural locus: 1:100-130 (duplication)')
    expect(container.textContent).toContain('Constituents: DUP, COMPLEX_DUP')
    expect(screen.getByText('30 bp to 45 bp')).not.toBeNull()
    expect(screen.getByText('1:100 to 130')).not.toBeNull()
  })
})
