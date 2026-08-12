import type { HaplotypeCluster, HaplotypeGroup } from './index'
import type { MethylationViewMode } from './methylationTypes'
import type { MethylationVisualGroup } from './methylationVisualGroups'
import type {
  JoinedPhasedMethylationRecord,
  PerCopyMethylationSampleState,
} from '../LongReadVariantPage/perCopyMethylation'

export const CLUSTER_METHYLATION_BAND_HEIGHT = 28
export const CLUSTER_VARIANT_ROW_HEIGHT = 25

export const clusterMethylationRowHeight = (enabled: boolean) =>
  CLUSTER_VARIANT_ROW_HEIGHT + (enabled ? CLUSTER_METHYLATION_BAND_HEIGHT : 0)

export const clusterMethylationBandTop = (rowTop: number) => rowTop + CLUSTER_VARIANT_ROW_HEIGHT

export const clusterVariantCenter = (rowTop: number) => rowTop + CLUSTER_VARIANT_ROW_HEIGHT / 2

export type ClusterHaplotypeCopy = {
  sampleId: string
  vcfStrand: 1 | 2
  phaseSet: string | null
}

export type ClusterMethylationMembership = {
  valid: boolean
  allCopies: ClusterHaplotypeCopy[]
  sourceEligibleCopies: ClusterHaplotypeCopy[]
  requestSampleIds: string[]
  unresolvedGroupHashes: string[]
  invalidIdentityCount: number
}

const copyKey = (copy: Pick<ClusterHaplotypeCopy, 'sampleId' | 'vcfStrand'>) =>
  `${copy.sampleId}\u0000${copy.vcfStrand}`

export const scientificClusterForDisplay = (
  displayedCluster: HaplotypeCluster,
  originalClusters: readonly HaplotypeCluster[]
) =>
  originalClusters.find((cluster) => cluster.cluster_id === displayedCluster.cluster_id) ??
  displayedCluster

/** Resolve the original UPGMA membership. Search/highlight display cuts are never denominators. */
export const resolveClusterMethylationMembership = (
  cluster: HaplotypeCluster,
  groups: readonly HaplotypeGroup[],
  sourceSampleIds: readonly string[]
): ClusterMethylationMembership => {
  const groupsByHash = new Map(groups.map((group) => [String(group.hash), group]))
  const sourceSamples = new Set(sourceSampleIds)
  const copiesByIdentity = new Map<string, ClusterHaplotypeCopy>()
  const unresolvedGroupHashes: string[] = []
  let invalidIdentityCount = 0

  Array.from(new Set(cluster.member_group_hashes.map(String))).forEach((hash) => {
    const group = groupsByHash.get(hash)
    if (!group) {
      unresolvedGroupHashes.push(hash)
      return
    }
    group.samples.forEach((sample) => {
      if (
        typeof sample.sample_id !== 'string' ||
        sample.sample_id.length === 0 ||
        (sample.vcf_strand !== 1 && sample.vcf_strand !== 2)
      ) {
        invalidIdentityCount += 1
        return
      }
      const copy: ClusterHaplotypeCopy = {
        sampleId: sample.sample_id,
        vcfStrand: sample.vcf_strand,
        phaseSet: sample.phase_set,
      }
      copiesByIdentity.set(copyKey(copy), copy)
    })
  })

  const allCopies = [...copiesByIdentity.values()].sort(
    (left, right) => left.sampleId.localeCompare(right.sampleId) || left.vcfStrand - right.vcfStrand
  )
  const sourceEligibleCopies = allCopies.filter((copy) => sourceSamples.has(copy.sampleId))
  const requestSampleIds = Array.from(
    new Set(sourceEligibleCopies.map((copy) => copy.sampleId))
  ).sort((left, right) => left.localeCompare(right))

  return {
    valid: unresolvedGroupHashes.length === 0 && invalidIdentityCount === 0,
    allCopies,
    sourceEligibleCopies,
    requestSampleIds,
    unresolvedGroupHashes: unresolvedGroupHashes.sort(),
    invalidIdentityCount,
  }
}

