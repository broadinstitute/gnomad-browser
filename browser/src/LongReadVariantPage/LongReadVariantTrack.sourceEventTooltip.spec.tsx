import React from 'react'
import { render, screen } from '@testing-library/react'

import { SourceEventTooltip } from './LongReadVariantTrack'
import { aggregateSourceEvents, type SourceEventRecord } from './sourceEventAggregation'

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

  test('reports mixed generic SV constituents instead of selecting one subtype', () => {
    const event = aggregateSourceEvents([
      allele({ allele_type: 'INV', allele_length: -30 }),
      allele({ variant_id: 'complex', allele_type: 'COMPLEX', allele_length: 45 }),
    ])[0]

    const { container } = render(
      <SourceEventTooltip hovered={{ event: event as any, band: 'sv', x: 0, y: 0 }} />
    )

    expect(container.textContent).toContain('Constituents: INV, COMPLEX')
    expect(screen.getByText('-30 bp to +45 bp')).not.toBeNull()
    expect(screen.getByText('30 bp to 45 bp')).not.toBeNull()
    expect(screen.getByText('1:100 to 130')).not.toBeNull()
  })
})
