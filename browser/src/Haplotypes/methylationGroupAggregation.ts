import type { SupportClassification } from './methylationSupport'
import type { MethylationSupportState, MethylationViewMode } from './methylationTypes'
import { METHYLATION_DISPLAY_SUPPORT_CONFIG } from './methylationTypes'
import type { MethylationVisualGroup } from './methylationVisualGroups'

export type MethylationLayerObservation = {
  chrom?: string
  pos1: number
  pos2: number
  methylation: number
  coverage?: number | null
  sample?: string
  sampleCount?: number
}

type CanonicalCopyRecord = Omit<MethylationLayerObservation, 'coverage'> & {
  coverage: number
  sample: string
  source_haplotype: 'HAP1' | 'HAP2'
  vcf_strand: 1 | 2
  mapping_scope: 'CHROMOSOME_WIDE'
  phase_set: null
}

type CanonicalCopySample = {
  sample_id: string
  strand_mapping: { strandA: number | null; strandB: number | null }
}

/**
 * Apply only the already-admitted VCF-strand-to-canonical-copy mapping. This helper does not infer
 * orientation: malformed/unjoined rows are rejected, and callers retain the authoritative row
 * readiness gate before using its output.
 */
export const observationsByCanonicalCopy = (
  records: readonly CanonicalCopyRecord[],
  samples: readonly CanonicalCopySample[]
): { A: MethylationLayerObservation[]; B: MethylationLayerObservation[] } => {
  const mappings = new Map(samples.map((sample) => [sample.sample_id, sample.strand_mapping]))
  const result: { A: MethylationLayerObservation[]; B: MethylationLayerObservation[] } = {
    A: [],
    B: [],
  }
  records.forEach((record) => {
    if (
      record.mapping_scope !== 'CHROMOSOME_WIDE' ||
      record.phase_set !== null ||
      (record.source_haplotype === 'HAP1' ? record.vcf_strand !== 1 : record.vcf_strand !== 2)
    ) {
      return
    }
    const mapping = mappings.get(record.sample)
    let copy: 'A' | 'B' | null = null
    if (mapping?.strandA === record.vcf_strand) copy = 'A'
    else if (mapping?.strandB === record.vcf_strand) copy = 'B'
    if (!copy) return
    result[copy].push({
      pos1: record.pos1,
      pos2: record.pos2,
      methylation: record.methylation,
      coverage: record.coverage,
      sample: record.sample,
    })
  })
  return result
}

export type MethylationLayerSiteSummary = {
  pos1: number
  pos2: number
  weightedMeanMethylation: number
  totalCoverage: number
  meanCoverage: number
  contributingSampleCount: number
  observationCount: number
}

export type MethylationLayerGroupSummary = {
  group: MethylationVisualGroup
  weightedMeanMethylation: number | null
  medianPerCpgCoverage: number | null
  representedSites: number
  missingSites: number
  contributingSampleCount: number
  support: SupportClassification<MethylationSupportState>
  sites: MethylationLayerSiteSummary[]
}

const finite = (value: number | null | undefined): value is number => Number.isFinite(value)

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export const summarizeMethylationLayerSites = (
  observations: readonly MethylationLayerObservation[]
): MethylationLayerSiteSummary[] => {
  const bySite = new Map<
    string,
    {
      pos1: number
      pos2: number
      weightedMethylation: number
      coverage: number
      samples: Set<string>
      sampleCounts: number[]
      observations: number
    }
  >()

  observations.forEach((observation) => {
    if (
      !finite(observation.pos1) ||
      !finite(observation.pos2) ||
      !finite(observation.methylation) ||
      !finite(observation.coverage) ||
      observation.coverage <= 0
    ) {
      return
    }
    const key = `${observation.pos1}:${observation.pos2}`
    const aggregate = bySite.get(key) ?? {
      pos1: observation.pos1,
      pos2: observation.pos2,
      weightedMethylation: 0,
      coverage: 0,
      samples: new Set<string>(),
      sampleCounts: [],
      observations: 0,
    }
    aggregate.weightedMethylation += observation.methylation * observation.coverage
    aggregate.coverage += observation.coverage
    aggregate.observations += 1
    if (observation.sample) aggregate.samples.add(observation.sample)
    if (finite(observation.sampleCount)) aggregate.sampleCounts.push(observation.sampleCount)
    bySite.set(key, aggregate)
  })

  return [...bySite.values()]
    .map((aggregate) => ({
      pos1: aggregate.pos1,
      pos2: aggregate.pos2,
      weightedMeanMethylation: aggregate.weightedMethylation / aggregate.coverage,
      totalCoverage: aggregate.coverage,
      // A row may contain several samples. Report the mean per-observation depth at the CpG,
      // then take the median of those CpG means for a visual group.
      meanCoverage: aggregate.coverage / aggregate.observations,
      contributingSampleCount:
        aggregate.samples.size ||
        Math.round(median(aggregate.sampleCounts) ?? aggregate.observations),
      observationCount: aggregate.observations,
    }))
    .sort((a, b) => a.pos1 - b.pos1 || a.pos2 - b.pos2)
}

