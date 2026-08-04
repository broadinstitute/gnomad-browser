import React from 'react'
import { render, screen } from '@testing-library/react'

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

// eslint-disable-next-line import/first
import SourcePhasedMethylationComparison from './HG00097PhasedMethylationComparison'

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
    variants: { variants: [variant('vcf-gt1-variant', 47_040_010)], readable_id: 'gt1' },
    below_threshold: { variants: [], readable_id: '' },
    start: 47_040_010,
    stop: 47_040_010,
    hash: 1,
  },
  {
    samples: [{ sample_id: 'HG00097', vcf_strand: 2, phase_set: 'phase-b', variant_sets: [] }],
    variants: { variants: [variant('vcf-gt2-variant', 47_040_020)], readable_id: 'gt2' },
    below_threshold: { variants: [], readable_id: '' },
    start: 47_040_020,
    stop: 47_040_020,
    hash: 2,
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

describe('SourcePhasedMethylationComparison', () => {
  test('shows VCF phase blocks and separate source-labelled tracks without aligning them', () => {
    render(
      <SourcePhasedMethylationComparison
        sampleId="HG00097"
        haplotypeGroups={haplotypeGroups}
        records={records}
        orientationStatus="UNCONFIRMED"
      />
    )

    expect(screen.getByRole('region', { name: 'HG00097 source-labelled methylation comparison' })).toBeTruthy()
    expect(screen.getByText('HG00097 VCF GT position 1')).toBeTruthy()
    expect(screen.getByText('phase set phase-a')).toBeTruthy()
    expect(screen.getByText('HG00097 VCF GT position 2')).toBeTruthy()
    expect(screen.getByText('phase set phase-b')).toBeTruthy()
    expect(screen.getByText('vcf-gt1-variant')).toBeTruthy()
    expect(screen.getByText('vcf-gt2-variant')).toBeTruthy()
    expect(screen.getByText(/no visual or data-contract alignment/)).toBeTruthy()

    const hap1 = screen.getByTestId('HG00097-hap1-source-row')
    const hap2 = screen.getByTestId('HG00097-hap2-source-row')
    expect(hap1.getAttribute('data-source-haplotype')).toBe('HAP1')
    expect(hap2.getAttribute('data-source-haplotype')).toBe('HAP2')
    expect(hap1.getAttribute('data-vcf-strand')).toBe('')
    expect(hap2.getAttribute('data-phase-set')).toBe('')
    expect(screen.getByText(/not attached to GT1\/GT2 or to a VCF phase block/)).toBeTruthy()
  })
})
