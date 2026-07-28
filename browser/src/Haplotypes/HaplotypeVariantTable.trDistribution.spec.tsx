import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import HaplotypeVariantTable from './HaplotypeVariantTable'

jest.mock('../Link', () => ({ children, to, onClick }: any) => <a href={to} onClick={onClick}>{children}</a>)

const summaryTr = (altIndex: number, length: number, ac: number, afrAc: number) => ({
  variant_id: `chr22-100-TRV-9~${altIndex}`,
  source_variant_id: 'chr22-100-TRV-9',
  alt_index: altIndex,
  lr_cohort: 'hgsvc_hprc',
  chrom: '22',
  pos: 100,
  end: 110,
  length,
  allele_length: length,
  ref: 'AAAA',
  alt: altIndex === 1 ? 'A' : 'AAAAAAAAA',
  allele_type: 'trv',
  filters: [],
  motifs: ['A'],
  rsids: [],
  main_reference_region: { chrom: '22', start: 100, stop: 110 },
  freq: {
    all: { ac, an: 20, af: ac / 20 },
    populations: [{ id: 'afr', ac: afrAc, an: 10, af: afrAc / 10 }],
  },
})

describe('summary TR accordion distribution', () => {
  test('keeps ALT rows accessible and renders the shared locus distribution in each accordion', () => {
    const variants = [summaryTr(1, -3, 4, 2), summaryTr(2, 5, 6, 3)]
    const { container } = render(
      <HaplotypeVariantTable mode="summary" summaryVariants={variants} />
    )

    expect(screen.getAllByText('chr22-100-TRV-9')).toHaveLength(2)
    fireEvent.click(screen.getAllByText('chr22-100-TRV-9')[0].closest('tr')!)

    expect(screen.getByLabelText('TR allele length distribution')).not.toBeNull()
    expect(screen.getByText('Allele length range: -3 to 5bp')).not.toBeNull()
    expect(screen.getByText('Distinct allele lengths: 2')).not.toBeNull()
    expect(container.querySelectorAll('svg[aria-label="TR allele length distribution"] rect')).toHaveLength(2)
  })
})
