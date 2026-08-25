import { describe, expect, test } from '@jest/globals'

import {
  computeHaplotypeView,
  computeSVDistanceMatrix,
  groupCarriersLightweight,
  targetVariantIndicesFor,
  type HaplotypeTargetDescriptor,
} from './haplotypeCompute'
import type { LRVariant } from './index'

const variant = (
  variant_id: string,
  pos: number,
  source_variant_id: string,
  alt_index: number,
  overrides: Partial<LRVariant> = {}
): LRVariant => ({
  variant_id,
  source_variant_id,
  alt_index,
  alt_count: 1,
  chrom: 'chr22',
  pos,
  end: null,
  ref: 'A',
  alt: 'G',
  allele_type: 'snv',
  allele_length: 0,
  freq: { af: 0.5, ac: 1, an: 12 },
  populations: [],
  rsid: '',
  ...overrides,
})

const variants: LRVariant[] = [
  variant('flank-a~1', 60_000, 'flank-a', 1),
  variant('flank-b~1', 140_000, 'flank-b', 1),
  variant('target-a-public~1', 100_000, 'target-a', 1, {
    allele_type: 'trv', ref: 'A', alt: 'AAA', allele_length: 2,
  }),
  // The selected join deliberately cannot succeed through variant_id.
  variant('not-the-selected-id', 100_000, 'target-a', 2, {
    alt_count: 2, allele_type: 'trv', ref: 'A', alt: 'AAAA', allele_length: 3,
    freq: { af: 0.25, ac: 3, an: 12 },
  }),
  variant('target-b-public~1', 100_004, 'target-b', 1, {
    allele_type: 'trv', ref: 'A', alt: 'AAAAA', allele_length: 4,
  }),
  // Same public identity, position, and length as the selected target is not a join.
  variant('target-a~2', 100_000, 'flank-decoy', 2, {
    alt_count: 2, allele_type: 'trv', ref: 'A', alt: 'AAAA', allele_length: 3,
  }),
]

const descriptor: HaplotypeTargetDescriptor = {
  canonical_envelope: { chrom: 'chr22', start: 100_000, stop: 100_010 },
  source_variant_ids: ['target-a', 'target-b'],
  selected_exact_allele_id: 'target-a~2',
  fixed_window: { chrom: 'chr22', start: 50_000, stop: 150_010, flank_size: 50_000 },
}

const baselineCarriers = {
  'copy-1:1': [0, 2, 4],
  'copy-2:1': [0, 3],
  'copy-3:1': [1, 2],
  'copy-4:1': [0, 1, 3],
  'copy-no-flanks:1': [3],
  'copy-sparse-target:1': [5],
}

const permutedTargetCarriers = {
  'copy-1:1': [0, 3],
  'copy-2:1': [0, 2, 4],
  'copy-3:1': [1, 3],
  'copy-4:1': [0, 1, 2],
  'copy-no-flanks:1': [3],
  'copy-sparse-target:1': [5],
}

const compute = (carriers: Record<string, number[]>) => computeHaplotypeView(
  variants,
  carriers,
  0,
  'similarity_score',
  true,
  0.6,
  undefined,
  false,
  'all',
  100_010,
  {},
  descriptor
)

const groupRows = (result: ReturnType<typeof compute>) => result.groups.map((group: any) => ({
  hash: group.hash,
  variants: group.variants.variants.map((entry: LRVariant) => entry.variant_id),
  carriers: group.samples.map((sample: any) => `${sample.sample_id}:${sample.vcf_strand}`),
}))

