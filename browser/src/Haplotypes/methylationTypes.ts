export type MethylationViewMode = 'sites' | 'groups' | 'both'

export type MethylationSummaryPoint = {
  chrom: string
  pos1: number
  pos2: number
  mean_methylation: number
  mean_coverage: number
  num_samples: number
  std_methylation?: number | null
  min_methylation?: number | null
  max_methylation?: number | null
}

export type MethylationSupportState =
  | 'adequate'
  | 'limited-depth'
  | 'limited-samples'
  | 'limited-depth-and-samples'
  | 'limited-sites'
  | 'missing'
  | 'unavailable'

export type CopySupportState =
  | 'balanced-enough'
  | 'uneven'
  | 'one-copy-limited'
  | 'missing'
  | 'unavailable'

/**
 * Display-only cautions. These are not significance or biological cutoffs. Keep changes
 * versioned and review them against aggregate data before changing the public defaults.
 */
export const METHYLATION_DISPLAY_SUPPORT_CONFIG = {
  version: 'display-support-v1',
  minimumMeanReadDepth: 10,
  minimumObservedSamples: 20,
  minimumCopyReadDepth: 5,
  minimumCopySiteCompleteness: 0.5,
  maximumBalancedCopyDepthRatio: 4,
  maximumBalancedCopySampleRatio: 4,
} as const

/** Browser-only grouping settings; groups are recalculated for every displayed region. */
export const METHYLATION_VISUAL_GROUP_CONFIG = {
  version: 'visual-groups-v2',
  method: 'penalized-piecewise-constant',
  fallbackMethod: 'bounded-fixed-bin-fallback',
  maximumGapBp: 1000,
  maximumSites: 200,
  penaltySquaredPercentagePoints: 400,
  fallbackInputSites: 2000,
  maximumOutputGroups: 200,
} as const
