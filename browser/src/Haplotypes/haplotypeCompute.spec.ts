import { describe, expect, test } from '@jest/globals'

import {
  carrierMetadataFromPayload,
  computeHaplotypeView,
  filterDisplayVariants,
  groupCarriers,
  groupDiplotypes,
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
    strand_mapping: { strandA: 1, strandB: 2 },
    phase_set_mapping: { phaseSetA: null, phaseSetB: null },
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
      short_read_match_id: ['22-100-A-G', null, null],
      populations: [[], [], []],
    }

    const variants = rehydrateVariants(payload)
    const all = filtersForLongReadVariantType('all')
    const snv = filtersForLongReadVariantType('snv')

    expect(variants.map((variant) => variant.allele_type)).toEqual(['SNP', 'snv', 'DEL'])
    expect(variants.map((variant) => variant.short_read_match_id)).toEqual([
      '22-100-A-G', null, null,
    ])
    expect(variants.filter((variant) => passesLongReadVariantTypeFilters(variant.allele_type, all)))
      .toHaveLength(3)
    expect(variants.filter((variant) => passesLongReadVariantTypeFilters(variant.allele_type, snv))
      .map((variant) => variant.variant_id)).toEqual(['snp', 'snv'])

    const legacyPayload = { ...payload }
    delete legacyPayload.short_read_match_id
    expect(rehydrateVariants(legacyPayload).map((variant) => variant.short_read_match_id)).toEqual([
      null, null, null,
    ])
  })
})

const haplotypeVariant = (id: string, pos: number, af: number) => ({
  variant_id: id,
  chrom: 'chr22',
  pos,
  end: null,
  ref: 'A',
  alt: 'G',
  allele_type: 'snv',
  allele_length: 0,
  freq: { af, ac: 1, an: 4 },
  populations: [],
  rsid: '',
})

