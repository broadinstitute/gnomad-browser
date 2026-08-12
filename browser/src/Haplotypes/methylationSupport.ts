import {
  METHYLATION_DISPLAY_SUPPORT_CONFIG,
  type CopySupportState,
  type MethylationSupportState,
  type MethylationSummaryPoint,
} from './methylationTypes'

export type SupportClassification<T extends string> = {
  state: T
  reasons: string[]
}

const finite = (value: number | null | undefined): value is number => Number.isFinite(value)

export const classifyPopulationSupport = (
  point: MethylationSummaryPoint
): SupportClassification<MethylationSupportState> => {
  const depth = point.mean_coverage
  const samples = point.num_samples
  if (!finite(point.mean_methylation)) {
    return {
      state: 'missing',
      reasons: ['Population mean is unavailable; it is not displayed as zero.'],
    }
  }

  const lowDepth = !finite(depth) || depth < METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumMeanReadDepth
  const lowSamples =
    !finite(samples) || samples < METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumObservedSamples
  const reasons: string[] = []
  if (lowDepth) {
    reasons.push(
      finite(depth)
        ? `Mean read depth ${depth.toFixed(1)}× is below the ${
            METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumMeanReadDepth
          }× display support threshold.`
        : 'Mean read depth is unavailable.'
    )
  }
  if (lowSamples) {
    reasons.push(
      finite(samples)
        ? `${samples} observed sample totals is below the ${METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumObservedSamples}-sample display support threshold.`
        : 'Observed sample totals are unavailable.'
    )
  }
  if (lowDepth && lowSamples) return { state: 'limited-depth-and-samples', reasons }
  if (lowDepth) return { state: 'limited-depth', reasons }
  if (lowSamples) return { state: 'limited-samples', reasons }
  return {
    state: 'adequate',
    reasons: [
      `Mean depth ${depth.toFixed(
        1
      )}× and ${samples} observed sample totals meet the current display support thresholds.`,
    ],
  }
}

export type CopyEvidence = {
  meanDepth: number | null
  representedSites: number
  totalSites: number
  sampleCount: number
}

export type CopySupportClassification = SupportClassification<CopySupportState> & {
  depthRatio: number | null
}

export const classifyCopySupport = (
  copyA: CopyEvidence | null,
  copyB: CopyEvidence | null,
  available = true
): CopySupportClassification => {
  if (!available) {
    return {
      state: 'unavailable',
      reasons: ['Joined Copy A/B mapping is unavailable for this region.'],
      depthRatio: null,
    }
  }
  if (
    !copyA ||
    !copyB ||
    copyA.representedSites === 0 ||
    copyB.representedSites === 0 ||
    copyA.sampleCount === 0 ||
    copyB.sampleCount === 0
  ) {
    return {
      state: 'missing',
      reasons: [
        'One or both copies have no CpG or contributing-sample observations; missing values are not displayed as zero.',
      ],
      depthRatio: null,
    }
  }

  const cfg = METHYLATION_DISPLAY_SUPPORT_CONFIG
  const complete = (copy: CopyEvidence) =>
    copy.totalSites > 0 &&
    copy.representedSites / copy.totalSites >= cfg.minimumCopySiteCompleteness
  const depthOk = (copy: CopyEvidence) =>
    finite(copy.meanDepth) && copy.meanDepth >= cfg.minimumCopyReadDepth
  const aOk = complete(copyA) && depthOk(copyA)
  const bOk = complete(copyB) && depthOk(copyB)
  const reasons: string[] = [
    `Copy A has ${copyA.meanDepth?.toFixed(1) ?? 'unavailable'}× mean depth, ${
      copyA.representedSites
    }/${copyA.totalSites} CpGs represented, and ${copyA.sampleCount} contributing sample${
      copyA.sampleCount === 1 ? '' : 's'
    }.`,
    `Copy B has ${copyB.meanDepth?.toFixed(1) ?? 'unavailable'}× mean depth, ${
      copyB.representedSites
    }/${copyB.totalSites} CpGs represented, and ${copyB.sampleCount} contributing sample${
      copyB.sampleCount === 1 ? '' : 's'
    }.`,
  ]
  const lowDepth = Math.min(copyA.meanDepth ?? 0, copyB.meanDepth ?? 0)
  const highDepth = Math.max(copyA.meanDepth ?? 0, copyB.meanDepth ?? 0)
  const depthRatio = lowDepth > 0 ? highDepth / lowDepth : null
  const lowSamples = Math.min(copyA.sampleCount, copyB.sampleCount)
  const highSamples = Math.max(copyA.sampleCount, copyB.sampleCount)
  const sampleRatio = highSamples / lowSamples

  if (!aOk || !bOk) {
    reasons.push('One copy has limited display support; interpret the copy difference cautiously.')
    return { state: 'one-copy-limited', reasons, depthRatio }
  }

  if (
    depthRatio === null ||
    depthRatio > cfg.maximumBalancedCopyDepthRatio ||
    sampleRatio > cfg.maximumBalancedCopySampleRatio
  ) {
    reasons.push(
      `The Copy A/B read-depth ratio is ${
        depthRatio === null ? 'undefined' : `${depthRatio.toFixed(1)}:1`
      } and the contributing-sample ratio is ${sampleRatio.toFixed(
        1
      )}:1; display caution thresholds are ${cfg.maximumBalancedCopyDepthRatio}:1 and ${
        cfg.maximumBalancedCopySampleRatio
      }:1.`
    )
    reasons.push('Uneven read or sample support — interpret the copy difference cautiously.')
    return { state: 'uneven', reasons, depthRatio }
  }

  reasons.push(
    `Both copies meet the current display checks; read-depth and contributing-sample ratios are ${depthRatio.toFixed(
      1
    )}:1 and ${sampleRatio.toFixed(1)}:1. Balanced support does not prove a biological effect.`
  )
  return { state: 'balanced-enough', reasons, depthRatio }
}