export type ClusterMethylationReadiness = 'loading' | 'error' | 'ready'

export const clusterMethylationReadiness = (
  membership: ClusterMethylationMembership,
  sampleStates: ReadonlyMap<string, PerCopyMethylationSampleState>
): ClusterMethylationReadiness => {
  if (!membership.valid) return 'error'
  if (membership.requestSampleIds.length === 0) return 'ready'
  const states = membership.requestSampleIds.map((sampleId) => sampleStates.get(sampleId))
  if (states.some((state) => state?.status === 'error')) return 'error'
  if (states.some((state) => state === undefined || state.status === 'loading')) return 'loading'
  return 'ready'
}

export type ClusterMethylationSiteSummary = {
  pos1: number
  pos2: number
  meanMethylation: number
  minimumMethylation: number
  maximumMethylation: number
  medianDepth: number
  measuredCopyCount: number
  availableCopyCount: number
  sourceEligibleCopyCount: number
  allCopyCount: number
  measuredIndividualCount: number
  populationMean: number | null
}

export type ClusterMethylationGroupSummary = {
  group: MethylationVisualGroup
  medianSiteMean: number
  minimumSiteMean: number
  maximumSiteMean: number
  medianDepth: number
  representedSites: number
  minimumMeasuredCopyCount: number
  availableCopyCount: number
  sourceEligibleCopyCount: number
  allCopyCount: number
  measuredIndividualCount: number
  populationMean: number
}

export type ClusterMethylationSummary = {
  readiness: ClusterMethylationReadiness
  sites: ClusterMethylationSiteSummary[]
  groups: ClusterMethylationGroupSummary[]
  allCopyCount: number
  sourceEligibleCopyCount: number
  availableCopyCount: number
  uniqueIndividualCount: number
}

const median = (values: readonly number[]) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const admittedJoinedRecord = (record: JoinedPhasedMethylationRecord) =>
  record.mapping_scope === 'CHROMOSOME_WIDE' &&
  record.phase_set === null &&
  (record.vcf_strand === 1 || record.vcf_strand === 2) &&
  (record.source_haplotype === 'HAP1' || record.source_haplotype === 'HAP2') &&
  (record.source_haplotype === 'HAP1' ? record.vcf_strand === 1 : record.vcf_strand === 2) &&
  Number.isFinite(record.methylation) &&
  record.methylation >= 0 &&
  record.methylation <= 100 &&
  Number.isFinite(record.coverage) &&
  record.coverage >= 0

export type ClusterMethylationRecordIndex = ReadonlyMap<
  string,
  readonly JoinedPhasedMethylationRecord[]
>

export const indexJoinedMethylationByCopy = (
  records: readonly JoinedPhasedMethylationRecord[]
): ClusterMethylationRecordIndex => {
  const index = new Map<string, JoinedPhasedMethylationRecord[]>()
  records.forEach((record) => {
    if (!admittedJoinedRecord(record)) return
    const identity = copyKey({ sampleId: record.sample, vcfStrand: record.vcf_strand })
    const copyRecords = index.get(identity) ?? []
    copyRecords.push(record)
    index.set(identity, copyRecords)
  })
  return index
}

export const recordsForClusterMembership = (
  membership: ClusterMethylationMembership,
  index: ClusterMethylationRecordIndex
) => membership.sourceEligibleCopies.flatMap((copy) => index.get(copyKey(copy)) ?? [])

