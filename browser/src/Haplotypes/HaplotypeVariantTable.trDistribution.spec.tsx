import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import HaplotypeVariantTable from './HaplotypeVariantTable'
import { clearExpandedTrDistributionCache } from './ExpandedTrDistributions'

jest.mock('../Link', () => ({ children, to, onClick }: any) => (
  <a href={to} onClick={onClick}>
    {children}
  </a>
))

beforeEach(() => {
  clearExpandedTrDistributionCache()
  global.fetch = jest.fn(() => new Promise(() => {})) as typeof fetch
})

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
  samples: [
    {
      sample_id: sampleId,
      vcf_strand: 1,
      phase_set: null,
      variant_sets: [{ readable_id: '', variants }],
    },
  ],
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

  test('AoU-only primary and enveloped navigation stays explicitly AoU', () => {
    const enveloped = {
      ...summaryTr(2, 5, 2, 0),
      variant_id: 'chr22-101-INS~2',
      source_variant_id: 'chr22-101-INS',
      pos: 101,
      allele_type: 'ins',
      lr_cohort: 'aou',
    }
    const parent = {
      ...summaryTr(1, -3, 4, 0),
      lr_cohort: 'aou',
      enveloped_ids: [enveloped.variant_id],
    }
    render(
      <HaplotypeVariantTable mode="summary" lrCohort="aou" summaryVariants={[parent, enveloped]} />
    )

    expect(screen.getByRole('link', { name: '22-100-TRV-9' }).getAttribute('href')).toBe(
      `/variant/${parent.variant_id}?dataset=gnomad_r4_lr&lr_cohort=aou`
    )
    fireEvent.click(screen.getByText('22-100-TRV-9').closest('tr')!)
    expect(screen.getByRole('link', { name: '22-101-INS~2' }).getAttribute('href')).toBe(
      `/variant/${enveloped.variant_id}?dataset=gnomad_r4_lr&lr_cohort=aou`
    )
    expect(screen.queryByText(/^chr22-/)).toBeNull()
  })

  test('both-cohort rows preserve each row cohort in navigation', () => {
    const hgsvc = summaryTr(1, -3, 4, 2)
    const aou = {
      ...summaryTr(2, 5, 6, 0),
      variant_id: 'chr22-200-TRV-10~2',
      source_variant_id: 'chr22-200-TRV-10',
      pos: 200,
      lr_cohort: 'aou',
    }
    render(
      <HaplotypeVariantTable mode="summary" lrCohort="hgsvc_hprc" summaryVariants={[hgsvc, aou]} />
    )

    expect(screen.getByRole('link', { name: '22-100-TRV-9' }).getAttribute('href')).toBe(
      `/variant/${hgsvc.variant_id}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
    expect(screen.getByRole('link', { name: '22-200-TRV-10' }).getAttribute('href')).toBe(
      `/variant/${aou.variant_id}?dataset=gnomad_r4_lr&lr_cohort=aou`
    )
  })
})

describe('haplotype short-read match column', () => {
  test('links matched IDs and renders a neutral dash for null IDs', () => {
    const matched = {
      ...haplotypeTr(1, 0),
      variant_id: '22-100-A-T',
      pos: 100,
      end: null,
      ref: 'A',
      alt: 'T',
      allele_type: 'snv',
      allele_length: 0,
      short_read_match_id: '22-100-A-G',
    }
    const unmatched = {
      ...matched,
      variant_id: '22-101-C-T',
      pos: 101,
      ref: 'C',
      short_read_match_id: null,
    }

    render(
      <HaplotypeVariantTable
        mode="haplotype"
        haplotypeGroups={{
          groups: [
            haplotypeGroup(1, 'sample-1', [matched]),
            haplotypeGroup(2, 'sample-2', [unmatched]),
          ],
        }}
      />
    )

    const headers = screen.getAllByRole('columnheader')
    const srColumn = headers.findIndex((header) => header.textContent === 'SR Match')
    expect(srColumn).toBeGreaterThan(-1)

    const matchedRow = screen.getByRole('link', { name: matched.variant_id }).closest('tr')!
    const matchedCell = matchedRow.querySelectorAll('td')[srColumn]
    expect(matchedCell.textContent).toBe('22-100-A-G')
    expect(matchedCell.querySelector('a')?.getAttribute('href')).toBe(
      '/variant/22-100-A-G?dataset=gnomad_r4'
    )

    const unmatchedRow = screen.getByRole('link', { name: unmatched.variant_id }).closest('tr')!
    const unmatchedCell = unmatchedRow.querySelectorAll('td')[srColumn]
    expect(unmatchedCell.textContent).toBe('—')
    expect(unmatchedCell.querySelector('a')).toBeNull()
  })
})

describe('summary TR expanded row', () => {
  test('renders one locus row, ignores a repeated ALT record, and hides the assigned plot', () => {
    const first = summaryTr(1, -3, 4, 2)
    const variants = [first, { ...first }, summaryTr(2, 5, 6, 3)]
    render(<HaplotypeVariantTable mode="summary" summaryVariants={variants} />)

    expect(screen.getAllByText('22-100-TRV-9')).toHaveLength(1)
    fireEvent.click(screen.getByText('22-100-TRV-9').closest('tr')!)

    expect(screen.queryByText('Assigned-carrier length distribution')).toBeNull()
    expect(screen.queryByLabelText('TR allele length distribution')).toBeNull()
    expect(screen.getByText('Allele length range: -3 to 5bp')).not.toBeNull()
    expect(screen.getByText('Distinct allele lengths: 2')).not.toBeNull()
    expect(screen.getByText('Total carriers: 10')).not.toBeNull()
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
        sampleMetadata={
          new Map([
            ['sample-1', { superpopulation: 'AFR' }],
            ['sample-2', { superpopulation: 'EUR' }],
            ['sample-3', { superpopulation: 'EAS' }],
          ]) as any
        }
      />
    )

    expect(screen.getAllByText('22-22854926-TRV-105TR-2..1bp')).toHaveLength(1)
    fireEvent.click(screen.getByText('22-22854926-TRV-105TR-2..1bp').closest('tr')!)

    expect(screen.getByText('Allele length range: -2 to 1bp')).not.toBeNull()
    expect(screen.getByText('Distinct allele lengths: 4')).not.toBeNull()
    expect(screen.getByText('Total carriers: 3')).not.toBeNull()
    expect(
      screen.queryByLabelText('Deterministically haplotype-assigned motif structures')
    ).toBeNull()
    expect(screen.getByText('Full-cohort repeat-count distributions')).not.toBeNull()
    expect(screen.queryByText('Assigned-carrier length distribution')).toBeNull()
    expect(screen.queryByLabelText('TR allele length distribution')).toBeNull()
  })

  test('prioritizes the partial motif grid and uses carrier-resolved Diploid ALT copies', () => {
    const canonical = { ...haplotypeTr(1, 0), tr_motifs: 'A' }
    const personalized = (alt: string) => ({
      ...canonical,
      alt,
      allele_length: alt.length - canonical.ref.length,
    })
    const group: any = {
      is_diplotype: true,
      hash: 1,
      start: canonical.pos,
      stop: canonical.end,
      samples: [
        {
          sample_id: 'sample-1',
          strand_mapping: { strandA: 1, strandB: 2 },
          phase_set_mapping: { phaseSetA: 'ps-a', phaseSetB: 'ps-b' },
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

    render(
      <HaplotypeVariantTable
        mode="haplotype"
        haplotypeGroups={{ groups: [group] }}
        ambiguousUnphasedRows={85}
      />
    )
    fireEvent.click(screen.getByText('22-22854926-TRV-105TR-2..1bp').closest('tr')!)

    const grid = screen.getByLabelText('Deterministically haplotype-assigned motif structures')
    expect(grid).not.toBeNull()
    expect(grid.textContent).toContain('Assigned motif structures')
    expect(grid.textContent).toContain('Ambiguous unphased carrier rows excluded: 85')
    expect(grid.textContent).not.toContain('partial assigned-copy view')
    expect(grid.textContent).not.toContain('does not identify whether the ALT copy belongs')
    expect(screen.getByText('Assigned copies')).not.toBeNull()

    fireEvent.click(screen.getByLabelText('About assigned motif structures'))
    expect(screen.getByText(/partial assigned-copy view/)).not.toBeNull()
    expect(screen.getByText(/does not identify whether the ALT copy belongs/)).not.toBeNull()
    expect(screen.getByText(/this excludes 85 carrier rows/)).not.toBeNull()

    expect(screen.getByText('Allele length range: -2 to 3bp')).not.toBeNull()
    expect(screen.getByText('Full-cohort repeat-count distributions')).not.toBeNull()
    expect(screen.queryByText('Assigned-carrier length distribution')).toBeNull()
    expect(screen.queryByLabelText('TR allele length distribution')).toBeNull()
  })
})
