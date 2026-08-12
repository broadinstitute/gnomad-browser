import { describe, expect, test } from '@jest/globals'
import { buildMethylationMeanRuns, buildMethylationSdRuns } from './MethylationSummaryTrack'
import type { MethylationSummaryPoint } from './methylationTypes'

const point = (
  pos: number,
  overrides: Partial<MethylationSummaryPoint> = {}
): MethylationSummaryPoint => ({
  chrom: 'chr22',
  pos1: pos,
  pos2: pos + 1,
  mean_methylation: 50,
  mean_coverage: 20,
  num_samples: 100,
  std_methylation: 5,
  ...overrides,
})

describe('population methylation line and ribbon runs', () => {
  test('splits the mean at hard coordinate gaps and missing means', () => {
    const runs = buildMethylationMeanRuns([
      point(1),
      point(2),
      point(1003),
      point(1004, { mean_methylation: Number.NaN }),
      point(1005),
    ])
    expect(runs.map((run) => run.map((site) => site.pos1))).toEqual([[1, 2], [1003], [1005]])
  })

  test('never substitutes zero for missing SD and gaps only the SD ribbon', () => {
    const summary = [
      point(1, { std_methylation: 5 }),
      point(2, { std_methylation: null }),
      point(3, { std_methylation: 7 }),
    ]
    expect(buildMethylationMeanRuns(summary)).toHaveLength(1)
    expect(buildMethylationSdRuns(summary).map((run) => run.map((site) => site.pos1))).toEqual([
      [1],
      [3],
    ])
  })
})