describe('VCF carrier identity', () => {
  const variants = [
    haplotypeVariant('above', 100, 0.5),
    haplotypeVariant('below', 200, 0.01),
  ]
  const carrierIndices = {
    'sample:with-colon:1': [0, 1],
    'sample:with-colon:2': [0, 1],
  }
  const carrierMetadata = carrierMetadataFromPayload([
    {
      sample_id: 'sample:with-colon', vcf_strand: 1, phase_set: 'ps-1',
      phase_sets: ['ps-1'], variant_indices: [0, 1],
    },
    {
      sample_id: 'sample:with-colon', vcf_strand: 2, phase_set: 'ps-2',
      phase_sets: ['ps-2'], variant_indices: [0, 1],
    },
  ])

  test('preserves structured identity through the active computation path', () => {
    const result = computeHaplotypeView(
      variants as any, carrierIndices, 0.1, 'sample_count', false, 0,
      undefined, false, 'auto', 1_000, carrierMetadata
    )
    const group = result.groups[0] as any

    expect(group.samples.map(({ sample_id, vcf_strand, phase_set }: any) => ({
      sample_id, vcf_strand, phase_set,
    }))).toEqual([
      { sample_id: 'sample:with-colon', vcf_strand: 1, phase_set: 'ps-1' },
      { sample_id: 'sample:with-colon', vcf_strand: 2, phase_set: 'ps-2' },
    ])
    expect(group.below_threshold.variants[0].in_haplotypes).toEqual([
      { sample_id: 'sample:with-colon', vcf_strand: 1, phase_set: 'ps-1' },
      { sample_id: 'sample:with-colon', vcf_strand: 2, phase_set: 'ps-2' },
    ])
  })

  test('retains actual VCF values in the compatibility grouping path', () => {
    const groups = groupCarriers(variants as any, carrierIndices, 0.1)
    expect(groups[0].samples.map(({ sample_id, vcf_strand, phase_set }) => ({
      sample_id, vcf_strand, phase_set,
    }))).toEqual([
      { sample_id: 'sample:with-colon', vcf_strand: 1, phase_set: null },
      { sample_id: 'sample:with-colon', vcf_strand: 2, phase_set: null },
    ])

    const zeroBasedLegacy = groupCarriers(
      [haplotypeVariant('legacy', 100, 0.5)] as any,
      { 'legacy-sample:0': [0] },
      0
    )
    expect(zeroBasedLegacy[0].samples[0].vcf_strand).toBe(0)
  })

  test('maps canonical diplotype sides to actual VCF strands and phase sets', () => {
    const distinctVariants = [
      haplotypeVariant('strand-1', 100, 0.5),
      haplotypeVariant('strand-2', 200, 0.5),
    ]
    // Reverse insertion order to prove A/B mapping does not synthesize slots
    // from object order.
    const diplotypes = groupDiplotypes(
      distinctVariants as any,
      { 'sample:with-colon:2': [1], 'sample:with-colon:1': [0] },
      0,
      carrierMetadata
    )

    expect(diplotypes[0].samples[0]).toEqual({
      sample_id: 'sample:with-colon',
      strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: 'ps-1', phaseSetB: 'ps-2' },
    })
  })

  test('keeps carrier-resolved exact TR ALTs in default diploid mode with phase metadata', () => {
    const trVariant = {
      ...haplotypeVariant('chr22-100-TRV-1~1', 100, 0.5),
      ref: 'AAAA',
      alt: 'AAAA',
      allele_type: 'trv',
      tr_motifs: 'A',
    }
    const result = computeHaplotypeView(
      [trVariant] as any,
      { 'sample:with-colon:1': [0], 'sample:with-colon:2': [0] },
      0,
      'diplotype_frequency',
      false,
      0,
      {
        'sample:with-colon:1': { 100: 'AAAAAA' },
        'sample:with-colon:2': { 100: 'AA' },
      },
      true,
      'auto',
      1_000,
      carrierMetadata
    )
    const sample = (result.groups[0] as DiplotypeGroup).samples[0]

    expect(sample.haplotypeA?.variants[0].alt).toBe('AAAAAA')
    expect(sample.haplotypeB?.variants[0].alt).toBe('AA')
    expect(sample.phase_set_mapping).toEqual({ phaseSetA: 'ps-1', phaseSetB: 'ps-2' })
    expect(result.phase_set_sidecar.by_carrier['sample:with-colon:1'].phase_set).toBe('ps-1')
    expect(result.phase_set_sidecar.by_carrier['sample:with-colon:2'].phase_set).toBe('ps-2')
  })

  test('keeps known VCF strands when every variant is below the AF threshold', () => {
    const diplotypes = groupDiplotypes(
      variants as any, carrierIndices, 1, carrierMetadata
    )
    expect(diplotypes[0].samples[0].strand_mapping).toEqual({ strandA: 1, strandB: 2 })
  })

  test('preserves two phase sets on one strand through fallback and native below-threshold output', () => {
    const multiPhaseMetadata = carrierMetadataFromPayload([{
      sample_id: 'multi-phase-sample',
      vcf_strand: 1,
      phase_set: null,
      phase_sets: ['PS-A', 'PS-B'],
      variant_indices: [0, 1],
      phase_set_by_variant: [
        { variant_index: 0, phase_set: 'PS-A' },
        { variant_index: 1, phase_set: 'PS-B' },
      ],
    }])
    const result = computeHaplotypeView(
      variants as any,
      { 'multi-phase-sample:1': [0, 1] },
      0.1,
      'sample_count',
      false,
      0,
      undefined,
      false,
      'auto',
      1_000,
      multiPhaseMetadata
    )
    const group = result.groups[0] as any

    expect(group.samples[0].phase_set).toBeNull()
    expect(group.below_threshold.variants[0].in_haplotypes[0].phase_set).toBeNull()
    expect(result.phase_set_sidecar).toEqual({
      by_carrier: {
        'multi-phase-sample:1': {
          sample_id: 'multi-phase-sample',
          vcf_strand: 1,
          phase_set: null,
          phase_sets: ['PS-A', 'PS-B'],
          variant_indices: [0, 1],
          phase_set_by_variant: [
            { variant_index: 0, phase_set: 'PS-A' },
            { variant_index: 1, phase_set: 'PS-B' },
          ],
        },
      },
      variant_ids_by_index: ['above', 'below'],
    })
    expect(Object.isFrozen(result.phase_set_sidecar)).toBe(true)
    expect(Object.isFrozen(result.phase_set_sidecar.by_carrier['multi-phase-sample:1'])).toBe(true)
  })

  test('retains the exact phase-set sidecar when display filtering moves a variant below threshold', () => {
    const multiPhaseMetadata = carrierMetadataFromPayload([{
      sample_id: 'multi-phase-sample',
      vcf_strand: 1,
      phase_set: null,
      phase_sets: ['PS-A', 'PS-B'],
      variant_indices: [0, 1],
      phase_set_by_variant: [
        { variant_index: 0, phase_set: 'PS-A' },
        { variant_index: 1, phase_set: 'PS-B' },
      ],
    }])
    const result = computeHaplotypeView(
      variants as any,
      { 'multi-phase-sample:1': [0, 1] },
      0,
      'sample_count',
      false,
      0,
      undefined,
      false,
      'auto',
      1_000,
      multiPhaseMetadata
    )
    const filtered = filterDisplayVariants(result, 0.1)

    expect((filtered.groups[0] as any).below_threshold.variants.map((variant: any) => variant.variant_id))
      .toContain('below')
    expect(filtered.phase_set_sidecar).toBe(result.phase_set_sidecar)
    expect(filtered.phase_set_sidecar.by_carrier['multi-phase-sample:1'].phase_set_by_variant)
      .toEqual([
        { variant_index: 0, phase_set: 'PS-A' },
        { variant_index: 1, phase_set: 'PS-B' },
      ])
  })

  test('retains exact multi-block metadata in diplotype output when every variant is below threshold', () => {
    const multiPhaseMetadata = carrierMetadataFromPayload([{
      sample_id: 'multi-phase-sample',
      vcf_strand: 2,
      phase_set: null,
      phase_sets: ['PS-A', 'PS-B'],
      variant_indices: [0, 1],
      phase_set_by_variant: [
        { variant_index: 0, phase_set: 'PS-A' },
        { variant_index: 1, phase_set: 'PS-B' },
      ],
    }])
    const result = computeHaplotypeView(
      variants as any,
      { 'multi-phase-sample:2': [0, 1] },
      1,
      'sample_id',
      false,
      0,
      undefined,
      true,
      'auto',
      1_000,
      multiPhaseMetadata
    )
    const diplotype = result.groups[0] as DiplotypeGroup
    const strand = diplotype.samples[0].strand_mapping.strandA
    const carrierKey = `${diplotype.samples[0].sample_id}:${strand}`

    expect(diplotype.samples[0].phase_set_mapping.phaseSetA).toBeNull()
    expect(result.phase_set_sidecar.by_carrier[carrierKey]).toMatchObject({
      phase_set: null,
      phase_sets: ['PS-A', 'PS-B'],
      phase_set_by_variant: [
        { variant_index: 0, phase_set: 'PS-A' },
        { variant_index: 1, phase_set: 'PS-B' },
      ],
    })
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
