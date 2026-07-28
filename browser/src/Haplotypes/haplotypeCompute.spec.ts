import { describe, expect, test } from '@jest/globals'

import {
  computeHaplotypeView,
  rehydrateVariants,
  type DiplotypeGroup,
  type SoAVariants,
  sortDiplotypes,
} from './haplotypeCompute'
import {
  filtersForLongReadVariantType,
  passesLongReadVariantTypeFilters,
} from '../LongReadVariantPage/longReadVariantTypes'

const diplotypeGroup = (hash: number, sampleIds: string[]): DiplotypeGroup => ({
  is_diplotype: true,
  samples: sampleIds.map((sample_id) => ({
    sample_id,
    strand_mapping: { strandA: 0, strandB: 1 },
  })),
  haplotypeA: { variants: [], readable_id: '' },
  haplotypeB: { variants: [], readable_id: '' },
  below_thresholdA: { variants: [], readable_id: '' },
  below_thresholdB: { variants: [], readable_id: '' },
  start: 0,
  stop: 0,
  hash,
  roh_fraction: 0,
  is_roh: false,
  compound_het_pairs: [],
  is_compound_het: false,
})

describe('rehydrateVariants', () => {
  test('preserves realistic REST allele_type values for shared display normalization', () => {
    const payload: SoAVariants = {
      variant_id: ['snp', 'snv', 'del'],
      chrom: ['22', '22', '22'],
      pos: [100, 101, 102],
      end: [null, null, 152],
      ref: ['A', 'C', 'AT'],
      alt: ['G', 'T', 'A'],
      allele_type: ['SNP', 'snv', 'DEL'],
      allele_length: [0, 0, -50],
      freq_af: [0.1, 0.2, 0.3],
      freq_ac: [1, 2, 3],
      freq_an: [10, 10, 10],
      rsid: ['rs1', 'rs2', ''],
      cadd_phred: [null, null, null],
      phylop: [null, null, null],
      sv_consequences: [null, null, null],
      dbsnp_id: ['rs1', 'rs2', null],
      tr_id: [null, null, null],
      tr_motifs: [null, null, null],
      gnomad_str: [null, null, null],
      allele_methylation: [null, null, null],
      motif_counts: [null, null, null],
      allele_purity: [null, null, null],
      populations: [[], [], []],
    }

    const variants = rehydrateVariants(payload)
    const all = filtersForLongReadVariantType('all')
    const snv = filtersForLongReadVariantType('snv')

    expect(variants.map((variant) => variant.allele_type)).toEqual(['SNP', 'snv', 'DEL'])
    expect(variants.filter((variant) => passesLongReadVariantTypeFilters(variant.allele_type, all)))
      .toHaveLength(3)
    expect(variants.filter((variant) => passesLongReadVariantTypeFilters(variant.allele_type, snv))
      .map((variant) => variant.variant_id)).toEqual(['snp', 'snv'])
  })
})

describe('carrier-specific TR alleles', () => {
  const trVariant = {
    variant_id: 'chr22-100-TRV-1~1', chrom: 'chr22', pos: 100, end: 104,
    ref: 'AAAA', alt: 'AAAA', allele_type: 'trv', allele_length: 0,
    freq: { af: 0.25, ac: 2, an: 8 }, populations: [], rsid: '',
    tr_motifs: 'A',
  } as any
  const carrierIndices = {
    'sample-1:1': [0], 'sample-1:2': [0], 'sample-2:1': [0], 'sample-2:2': [0],
  }
  const trvAlts = {
    'sample-1:1': { 100: 'AAAAAA' }, 'sample-1:2': { 100: 'AAAAA' },
    'sample-2:1': { 100: 'AA' }, 'sample-2:2': { 100: 'A' },
  }

  test('propagates carrier ALT substitutions through default Diploid grouping', () => {
    const result = computeHaplotypeView(
      [trVariant], carrierIndices, 0, 'diplotype_frequency', false, 0.5,
      trvAlts, true
    )
    const samples = (result.groups[0] as DiplotypeGroup).samples

    expect(samples.flatMap((sample) => [
      sample.haplotypeA!.variants[0].alt,
      sample.haplotypeB!.variants[0].alt,
    ]).sort()).toEqual(['A', 'AA', 'AAAAA', 'AAAAAA'])
  })

  test.each([
    ['Exact', false],
    ['Similarity', true],
  ])('keeps the same carrier substitutions in %s grouping', (_label, clustered) => {
    const result = computeHaplotypeView(
      [trVariant], carrierIndices, 0, 'sample_count', clustered, 0.5,
      trvAlts, false
    )
    const alts = (result.groups[0] as any).samples
      .map((sample: any) => sample.variant_sets[0].variants[0].alt)
      .sort()

    expect(alts).toEqual(['A', 'AA', 'AAAAA', 'AAAAAA'])
  })
})

describe('sortDiplotypes', () => {
  test('sorts diplotype groups and their members deterministically by sample ID', () => {
    const groups = [
      diplotypeGroup(1, ['sample-20', 'sample-03']),
      diplotypeGroup(2, ['sample-11']),
      diplotypeGroup(3, ['sample-02']),
    ]

    const sorted = sortDiplotypes(groups, 'sample_id')

    expect(sorted.map((group) => group.samples.map((sample) => sample.sample_id))).toEqual([
      ['sample-02'],
      ['sample-03', 'sample-20'],
      ['sample-11'],
    ])
    expect(groups[0].samples.map((sample) => sample.sample_id)).toEqual(['sample-20', 'sample-03'])
  })
})
