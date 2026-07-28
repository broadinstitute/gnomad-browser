import { describe, expect, test } from '@jest/globals'

import {
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
