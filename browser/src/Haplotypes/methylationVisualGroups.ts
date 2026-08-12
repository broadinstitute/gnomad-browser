import { classifyPopulationSupport } from './methylationSupport'
import { METHYLATION_VISUAL_GROUP_CONFIG, type MethylationSummaryPoint } from './methylationTypes'

export type VisualGroupBoundaryReason =
  | 'display-start'
  | 'chromosome-change'
  | 'gap-over-1kb'
  | '200-site-cap'
  | 'penalized-change'
  | 'bounded-fixed-bin'
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

type HardRun = {
  sites: MethylationSummaryPoint[]
  boundaryReason: VisualGroupBoundaryReason
}

type SegmentedRun = HardRun & {
  method: string
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const validNumber = (value: number | null | undefined): value is number => Number.isFinite(value)

const validSite = (site: MethylationSummaryPoint) =>
  validNumber(site.mean_methylation) &&
  validNumber(site.pos1) &&
  validNumber(site.pos2) &&
  site.pos1 >= 0 &&
  site.pos2 >= site.pos1

const summarize = (
  sites: MethylationSummaryPoint[],
  boundaryReason: VisualGroupBoundaryReason,
  method: string
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
    limitedSupportSites: sites.filter(
      (site) => classifyPopulationSupport(site).state !== 'adequate'
    ).length,
    boundaryReason,
    configurationVersion: METHYLATION_VISUAL_GROUP_CONFIG.version,
    method,
  }
}

const buildHardRuns = (input: readonly MethylationSummaryPoint[]): HardRun[] => {
  const sorted = [...input].sort(
    (a, b) =>
      a.chrom.localeCompare(b.chrom) ||
      (validNumber(a.pos1) ? a.pos1 : Number.POSITIVE_INFINITY) -
        (validNumber(b.pos1) ? b.pos1 : Number.POSITIVE_INFINITY) ||
      (validNumber(a.pos2) ? a.pos2 : Number.POSITIVE_INFINITY) -
        (validNumber(b.pos2) ? b.pos2 : Number.POSITIVE_INFINITY)
  )
  const runs: HardRun[] = []
  let current: MethylationSummaryPoint[] = []
  let currentReason: VisualGroupBoundaryReason = 'display-start'
  let pendingReason: VisualGroupBoundaryReason | null = null

  const flush = () => {
    if (current.length > 0) runs.push({ sites: current, boundaryReason: currentReason })
    current = []
  }

  sorted.forEach((site) => {
    if (!validSite(site)) {
      flush()
      pendingReason = 'invalid-or-missing-value'
      return
    }

    if (current.length === 0) {
      if (pendingReason) currentReason = pendingReason
      else if (runs.length === 0) currentReason = 'display-start'
      pendingReason = null
      current = [site]
      return
    }

    const previous = current[current.length - 1]
    let boundary: VisualGroupBoundaryReason | null = null
    if (site.chrom !== previous.chrom) boundary = 'chromosome-change'
    else if (site.pos1 - previous.pos1 > METHYLATION_VISUAL_GROUP_CONFIG.maximumGapBp) {
      boundary = 'gap-over-1kb'
    }

    if (boundary) {
      flush()
      currentReason = boundary
    }
    current.push(site)
  })
  flush()
  return runs
}

/**
 * Exact dynamic-programming segmentation for a bounded hard run. The objective is
 * within-segment squared error plus a fixed penalty for each additional constant segment.
 * Segment length is capped so every visual object remains inspectable.
 */
