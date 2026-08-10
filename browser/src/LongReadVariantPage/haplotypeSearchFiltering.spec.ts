import {
  countMatchingHaplotypes,
  filterHaplotypeGroupsToMatches,
} from './haplotypeSearchFiltering'

const variant = (variant_id: string) => ({
  variant_id,
  chrom: '22',
  pos: Number(variant_id.split('-')[1]),
  ref: 'A',
  alt: 'T',
  allele_type: 'snv',
  allele_length: 0,
  freq: { af: 0.1, ac: 1, an: 10 },
  populations: [],
  rsid: '',
})

const set = (...variantIds: string[]) => ({
  variants: variantIds.map(variant),
  readable_id: variantIds.join(';'),
})

const matchesTarget = (candidate: any) => candidate.variant_id === '22-200-A-T'

describe('haplotype search filtering', () => {
  test('filters non-diploid groups using canonical, below-threshold, and sample-specific variants', () => {
    const groups: any[] = [
      {
        hash: 1,
        start: 100,
        stop: 100,
        variants: set('22-100-A-T'),
        below_threshold: set(),
        samples: [{ sample_id: 'S1', vcf_strand: 1, phase_set: null, variant_sets: [set('22-100-A-T')] }],
      },
      {
        hash: 2,
        start: 200,
        stop: 200,
        variants: set('22-150-A-T'),
        below_threshold: set(),
        samples: [{ sample_id: 'S2', vcf_strand: 2, phase_set: null, variant_sets: [set('22-200-A-T')] }],
      },
      {
        hash: 3,
        start: 200,
        stop: 200,
        variants: set(),
        below_threshold: set('22-200-A-T'),
        samples: [{ sample_id: 'S3', vcf_strand: 1, phase_set: null, variant_sets: [] }],
      },
    ]

    expect(filterHaplotypeGroupsToMatches(groups, matchesTarget).map((group: any) => group.hash))
      .toEqual([2, 3])
    expect(countMatchingHaplotypes(groups, matchesTarget)).toEqual({
      matchingGroupRows: 2,
      totalGroupRows: 3,
      matchingSamples: 2,
      totalSamples: 3,
      matchingChromosomeCopies: 2,
      totalChromosomeCopies: 3,
    })
  })

  test('counts matching diplotype samples and chromosome copies without changing denominators', () => {
    const groups: any[] = [
      {
        is_diplotype: true,
        hash: 1,
        start: 100,
        stop: 200,
        haplotypeA: set('22-100-A-T'),
        haplotypeB: set('22-200-A-T'),
        below_thresholdA: set(),
        below_thresholdB: set(),
        samples: [
          {
            sample_id: 'S1',
            strand_mapping: { strandA: 1, strandB: 2 },
            phase_set_mapping: { phaseSetA: null, phaseSetB: null },
          },
          {
            sample_id: 'S2',
            strand_mapping: { strandA: 1, strandB: 2 },
            phase_set_mapping: { phaseSetA: null, phaseSetB: null },
            haplotypeA: set('22-200-A-T'),
            haplotypeB: set('22-200-A-T'),
          },
        ],
      },
      {
        is_diplotype: true,
        hash: 2,
        start: 300,
        stop: 400,
        haplotypeA: set('22-300-A-T'),
        haplotypeB: set('22-400-A-T'),
        below_thresholdA: set(),
        below_thresholdB: set(),
        samples: [
          {
            sample_id: 'S3',
            strand_mapping: { strandA: 1, strandB: 2 },
            phase_set_mapping: { phaseSetA: null, phaseSetB: null },
          },
        ],
      },
    ]

    expect(countMatchingHaplotypes(groups, matchesTarget)).toEqual({
      matchingGroupRows: 1,
      totalGroupRows: 2,
      matchingSamples: 2,
      totalSamples: 3,
      matchingChromosomeCopies: 3,
      totalChromosomeCopies: 6,
    })
  })
})
