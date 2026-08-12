import { describe, expect, test } from '@jest/globals'
import {
  aggregateMethylationByVisualGroups,
  buildMethylationLayerDisplay,
  observationsByCanonicalCopy,
  type MethylationLayerObservation,
} from './methylationGroupAggregation'
import { buildMethylationVisualGroups } from './methylationVisualGroups'
import type { MethylationSummaryPoint } from './methylationTypes'

const populationSites: MethylationSummaryPoint[] = [
  {
    chrom: 'chr22',
    pos1: 100,
    pos2: 101,
    mean_methylation: 30,
    mean_coverage: 20,
    num_samples: 100,
  },
  {
    chrom: 'chr22',
    pos1: 200,
    pos2: 201,
    mean_methylation: 35,
    mean_coverage: 20,
    num_samples: 100,
  },
  {
    chrom: 'chr22',
    pos1: 300,
    pos2: 301,
    mean_methylation: 40,
    mean_coverage: 20,
    num_samples: 100,
  },
]

const observations: MethylationLayerObservation[] = [
  { pos1: 100, pos2: 101, methylation: 100, coverage: 30, sample: 'S1' },
  { pos1: 200, pos2: 201, methylation: 0, coverage: 10, sample: 'S1' },
]

const visualGroups = buildMethylationVisualGroups(populationSites)

describe('cross-layer methylation visual groups', () => {
  test('maps admitted source rows to canonical copies before weighting uneven sample support', () => {
    const mapped = observationsByCanonicalCopy(
      [
        {
          pos1: 100,
          pos2: 101,
          methylation: 100,
          coverage: 1,
          sample: 'S1',
          source_haplotype: 'HAP1',
          vcf_strand: 1,
          mapping_scope: 'CHROMOSOME_WIDE',
          phase_set: null,
        },
        {
          pos1: 100,
          pos2: 101,
          methylation: 0,
          coverage: 99,
          sample: 'S2',
          source_haplotype: 'HAP2',
          vcf_strand: 2,
          mapping_scope: 'CHROMOSOME_WIDE',
          phase_set: null,
        },
      ],
      [
        { sample_id: 'S1', strand_mapping: { strandA: 1, strandB: 2 } },
        { sample_id: 'S2', strand_mapping: { strandA: 2, strandB: 1 } },
      ]
    )
    const [summary] = aggregateMethylationByVisualGroups(mapped.A, visualGroups, 'copy')
    expect(summary.weightedMeanMethylation).toBe(1)
    expect(summary.contributingSampleCount).toBe(2)
  })

  test('uses population boundaries and coverage-weighted methylation with median CpG depth', () => {
    const [summary] = aggregateMethylationByVisualGroups(observations, visualGroups)
    expect(summary.weightedMeanMethylation).toBe(75)
    expect(summary.medianPerCpgCoverage).toBe(20)
    expect(summary.representedSites).toBe(2)
    expect(summary.missingSites).toBe(1)
    expect(summary.contributingSampleCount).toBe(1)
    expect(summary.support.state).toBe('adequate')
  })

  test('keeps missing copy CpGs missing rather than adding zero-valued observations', () => {
    const [summary] = aggregateMethylationByVisualGroups(
      [{ pos1: 100, pos2: 101, methylation: 80, coverage: 20, sampleCount: 3 }],
      visualGroups,
      'copy'
    )
    expect(summary.weightedMeanMethylation).toBe(80)
    expect(summary.representedSites).toBe(1)
    expect(summary.missingSites).toBe(2)
    expect(summary.support.state).toBe('limited-sites')
  })

  test('groups mode hides lower-layer raw sites and Both returns groups plus sites', () => {
    const sites = buildMethylationLayerDisplay(observations, visualGroups, 'sites')
    const groups = buildMethylationLayerDisplay(observations, visualGroups, 'groups')
    const both = buildMethylationLayerDisplay(observations, visualGroups, 'both')

    expect(sites.sites).toHaveLength(2)
    expect(sites.groups).toHaveLength(0)
    expect(groups.sites).toHaveLength(0)
    expect(groups.groups).toHaveLength(1)
    expect(both.sites).toHaveLength(2)
    expect(both.groups).toHaveLength(1)
  })

  test('classifies uneven represented support independently on each copy', () => {
    const copyA = aggregateMethylationByVisualGroups(observations, visualGroups, 'copy')[0]
    const copyB = aggregateMethylationByVisualGroups(
      [{ pos1: 100, pos2: 101, methylation: 10, coverage: 1, sampleCount: 1 }],
      visualGroups,
      'copy'
    )[0]
    expect(copyA.support.state).toBe('adequate')
    expect(copyB.support.state).toBe('limited-sites')
    expect(copyB.medianPerCpgCoverage).toBe(1)
  })
})