const classifyGroupSupport = (
  representedSites: number,
  totalSites: number,
  medianCoverage: number | null,
  layer: 'sample-total' | 'copy'
): SupportClassification<MethylationSupportState> => {
  if (representedSites === 0 || medianCoverage === null) {
    return {
      state: 'missing',
      reasons: [
        'No coverage-supported CpG observations are available; missing is not displayed as zero.',
      ],
    }
  }

  const minimumDepth =
    layer === 'copy'
      ? METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumCopyReadDepth
      : METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumMeanReadDepth
  const completeness = totalSites === 0 ? 0 : representedSites / totalSites
  const reasons: string[] = []
  if (medianCoverage < minimumDepth) {
    reasons.push(
      `Median per-CpG depth ${medianCoverage.toFixed(
        1
      )}× is below the ${minimumDepth}× display support threshold.`
    )
  }
  if (completeness < METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumCopySiteCompleteness) {
    reasons.push(
      `${representedSites}/${totalSites} CpGs are represented, below the ${Math.round(
        METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumCopySiteCompleteness * 100
      )}% display completeness threshold.`
    )
  }
  if (completeness < METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumCopySiteCompleteness) {
    return { state: 'limited-sites', reasons }
  }
  if (medianCoverage < minimumDepth) return { state: 'limited-depth', reasons }
  return {
    state: 'adequate',
    reasons: [
      `Median per-CpG depth ${medianCoverage.toFixed(
        1
      )}× and ${representedSites}/${totalSites} represented CpGs meet current display checks.`,
    ],
  }
}

export const aggregateMethylationByVisualGroups = (
  observations: readonly MethylationLayerObservation[],
  groups: readonly MethylationVisualGroup[],
  layer: 'sample-total' | 'copy' = 'sample-total'
): MethylationLayerGroupSummary[] => {
  const sites = summarizeMethylationLayerSites(observations)
  const siteByCoordinate = new Map(sites.map((site) => [`${site.pos1}:${site.pos2}`, site]))

  return groups.map((group) => {
    const represented = group.sites.flatMap((populationSite) => {
      const site = siteByCoordinate.get(`${populationSite.pos1}:${populationSite.pos2}`)
      return site ? [site] : []
    })
    const totalCoverage = represented.reduce((sum, site) => sum + site.totalCoverage, 0)
    const weightedMeanMethylation =
      totalCoverage > 0
        ? represented.reduce(
            (sum, site) => sum + site.weightedMeanMethylation * site.totalCoverage,
            0
          ) / totalCoverage
        : null
    const medianPerCpgCoverage = median(represented.map((site) => site.meanCoverage))
    const contributingSampleCount = Math.round(
      median(represented.map((site) => site.contributingSampleCount)) ?? 0
    )

    return {
      group,
      weightedMeanMethylation,
      medianPerCpgCoverage,
      representedSites: represented.length,
      missingSites: group.siteCount - represented.length,
      contributingSampleCount,
      support: classifyGroupSupport(
        represented.length,
        group.siteCount,
        medianPerCpgCoverage,
        layer
      ),
      sites: represented,
    }
  })
}

export const buildMethylationLayerDisplay = (
  observations: readonly MethylationLayerObservation[],
  groups: readonly MethylationVisualGroup[],
  mode: MethylationViewMode,
  layer: 'sample-total' | 'copy' = 'sample-total'
) => ({
  sites: mode === 'groups' ? [] : summarizeMethylationLayerSites(observations),
  groups:
    mode === 'sites'
      ? []
      : aggregateMethylationByVisualGroups(observations, groups, layer).filter(
          (group) => group.weightedMeanMethylation !== null
        ),
})
