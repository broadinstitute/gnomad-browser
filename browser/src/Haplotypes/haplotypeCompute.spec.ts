import { describe, expect, test } from '@jest/globals'

import { type DiplotypeGroup, sortDiplotypes } from './haplotypeCompute'

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