export const summarizeClusterMethylation = (
  membership: ClusterMethylationMembership,
  records: readonly JoinedPhasedMethylationRecord[],
  sampleStates: ReadonlyMap<string, PerCopyMethylationSampleState>,
  visualGroups: readonly MethylationVisualGroup[],
  populationMeanByPos: ReadonlyMap<number, number>
): ClusterMethylationSummary => {
  const readiness = clusterMethylationReadiness(membership, sampleStates)
  const availableCopies = membership.sourceEligibleCopies.filter(
    (copy) => sampleStates.get(copy.sampleId)?.status === 'complete'
  )
  const base = {
    readiness,
    allCopyCount: membership.allCopies.length,
    sourceEligibleCopyCount: membership.sourceEligibleCopies.length,
    availableCopyCount: availableCopies.length,
    uniqueIndividualCount: new Set(membership.allCopies.map((copy) => copy.sampleId)).size,
  }
  if (readiness !== 'ready') return { ...base, sites: [], groups: [] }

  const eligibleKeys = new Set(availableCopies.map(copyKey))
  const observationsBySite = new Map<
    string,
    Map<string, { sampleId: string; methylation: number; depth: number }>
  >()
  records.forEach((record) => {
    if (!admittedJoinedRecord(record)) return
    const identity = copyKey({ sampleId: record.sample, vcfStrand: record.vcf_strand })
    if (!eligibleKeys.has(identity)) return
    const siteKey = `${record.pos1}:${record.pos2}`
    const copies = observationsBySite.get(siteKey) ?? new Map()
    // The endpoint admits one biological observation per copy/CpG. Fail closed on a
    // duplicate instead of allowing request concatenation to weight a copy twice.
    if (!copies.has(identity)) {
      copies.set(identity, {
        sampleId: record.sample,
        methylation: record.methylation,
        depth: record.coverage,
      })
    }
    observationsBySite.set(siteKey, copies)
  })

  const sites = [...observationsBySite.entries()]
    .flatMap(([coordinate, copies]) => {
      const [pos1, pos2] = coordinate.split(':').map(Number)
      const observations = [...copies.values()]
      if (observations.length === 0) return []
      const methylation = observations.map((observation) => observation.methylation)
      return [
        {
          pos1,
          pos2,
          meanMethylation: methylation.reduce((sum, value) => sum + value, 0) / methylation.length,
          minimumMethylation: Math.min(...methylation),
          maximumMethylation: Math.max(...methylation),
          medianDepth: median(observations.map((observation) => observation.depth)),
          measuredCopyCount: observations.length,
          availableCopyCount: availableCopies.length,
          sourceEligibleCopyCount: membership.sourceEligibleCopies.length,
          allCopyCount: membership.allCopies.length,
          measuredIndividualCount: new Set(observations.map((observation) => observation.sampleId))
            .size,
          populationMean: populationMeanByPos.get(pos1) ?? null,
        },
      ]
    })
    .sort((left, right) => left.pos1 - right.pos1 || left.pos2 - right.pos2)

  const sitesByCoordinate = new Map(sites.map((site) => [`${site.pos1}:${site.pos2}`, site]))
  const groups = visualGroups.flatMap((group) => {
    const represented = group.sites.flatMap((site) => {
      const summary = sitesByCoordinate.get(`${site.pos1}:${site.pos2}`)
      return summary ? [summary] : []
    })
    if (represented.length === 0) return []
    const means = represented.map((site) => site.meanMethylation)
    const measuredIndividuals = new Set(
      group.sites.flatMap((site) =>
        [...(observationsBySite.get(`${site.pos1}:${site.pos2}`)?.values() ?? [])].map(
          (observation) => observation.sampleId
        )
      )
    )
    return [
      {
        group,
        medianSiteMean: median(means),
        minimumSiteMean: Math.min(...means),
        maximumSiteMean: Math.max(...means),
        medianDepth: median(represented.map((site) => site.medianDepth)),
        representedSites: represented.length,
        minimumMeasuredCopyCount: Math.min(...represented.map((site) => site.measuredCopyCount)),
        availableCopyCount: availableCopies.length,
        sourceEligibleCopyCount: membership.sourceEligibleCopies.length,
        allCopyCount: membership.allCopies.length,
        measuredIndividualCount: measuredIndividuals.size,
        populationMean: group.medianPopulationMean,
      },
    ]
  })

  return { ...base, sites, groups }
}

export const clusterMethylationDisplay = (
  summary: ClusterMethylationSummary,
  mode: MethylationViewMode
) => ({
  sites: mode === 'groups' ? [] : summary.sites,
  groups: mode === 'sites' ? [] : summary.groups,
})