describe('target-aware haplotype computation', () => {
  test('target assignment permutations leave signatures, Jaccard distance, tree, and row order invariant', () => {
    const excluded = targetVariantIndicesFor(variants, descriptor)
    expect([...excluded]).toEqual([2, 3, 4])

    const baselineGroups = groupCarriersLightweight(variants, baselineCarriers, 0, excluded)
    const permutedGroups = groupCarriersLightweight(
      variants, permutedTargetCarriers, 0, excluded
    )
    expect(permutedGroups).toEqual(baselineGroups)
    expect(computeSVDistanceMatrix(permutedGroups, variants, 'all', 100_010, excluded))
      .toEqual(computeSVDistanceMatrix(baselineGroups, variants, 'all', 100_010, excluded))

    const baseline = compute(baselineCarriers)
    const permuted = compute(permutedTargetCarriers)
    expect(permuted.tree_json).toBe(baseline.tree_json)
    expect(permuted.clusters).toEqual(baseline.clusters)
    expect(groupRows(permuted)).toEqual(groupRows(baseline))
  })

  test('excludes every target source record while retaining exact display assignments', () => {
    const result = compute(baselineCarriers)
    const renderedVariants = result.groups.flatMap((group: any) => [
      ...group.variants.variants,
      ...group.below_threshold.variants,
      ...group.samples.flatMap((sample: any) => sample.variant_sets[0].variants),
    ]) as LRVariant[]
    const clusteredVariants = result.clusters?.flatMap(
      (cluster) => cluster.consensus_variants.map(({ variant: entry }) => entry)
    ) || []

    expect([...renderedVariants, ...clusteredVariants].some(
      (entry) => descriptor.source_variant_ids.includes(entry.source_variant_id || '')
    )).toBe(false)
    expect(renderedVariants.some((entry) => entry.source_variant_id === 'flank-decoy')).toBe(true)

    const sidecar = result.target_display_sidecar!
    expect(sidecar.by_carrier['copy-1:1'].exact_allele_ids).toEqual([
      'target-a~1', 'target-b~1',
    ])
    expect(sidecar.by_carrier['copy-2:1']).toMatchObject({
      exact_allele_ids: ['target-a~2'],
      assignment_status: 'assigned',
      is_selected_exact_allele: true,
    })
    expect(sidecar.counts).toEqual({
      represented_copy_count: 6,
      assigned_target_copy_count: 5,
      unknown_target_copy_count: 1,
      usable_flanking_signature_copy_count: 5,
      no_usable_flanking_signature_copy_count: 1,
      selected_exact_allele_source_ac: 3,
      selected_exact_allele_assigned_copy_count: 3,
      selected_exact_allele_ac_reconciled: true,
      selected_exact_allele_usable_flanking_signature_copy_count: 2,
      selected_exact_allele_no_usable_flanking_signature_copy_count: 1,
    })
  })

  test('joins selected alleles only by source_variant_id~alt_index and never calls sparse absence REF', () => {
    const result = compute(baselineCarriers)
    const sidecar = result.target_display_sidecar!

    expect(sidecar.by_carrier['copy-2:1'].is_selected_exact_allele).toBe(true)
    expect(sidecar.by_carrier['copy-sparse-target:1']).toMatchObject({
      exact_allele_ids: [],
      assignment_status: 'unknown',
      is_selected_exact_allele: false,
      flanking_signature_status: 'usable',
    })
    expect(JSON.stringify(sidecar.by_carrier['copy-sparse-target:1']).toLowerCase())
      .not.toContain('ref')
  })

  test('keeps assigned copies without flanking features out of UPGMA and accounts for them', () => {
    const result = compute(baselineCarriers)
    const representedCarrierIds = new Set(result.groups.flatMap((group: any) =>
      group.samples.map((sample: any) => `${sample.sample_id}:${sample.vcf_strand}`)
    ))

    expect(representedCarrierIds).not.toContain('copy-no-flanks:1')
    expect(result.target_display_sidecar?.by_carrier['copy-no-flanks:1']).toMatchObject({
      exact_allele_ids: ['target-a~2'],
      assignment_status: 'assigned',
      is_selected_exact_allele: true,
      flanking_signature_status: 'no_usable_flanking_signature',
    })
  })

  test('preserves legacy non-target-aware grouping and omits the target sidecar', () => {
    const result = computeHaplotypeView(
      variants, baselineCarriers, 0, 'sample_count', false, 0
    )

    expect(result.target_display_sidecar).toBeUndefined()
    expect(result.groups.some((group: any) =>
      group.samples.some((sample: any) => sample.sample_id === 'copy-no-flanks')
    )).toBe(true)
  })
})
