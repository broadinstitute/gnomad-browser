import { classifyPopulationSupport } from './methylationSupport'
import {
  METHYLATION_VISUAL_GROUP_CONFIG,
  type MethylationSummaryPoint,
} from './methylationTypes'

export type VisualGroupBoundaryReason =
  | 'display-start'
  | 'chromosome-change'
  | 'gap-over-1kb'
  | '200-site-cap'
  | 'mean-change'
  | 'invalid-or-missing-value'

export type MethylationVisualGroup = {
  key: string
  chrom: string
  start: number
  stop: number
  sites: MethylationSummaryPoint[]
  siteCount: number
  medianPopulationMean: number
  minimumSiteMean: number
  maximumSiteMean: number
  medianSiteSd: number | null
  medianMeanCoverage: number | null
  minimumObservedSamples: number
  medianObservedSamples: number
  limitedSupportSites: number
  boundaryReason: VisualGroupBoundaryReason
  configurationVersion: string
  method: string
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const validNumber = (value: number | null | undefined): value is number => Number.isFinite(value)

const summarize = (
  sites: MethylationSummaryPoint[],
  boundaryReason: VisualGroupBoundaryReason
): MethylationVisualGroup => {
  const means = sites.map((site) => site.mean_methylation)
  const coverages = sites.map((site) => site.mean_coverage).filter(validNumber)
  const sampleCounts = sites.map((site) => site.num_samples).filter(validNumber)
  const sds = sites.map((site) => site.std_methylation).filter(validNumber)
  return {
    key: `${sites[0].chrom}:${sites[0].pos1}-${sites[sites.length - 1].pos2}:${sites.length}`,
    chrom: sites[0].chrom,
    start: sites[0].pos1,
    stop: sites[sites.length - 1].pos2,
    sites,
    siteCount: sites.length,
    medianPopulationMean: median(means)!,
    minimumSiteMean: Math.min(...means),
    maximumSiteMean: Math.max(...means),
    medianSiteSd: median(sds),
    medianMeanCoverage: median(coverages),
    minimumObservedSamples: sampleCounts.length ? Math.min(...sampleCounts) : 0,
    medianObservedSamples: median(sampleCounts) ?? 0,
    limitedSupportSites: sites.filter((site) => classifyPopulationSupport(site).state !== 'adequate').length,
    boundaryReason,
    configurationVersion: METHYLATION_VISUAL_GROUP_CONFIG.version,
    method: METHYLATION_VISUAL_GROUP_CONFIG.method,
  }
}

/**
 * Deterministic browser-only segmentation. Input is copied and sorted; boundaries use only
 * coordinates and population means, while depth/sample totals affect styling and evidence.
 */
export const buildMethylationVisualGroups = (
  input: readonly MethylationSummaryPoint[]
): MethylationVisualGroup[] => {
  const sorted = [...input].sort((a, b) =>
    a.chrom.localeCompare(b.chrom) || a.pos1 - b.pos1 || a.pos2 - b.pos2
  )
  const groups: MethylationVisualGroup[] = []
  let current: MethylationSummaryPoint[] = []
  let currentReason: VisualGroupBoundaryReason = 'display-start'

  const flush = () => {
    if (current.length > 0) groups.push(summarize(current, currentReason))
    current = []
  }

  sorted.forEach((site) => {
    if (!validNumber(site.mean_methylation) || !validNumber(site.pos1) || !validNumber(site.pos2)) {
      flush()
      currentReason = 'invalid-or-missing-value'
    } else if (current.length === 0) {
      current = [site]
    } else {
      const previous = current[current.length - 1]
      let boundary: VisualGroupBoundaryReason | null = null
      if (site.chrom !== previous.chrom) boundary = 'chromosome-change'
      else if (site.pos1 - previous.pos1 > METHYLATION_VISUAL_GROUP_CONFIG.maximumGapBp) boundary = 'gap-over-1kb'
      else if (current.length >= METHYLATION_VISUAL_GROUP_CONFIG.maximumSites) boundary = '200-site-cap'
      else if (
        current.length >= METHYLATION_VISUAL_GROUP_CONFIG.minimumSitesBeforeChange &&
        Math.abs(site.mean_methylation - previous.mean_methylation) >=
          METHYLATION_VISUAL_GROUP_CONFIG.changeThresholdPercentagePoints
      ) boundary = 'mean-change'

      if (boundary) {
        flush()
        currentReason = boundary
      }
      current.push(site)
    }
  })
  flush()
  return groups
}

export const clipMethylationVisualGroups = (
  groups: readonly MethylationVisualGroup[],
  start: number,
  stop: number
) => groups.filter((group) => group.stop >= start && group.start <= stop)
