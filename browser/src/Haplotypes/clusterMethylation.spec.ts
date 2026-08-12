import {
  CLUSTER_METHYLATION_BAND_HEIGHT,
  clusterMethylationBandTop,
  clusterMethylationDisplay,
  clusterMethylationReadiness,
  clusterMethylationRowHeight,
  clusterVariantCenter,
  indexJoinedMethylationByCopy,
  recordsForClusterMembership,
  resolveClusterMethylationMembership,
  scientificClusterForDisplay,
  summarizeClusterMethylation,
} from './clusterMethylation'
import type { HaplotypeCluster, HaplotypeGroup } from './index'
import type { MethylationVisualGroup } from './methylationVisualGroups'
import type {
  JoinedPhasedMethylationRecord,
  PerCopyMethylationSampleState,
} from '../LongReadVariantPage/perCopyMethylation'

const sample = (sampleId: string, vcfStrand: number) => ({
  sample_id: sampleId,
  vcf_strand: vcfStrand,
  phase_set: null,
  variant_sets: [],
})

const group = (hash: number, samples: ReturnType<typeof sample>[]): HaplotypeGroup => ({
  hash,
  samples: samples as HaplotypeGroup['samples'],
  variants: { variants: [], readable_id: '' },
  below_threshold: { variants: [], readable_id: '' },
  start: 100,
  stop: 200,
})

const cluster = (memberGroupHashes: string[], clusterId = 'cluster_0'): HaplotypeCluster => ({
  cluster_id: clusterId,
  member_group_hashes: memberGroupHashes,
  sample_count: memberGroupHashes.length,
  consensus_variants: [],
})

const record = (
  sampleId: string,
  vcfStrand: 1 | 2,
  pos1: number,
  methylation: number,
  coverage: number
): JoinedPhasedMethylationRecord => ({
  source_row_key: `${sampleId}-${vcfStrand}-${pos1}`,
  chr: 'chr22',
  pos1,
  pos2: pos1 + 1,
  sample: sampleId,
  methylation,
  coverage,
  source_haplotype: vcfStrand === 1 ? 'HAP1' : 'HAP2',
  vcf_strand: vcfStrand,
  mapping_scope: 'CHROMOSOME_WIDE',
  phase_set: null,
})

const visualGroup = (positions: number[]): MethylationVisualGroup => ({
  key: `chr22:${positions[0]}-${positions.at(-1)! + 1}:${positions.length}`,
  chrom: 'chr22',
  start: positions[0],
  stop: positions.at(-1)! + 1,
  sites: positions.map((pos1) => ({
    chrom: 'chr22',
    pos1,
    pos2: pos1 + 1,
    mean_methylation: pos1 === 100 ? 40 : 60,
    mean_coverage: 20,
    num_samples: 231,
    std_methylation: 5,
    min_methylation: 0,
    max_methylation: 100,
  })),
  siteCount: positions.length,
  medianPopulationMean: 50,
  minimumSiteMean: 40,
  maximumSiteMean: 60,
  medianSiteSd: 5,
  medianMeanCoverage: 20,
  minimumObservedSamples: 231,
  medianObservedSamples: 231,
  limitedSupportSites: 0,
  boundaryReason: 'display-start',
  configurationVersion: 'test',
  method: 'test',
})

const terminalStates = (...sampleIds: string[]) =>
  new Map<string, PerCopyMethylationSampleState>(
    sampleIds.map((sampleId) => [sampleId, { status: 'complete', recordCount: 1 }])
  )

