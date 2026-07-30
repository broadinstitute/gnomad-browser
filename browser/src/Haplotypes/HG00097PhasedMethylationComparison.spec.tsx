import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

jest.mock('@gnomad/region-viewer', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    Track: ({ renderLeftPanel, children }: any) => mockReact.createElement(
      'div',
      null,
      renderLeftPanel(),
      children({ scalePosition: (position: number) => position - 47_040_000, width: 10_000 })
    ),
  }
})

// Jest mocks must be registered before importing the component under test.
// eslint-disable-next-line import/first
import HG00097PhasedMethylationComparison from './HG00097PhasedMethylationComparison'

const variant = (variantId: string, pos: number) => ({
  variant_id: variantId,
  chrom: 'chr22',
  pos,
  ref: 'A',
  alt: 'G',
  allele_type: 'snv',
  allele_length: 0,
  freq: { af: 0.1, ac: 1, an: 10 },
  populations: [],
  rsid: '',
})

const haplotypeGroups: any[] = [
  {
    samples: [{ sample_id: 'HG00097', vcf_strand: 1, phase_set: 'phase-a', variant_sets: [] }],
    variants: { variants: [variant('vcf-hap1-variant', 47_040_010)], readable_id: 'hap1' },
    below_threshold: { variants: [], readable_id: '' },
    start: 47_040_010,
    stop: 47_040_010,
    hash: 1,
  },
  {
    samples: [{ sample_id: 'HG00097', vcf_strand: 2, phase_set: 'phase-b', variant_sets: [] }],
    variants: { variants: [variant('vcf-hap2-variant', 47_040_020)], readable_id: 'hap2' },
    below_threshold: { variants: [], readable_id: '' },
    start: 47_040_020,
    stop: 47_040_020,
    hash: 2,
  },
  {
    samples: [{ sample_id: 'cohort-sample', vcf_strand: 1, phase_set: null, variant_sets: [] }],
    variants: { variants: [], readable_id: 'cohort' },
    below_threshold: { variants: [], readable_id: '' },
    start: 47_040_000,
    stop: 47_050_000,
    hash: 3,
  },
]

const records: any[] = [
  {
    chr: 'chr22', pos1: 47_040_001, pos2: 47_040_002, methylation: 25,
    sample: 'HG00097', coverage: 4, data_layer: 'SOURCE_PHASED',
    source_haplotype: 'HAP1', vcf_strand: null, phase_set: null,
  },
  {
    chr: 'chr22', pos1: 47_040_003, pos2: 47_040_004, methylation: 75,
    sample: 'HG00097', coverage: 8, data_layer: 'SOURCE_PHASED',
    source_haplotype: 'HAP2', vcf_strand: null, phase_set: null,
  },
]

describe('HG00097PhasedMethylationComparison', () => {
  test('pins both HG00097 variant rows and nests raw source labels in direct alignment', () => {
    render(
      <HG00097PhasedMethylationComparison
        haplotypeGroups={haplotypeGroups}
        records={records}
        orientationStatus="UNCONFIRMED"
      />
    )

    expect(screen.getByRole('region', { name: 'HG00097 pinned phased methylation comparison' })).toBeTruthy()
    const haplotype1 = screen.getByTestId('hg00097-vcf-haplotype-1-comparison')
    const haplotype2 = screen.getByTestId('hg00097-vcf-haplotype-2-comparison')
    expect(within(haplotype1).getByText('HG00097 VCF haplotype 1')).toBeTruthy()
    expect(within(haplotype1).getByText('vcf-hap1-variant')).toBeTruthy()
    expect(within(haplotype2).getByText('HG00097 VCF haplotype 2')).toBeTruthy()
    expect(within(haplotype2).getByText('vcf-hap2-variant')).toBeTruthy()

    expect(screen.getByTestId('hg00097-source-row-under-vcf-1').getAttribute('data-source-haplotype')).toBe('HAP1')
    expect(screen.getByTestId('hg00097-source-row-under-vcf-2').getAttribute('data-source-haplotype')).toBe('HAP2')
    expect(within(haplotype1).getByText('HG00097 source hap1')).toBeTruthy()
    expect(within(haplotype2).getByText('HG00097 source hap2')).toBeTruthy()
    expect(screen.getByText(/orientation unconfirmed/)).toBeTruthy()
    expect(screen.getByText(/does not record a scientific mapping or enable the phased methylation join/)).toBeTruthy()
    expect(screen.getByText(/complete cohort view remains available below/)).toBeTruthy()
  })

  test('swapped changes only which raw source row is displayed under each VCF row', () => {
    render(
      <HG00097PhasedMethylationComparison
        haplotypeGroups={haplotypeGroups}
        records={records}
        orientationStatus="UNCONFIRMED"
      />
    )

    fireEvent.click(screen.getByLabelText('swapped'))

    const haplotype1 = screen.getByTestId('hg00097-vcf-haplotype-1-comparison')
    const haplotype2 = screen.getByTestId('hg00097-vcf-haplotype-2-comparison')
    expect(screen.getByTestId('hg00097-source-row-under-vcf-1').getAttribute('data-source-haplotype')).toBe('HAP2')
    expect(screen.getByTestId('hg00097-source-row-under-vcf-2').getAttribute('data-source-haplotype')).toBe('HAP1')
    expect(within(haplotype1).getByText('HG00097 source hap2')).toBeTruthy()
    expect(within(haplotype2).getByText('HG00097 source hap1')).toBeTruthy()
    expect((screen.getByLabelText('swapped') as HTMLInputElement).checked).toBe(true)
    expect(records.every((record) => record.vcf_strand === null && record.phase_set === null)).toBe(true)
  })
})
