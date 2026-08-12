import { describe, expect, test } from '@jest/globals'
import { buildMethylationVisualGroups } from './methylationVisualGroups'
import type { MethylationSummaryPoint } from './methylationTypes'

const point = (
  pos: number,
  mean = 50,
  overrides: Partial<MethylationSummaryPoint> = {}
): MethylationSummaryPoint => ({
  chrom: 'chr22',
  pos1: pos,
  pos2: pos + 1,
  mean_methylation: mean,
  mean_coverage: 20,
  num_samples: 100,
  std_methylation: 5,
  min_methylation: mean - 5,
  max_methylation: mean + 5,
  ...overrides,
})

describe('buildMethylationVisualGroups', () => {
  test('is deterministic and sorts input without mutating it', () => {
    const input = [point(300), point(100), point(200)]
    const before = [...input]
    expect(buildMethylationVisualGroups(input)).toEqual(buildMethylationVisualGroups(input))
    expect(input).toEqual(before)
    expect(buildMethylationVisualGroups(input)[0].sites.map((site) => site.pos1)).toEqual([
      100, 200, 300,
    ])
  })

  test('breaks on chromosome changes and gaps over, but not exactly, 1 kb', () => {
    const groups = buildMethylationVisualGroups([
      point(100),
      point(1100),
      point(2101),
      point(2200, 50, { chrom: 'chrX' }),
    ])
    expect(groups.map((group) => group.siteCount)).toEqual([2, 1, 1])
    expect(groups.map((group) => group.boundaryReason)).toEqual([
      'display-start',
      'gap-over-1kb',
      'chromosome-change',
    ])
  })

  test('caps groups at 200 CpGs and preserves an isolated site', () => {
    const groups = buildMethylationVisualGroups(
      Array.from({ length: 201 }, (_, index) => point(index * 2))
    )
    expect(groups.map((group) => group.siteCount)).toEqual([200, 1])
    expect(groups[1].boundaryReason).toBe('200-site-cap')
  })

  test('finds deterministic synthetic step changes but leaves a flat run together', () => {
    const flat = buildMethylationVisualGroups([point(1, 30), point(2, 30), point(3, 30)])
    const stepped = buildMethylationVisualGroups([
      point(1, 20),
      point(2, 21),
      point(3, 70),
      point(4, 71),
      point(5, 25),
      point(6, 24),
    ])
    expect(flat).toHaveLength(1)
    expect(stepped.map((group) => group.siteCount)).toEqual([2, 2, 2])
    expect(stepped.slice(1).every((group) => group.boundaryReason === 'penalized-change')).toBe(
      true
    )
    expect(stepped.every((group) => group.method === 'penalized-piecewise-constant')).toBe(true)
  })

  test('summarizes descriptive evidence without treating missing optional fields as zero', () => {
    const [group] = buildMethylationVisualGroups([
      point(1, 20, { mean_coverage: 4, num_samples: 10, std_methylation: null }),
      point(2, 40, { mean_coverage: 20, num_samples: 100, std_methylation: 8 }),
    ])
    expect(group.medianPopulationMean).toBe(30)
    expect(group.minimumSiteMean).toBe(20)
    expect(group.maximumSiteMean).toBe(40)
    expect(group.medianSiteSd).toBe(8)
    expect(group.medianMeanCoverage).toBe(12)
    expect(group.minimumObservedSamples).toBe(10)
    expect(group.limitedSupportSites).toBe(1)
  })

  test('does not bridge missing values and rejects malformed coordinates', () => {
    const groups = buildMethylationVisualGroups([
      point(1),
      point(2, Number.NaN),
      point(3),
      point(4, 50, { pos2: 2 }),
      point(5),
    ])
    expect(groups.map((group) => group.siteCount)).toEqual([1, 1, 1])
    expect(
      groups.slice(1).every((group) => group.boundaryReason === 'invalid-or-missing-value')
    ).toBe(true)
  })

  test('keeps 10,000 flat points bounded by the configured site cap', () => {
    const input = Array.from({ length: 10_000 }, (_, index) => point(index * 2))
    const started = performance.now()
    const groups = buildMethylationVisualGroups(input)
    const elapsed = performance.now() - started
    expect(groups).toHaveLength(50)
    expect(groups.every((group) => group.siteCount <= 200)).toBe(true)
    expect(elapsed).toBeLessThan(100)
  })

  test('uses the bounded fixed-bin fallback for 10,000 alternating noisy points', () => {
    const input = Array.from({ length: 10_000 }, (_, index) =>
      point(index * 2, index % 2 === 0 ? 0 : 100)
    )
    const groups = buildMethylationVisualGroups(input)
    expect(groups).toHaveLength(50)
    expect(groups.every((group) => group.siteCount === 200)).toBe(true)
    expect(groups.every((group) => group.method === 'bounded-fixed-bin-fallback')).toBe(true)
  })
})