describe('cluster methylation membership and estimator', () => {
  it('preserves exact copy identities, both homologs, and deduplicated request samples', () => {
    const membership = resolveClusterMethylationMembership(
      cluster(['1', '2', '1']),
      [group(1, [sample('same', 1)]), group(2, [sample('same', 2), sample('other', 1)])],
      ['same', 'other']
    )

    expect(membership.valid).toBe(true)
    expect(membership.allCopies).toEqual([
      { sampleId: 'other', vcfStrand: 1, phaseSet: null },
      { sampleId: 'same', vcfStrand: 1, phaseSet: null },
      { sampleId: 'same', vcfStrand: 2, phaseSet: null },
    ])
    expect(membership.requestSampleIds).toEqual(['other', 'same'])
  })

  it('assigns two homologs of one individual to their exact separate clusters', () => {
    const groups = [group(1, [sample('same', 1)]), group(2, [sample('same', 2)])]
    const states = terminalStates('same')
    const records = [record('same', 1, 100, 10, 8), record('same', 2, 100, 90, 80)]
    const first = summarizeClusterMethylation(
      resolveClusterMethylationMembership(cluster(['1'], 'first'), groups, ['same']),
      records,
      states,
      [visualGroup([100])],
      new Map()
    )
    const second = summarizeClusterMethylation(
      resolveClusterMethylationMembership(cluster(['2'], 'second'), groups, ['same']),
      records,
      states,
      [visualGroup([100])],
      new Map()
    )

    expect(first.sites[0].meanMethylation).toBe(10)
    expect(second.sites[0].meanMethylation).toBe(90)
  })

  it('indexes raw records once and reuses exact-copy records across cluster recuts', () => {
    const groups = [group(1, [sample('a', 1)]), group(2, [sample('b', 2)])]
    const records = [record('a', 1, 100, 10, 8), record('b', 2, 100, 90, 80)]
    const index = indexJoinedMethylationByCopy(records)
    const firstCut = resolveClusterMethylationMembership(cluster(['1']), groups, ['a', 'b'])
    const secondCut = resolveClusterMethylationMembership(cluster(['1', '2']), groups, ['a', 'b'])

    expect(recordsForClusterMembership(firstCut, index)).toEqual([records[0]])
    expect(recordsForClusterMembership(secondCut, index)).toEqual(records)
  })

  it('fails closed on unresolved groups or unsupported strand identity', () => {
    const membership = resolveClusterMethylationMembership(
      cluster(['1', 'missing']),
      [group(1, [sample('bad', 0)])],
      ['bad']
    )
    expect(membership).toMatchObject({
      valid: false,
      invalidIdentityCount: 1,
      unresolvedGroupHashes: ['missing'],
    })
    expect(clusterMethylationReadiness(membership, new Map())).toBe('error')
  })

  it('uses original UPGMA membership when search trims a displayed cluster', () => {
    const original = cluster(['1', '2'])
    const displayed = { ...original, member_group_hashes: ['1'], sample_count: 1 }
    expect(scientificClusterForDisplay(displayed, [original])).toBe(original)
  })

  it('waits atomically for all unique member samples and never paints partial means', () => {
    const membership = resolveClusterMethylationMembership(
      cluster(['1']),
      [group(1, [sample('a', 1), sample('b', 2)])],
      ['a', 'b']
    )
    const partial = new Map<string, PerCopyMethylationSampleState>([
      ['a', { status: 'complete', recordCount: 1 }],
      ['b', { status: 'loading' }],
    ])
    const result = summarizeClusterMethylation(
      membership,
      [record('a', 1, 100, 20, 100)],
      partial,
      [visualGroup([100])],
      new Map([[100, 40]])
    )
    expect(result.readiness).toBe('loading')
    expect(result.sites).toEqual([])
    expect(result.groups).toEqual([])
  })

  it('uses an equal-copy mean rather than weighting by depth and leaves missing copies missing', () => {
    const membership = resolveClusterMethylationMembership(
      cluster(['1']),
      [group(1, [sample('deep', 1), sample('shallow', 2), sample('missing', 1)])],
      ['deep', 'shallow', 'missing']
    )
    const states = terminalStates('deep', 'shallow', 'missing')
    const result = summarizeClusterMethylation(
      membership,
      [record('deep', 1, 100, 100, 1000), record('shallow', 2, 100, 0, 1)],
      states,
      [visualGroup([100])],
      new Map([[100, 40]])
    )

    expect(result.sites[0]).toMatchObject({
      meanMethylation: 50,
      medianDepth: 500.5,
      measuredCopyCount: 2,
      sourceEligibleCopyCount: 3,
      allCopyCount: 3,
      populationMean: 40,
    })
  })

  it('excludes explicit source-unavailable samples from available copies without treating them as zero', () => {
    const membership = resolveClusterMethylationMembership(
      cluster(['1']),
      [group(1, [sample('measured', 1), sample('unavailable', 2), sample('off-source', 1)])],
      ['measured', 'unavailable']
    )
    const states = new Map<string, PerCopyMethylationSampleState>([
      ['measured', { status: 'complete', recordCount: 1 }],
      ['unavailable', { status: 'unavailable', reason: 'No source' }],
    ])
    const result = summarizeClusterMethylation(
      membership,
      [record('measured', 1, 100, 75, 10)],
      states,
      [visualGroup([100])],
      new Map()
    )
    expect(result).toMatchObject({
      readiness: 'ready',
      allCopyCount: 3,
      sourceEligibleCopyCount: 2,
      availableCopyCount: 1,
    })
    expect(result.sites[0]).toMatchObject({ meanMethylation: 75, measuredCopyCount: 1 })
  })

  it('uses shared population boundaries and a median of site-level equal-copy means', () => {
    const membership = resolveClusterMethylationMembership(
      cluster(['1']),
      [group(1, [sample('a', 1), sample('b', 2)])],
      ['a', 'b']
    )
    const boundary = visualGroup([100, 110, 120])
    const result = summarizeClusterMethylation(
      membership,
      [
        record('a', 1, 100, 0, 10),
        record('b', 2, 100, 20, 100),
        record('a', 1, 110, 50, 10),
        record('a', 1, 120, 100, 10),
      ],
      terminalStates('a', 'b'),
      [boundary],
      new Map()
    )
    expect(result.groups[0]).toMatchObject({
      group: boundary,
      medianSiteMean: 50,
      minimumSiteMean: 10,
      maximumSiteMean: 100,
      representedSites: 3,
      minimumMeasuredCopyCount: 1,
      populationMean: 50,
    })
    expect(clusterMethylationDisplay(result, 'sites')).toMatchObject({ groups: [] })
    expect(clusterMethylationDisplay(result, 'groups')).toMatchObject({ sites: [] })
    expect(clusterMethylationDisplay(result, 'both')).toMatchObject({
      sites: result.sites,
      groups: result.groups,
    })
  })

  it('adds one compact band without moving the variant/genealogy center', () => {
    const rowTop = 100
    expect(clusterMethylationRowHeight(false)).toBe(25)
    expect(clusterMethylationRowHeight(true)).toBe(25 + CLUSTER_METHYLATION_BAND_HEIGHT)
    expect(clusterVariantCenter(rowTop)).toBe(112.5)
    expect(clusterMethylationBandTop(rowTop)).toBe(125)
    expect(rowTop + clusterMethylationRowHeight(true)).toBe(153)
  })
})
