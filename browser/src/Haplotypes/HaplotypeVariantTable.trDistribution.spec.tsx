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

const haplotypeTr = (altIndex: number, length: number) => ({
  variant_id: `chr22-22854926-TRV-105TR-2..1bp~${altIndex}`,
  chrom: 'chr22',
  pos: 22854926,
  end: 22855031,
  ref: 'AAA',
  alt: 'A'.repeat(3 + length),
  allele_type: 'trv',
  allele_length: length,
  freq: { af: 0.1, ac: 1, an: 584 },
  populations: [],
  rsid: '',
})

const haplotypeGroup = (hash: number, sampleId: string, variants: any[]) => ({
  hash,
  start: 22854926,
  stop: 22855031,
  samples: [{ sample_id: sampleId, variant_sets: [{ readable_id: '', variants }] }],
  // Repeated authoritative/group rows reproduce the join inflation that caused
  // multiple cards and occurrence-based carrier totals.
  variants: { readable_id: '', variants: [variants[0], variants[0]] },
  below_threshold: { readable_id: '', variants: [] },
})

describe('summary variant columns', () => {
  test('hides group AF for AoU while retaining it for HGSVC/HPRC', () => {
    const variant = summaryTr(1, -3, 4, 2)
    const { rerender } = render(
      <HaplotypeVariantTable
        mode="summary"
        lrCohort="aou"
        summaryVariants={[{ ...variant, lr_cohort: 'aou' }]}
      />
    )

    expect(screen.queryByRole('columnheader', { name: 'Grp AF' })).toBeNull()

    rerender(
      <HaplotypeVariantTable mode="summary" lrCohort="hgsvc_hprc" summaryVariants={[variant]} />
    )
    expect(screen.getByRole('columnheader', { name: 'Grp AF' })).not.toBeNull()
  })
})

describe('summary TR accordion distribution', () => {
  test('renders one locus row and ignores a repeated ALT record', () => {
    const first = summaryTr(1, -3, 4, 2)
    const variants = [first, { ...first }, summaryTr(2, 5, 6, 3)]
    const { container } = render(
      <HaplotypeVariantTable mode="summary" summaryVariants={variants} />
    )

    expect(screen.getAllByText('chr22-100-TRV-9')).toHaveLength(1)
    fireEvent.click(screen.getByText('chr22-100-TRV-9').closest('tr')!)

    expect(screen.getByLabelText('TR allele length distribution')).not.toBeNull()
    expect(screen.getByText('Allele length range: -3 to 5bp')).not.toBeNull()
    expect(screen.getByText('Distinct allele lengths: 2')).not.toBeNull()
    expect(screen.getByText('Total carriers: 10')).not.toBeNull()
    expect(container.querySelectorAll('svg[aria-label="TR allele length distribution"] rect')).toHaveLength(2)
  })
})

describe('haplotype TR locus aggregation', () => {
  test('merges ALT/group rows and counts unique sample carrier identities', () => {
    const minusTwo = haplotypeTr(1, -2)
    const groups = [
      haplotypeGroup(1, 'sample-1', [minusTwo, haplotypeTr(2, 0)]),
      // Same sample/ALT in another group row is not another carrier occurrence.
      haplotypeGroup(2, 'sample-1', [{ ...minusTwo }]),
      haplotypeGroup(3, 'sample-2', [haplotypeTr(3, -1)]),
      haplotypeGroup(4, 'sample-3', [haplotypeTr(4, 1)]),
    ]

    render(
      <HaplotypeVariantTable
        mode="haplotype"
        haplotypeGroups={{ groups }}
        sampleMetadata={new Map([
          ['sample-1', { superpopulation: 'AFR' }],
          ['sample-2', { superpopulation: 'EUR' }],
          ['sample-3', { superpopulation: 'EAS' }],
        ]) as any}
      />
    )

    expect(screen.getAllByText('chr22-22854926-TRV-105TR-2..1bp')).toHaveLength(1)
    fireEvent.click(screen.getByText('chr22-22854926-TRV-105TR-2..1bp').closest('tr')!)

    expect(screen.getByText('Allele length range: -2 to 1bp')).not.toBeNull()
    expect(screen.getByText('Distinct allele lengths: 4')).not.toBeNull()
    expect(screen.getByText('Total carriers: 3')).not.toBeNull()
    expect(screen.queryByText('Motif Structure')).toBeNull()
  })

  test('renders motif decomposition only when trusted metadata is present', () => {
    const motifVariant = { ...haplotypeTr(1, -2), tr_motifs: 'A' }
    render(
      <HaplotypeVariantTable
        mode="haplotype"
        haplotypeGroups={{ groups: [haplotypeGroup(1, 'sample-1', [motifVariant])] }}
      />
    )

    fireEvent.click(screen.getByText('chr22-22854926-TRV-105TR-2..1bp').closest('tr')!)
    expect(screen.getByText('Motif Structure')).not.toBeNull()
    expect(screen.getByText('Units')).not.toBeNull()
  })

  test('uses carrier-resolved Diploid sequences for distribution and decomposition', () => {
    const canonical = { ...haplotypeTr(1, 0), tr_motifs: 'A' }
    const personalized = (alt: string) => ({ ...canonical, alt, allele_length: alt.length - canonical.ref.length })
    const group: any = {
      is_diplotype: true,
      hash: 1,
      start: canonical.pos,
      stop: canonical.end,
      samples: [
        {
          sample_id: 'sample-1', strand_mapping: { strandA: 0, strandB: 1 },
          haplotypeA: { readable_id: '', variants: [personalized('A')] },
          haplotypeB: { readable_id: '', variants: [personalized('AAAAAA')] },
          below_thresholdA: { readable_id: '', variants: [] },
          below_thresholdB: { readable_id: '', variants: [] },
        },
      ],
      haplotypeA: { readable_id: '', variants: [canonical] },
      haplotypeB: { readable_id: '', variants: [canonical] },
      below_thresholdA: { readable_id: '', variants: [] },
      below_thresholdB: { readable_id: '', variants: [] },
      roh_fraction: 1,
      is_roh: true,
      compound_het_pairs: [],
      is_compound_het: false,
    }

    render(<HaplotypeVariantTable mode="haplotype" haplotypeGroups={{ groups: [group] }} />)
    fireEvent.click(screen.getByText('chr22-22854926-TRV-105TR-2..1bp').closest('tr')!)

    expect(screen.getByText('Allele length range: -2 to 3bp')).not.toBeNull()
    expect(screen.getByText('Motif Structure')).not.toBeNull()
  })
})