const penalizedSegments = (run: HardRun): SegmentedRun[] => {
  const { sites } = run
  const n = sites.length
  const prefix = new Array<number>(n + 1).fill(0)
  const prefixSquares = new Array<number>(n + 1).fill(0)
  for (let index = 0; index < n; index += 1) {
    const value = sites[index].mean_methylation
    prefix[index + 1] = prefix[index] + value
    prefixSquares[index + 1] = prefixSquares[index] + value * value
  }

  const segmentCost = (start: number, stop: number) => {
    const count = stop - start
    const sum = prefix[stop] - prefix[start]
    const squareSum = prefixSquares[stop] - prefixSquares[start]
    return Math.max(0, squareSum - (sum * sum) / count)
  }

  const penalty = METHYLATION_VISUAL_GROUP_CONFIG.penaltySquaredPercentagePoints
  const maximumSites = METHYLATION_VISUAL_GROUP_CONFIG.maximumSites
  const costs = new Array<number>(n + 1).fill(Number.POSITIVE_INFINITY)
  const previous = new Array<number>(n + 1).fill(0)
  costs[0] = -penalty

  for (let stop = 1; stop <= n; stop += 1) {
    const earliest = Math.max(0, stop - maximumSites)
    for (let start = earliest; start < stop; start += 1) {
      const candidate = costs[start] + segmentCost(start, stop) + penalty
      if (candidate <= costs[stop]) {
        costs[stop] = candidate
        previous[stop] = start
      }
    }
  }

  const boundaries: Array<[number, number]> = []
  for (let stop = n; stop > 0; stop = previous[stop]) {
    boundaries.push([previous[stop], stop])
  }
  boundaries.reverse()

  return boundaries.map(([start, stop], index) => {
    let boundaryReason: VisualGroupBoundaryReason = 'penalized-change'
    if (index === 0) boundaryReason = run.boundaryReason
    else if (boundaries[index - 1][1] - boundaries[index - 1][0] === maximumSites) {
      boundaryReason = '200-site-cap'
    }
    return {
      sites: sites.slice(start, stop),
      boundaryReason,
      method: METHYLATION_VISUAL_GROUP_CONFIG.method,
    }
  })
}

/**
 * Deterministic fallback for large or very noisy displays. It keeps hard chromosome/gap/
 * missing-value boundaries, then uses coordinate-ordered bins capped at 200 CpGs. This avoids
 * creating thousands of SVG and keyboard nodes while making no biological boundary claim.
 */
const fixedBinSegments = (runs: HardRun[]): SegmentedRun[] =>
  runs.flatMap((run) => {
    const segments: SegmentedRun[] = []
    const size = METHYLATION_VISUAL_GROUP_CONFIG.maximumSites
    for (let start = 0; start < run.sites.length; start += size) {
      segments.push({
        sites: run.sites.slice(start, start + size),
        boundaryReason: start === 0 ? run.boundaryReason : 'bounded-fixed-bin',
        method: METHYLATION_VISUAL_GROUP_CONFIG.fallbackMethod,
      })
    }
    return segments
  })

/**
 * Browser-only segmentation. Valid records are copied and sorted. Hard gaps are never bridged;
 * ordinary displays use a penalized piecewise-constant objective, while large/noisy displays
 * use the documented bounded fixed-bin fallback.
 */
export const buildMethylationVisualGroups = (
  input: readonly MethylationSummaryPoint[]
): MethylationVisualGroup[] => {
  const runs = buildHardRuns(input)
  const validSiteCount = runs.reduce((total, run) => total + run.sites.length, 0)
  let segments: SegmentedRun[]

  if (validSiteCount > METHYLATION_VISUAL_GROUP_CONFIG.fallbackInputSites) {
    segments = fixedBinSegments(runs)
  } else {
    segments = runs.flatMap(penalizedSegments)
    if (segments.length > METHYLATION_VISUAL_GROUP_CONFIG.maximumOutputGroups) {
      segments = fixedBinSegments(runs)
    }
  }

  return segments.map((segment) => summarize(segment.sites, segment.boundaryReason, segment.method))
}

export const clipMethylationVisualGroups = (
  groups: readonly MethylationVisualGroup[],
  start: number,
  stop: number
) => groups.filter((group) => group.stop >= start && group.start <= stop)
