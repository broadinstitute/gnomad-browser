import { getAltAf, packLoci, type TrAlleleRecord } from './trLocusAggregation'

export type SourceEventRecord = TrAlleleRecord & {
  allele_type: string
  start: number
  stop: number
}

export type LengthDistributionPoint = { length_diff: number; pop: 'N/A'; count: number }

export type SourceEvent<T extends SourceEventRecord = SourceEventRecord> = {
  key: string
  chrom: string
  start: number
  stop: number
  minStart: number
  maxStart: number
  minStop: number
  maxStop: number
  alleles: T[]
  representative: T
  subtypes: string[]
  minSignedLength: number | null
  maxSignedLength: number | null
  minAbsoluteLength: number | null
  maxAbsoluteLength: number | null
  maxAf: number | null
}

const eventChrom = (variant: SourceEventRecord) =>
  variant.main_reference_region?.chrom || variant.chrom || 'unknown'

/**
 * A stable source ID is the only non-coordinate evidence that ALT records are
 * one event. Without it, require an exact, type-aware coordinate identity;
 * overlap is intentionally not enough.
 */
export const getSourceEventKey = (variant: SourceEventRecord): string => {
  if (variant.source_variant_id) return `source:${variant.source_variant_id}`
  return `coordinates:${variant.allele_type.toLowerCase()}:${eventChrom(variant)}:${
    variant.start
  }:${variant.stop}`
}

export const aggregateSourceEvents = <T extends SourceEventRecord>(
  variants: T[]
): SourceEvent<T>[] => {
  const groups = variants.reduce((result, variant) => {
    const key = getSourceEventKey(variant)
    result.set(key, [...(result.get(key) || []), variant])
    return result
  }, new Map<string, T[]>())

  return Array.from(groups, ([key, alleles]) => {
    const starts = alleles.map((allele) => allele.start)
    const stops = alleles.map((allele) => allele.stop)
    const signedLengths = alleles
      .map((allele) => allele.allele_length)
      .filter((length): length is number => typeof length === 'number' && Number.isFinite(length))
    const absoluteLengths = signedLengths.map(Math.abs)
    const availableAfs = alleles.map(getAltAf).filter((af): af is number => af !== null)
    const maxAf = availableAfs.length > 0 ? Math.max(...availableAfs) : null
    const representative = alleles.reduce((best, allele) => {
      const bestAf = getAltAf(best)
      const alleleAf = getAltAf(allele)
      if (alleleAf === null) return best
      return bestAf === null || alleleAf > bestAf ? allele : best
    }, alleles[0])

    return {
      key,
      chrom: eventChrom(alleles[0]),
      start: Math.min(...starts),
      stop: Math.max(...stops),
      minStart: Math.min(...starts),
      maxStart: Math.max(...starts),
      minStop: Math.min(...stops),
      maxStop: Math.max(...stops),
      alleles,
      representative,
      subtypes: Array.from(new Set(alleles.map((allele) => allele.allele_type.toUpperCase()))),
      minSignedLength: signedLengths.length > 0 ? Math.min(...signedLengths) : null,
      maxSignedLength: signedLengths.length > 0 ? Math.max(...signedLengths) : null,
      minAbsoluteLength: absoluteLengths.length > 0 ? Math.min(...absoluteLengths) : null,
      maxAbsoluteLength: absoluteLengths.length > 0 ? Math.max(...absoluteLengths) : null,
      maxAf,
    }
  })
}

/** One bin contribution per ALT record with an available insertion length. */
export const getInsertionLengthDistribution = <T extends SourceEventRecord>(
  alleles: T[]
): LengthDistributionPoint[] =>
  alleles.flatMap((allele) => {
    const length = allele.allele_length
    return typeof length === 'number' && Number.isFinite(length)
      ? [{ length_diff: Math.abs(length), pop: 'N/A' as const, count: 1 }]
      : []
  })

export const packSourceEvents = <T extends SourceEvent>(events: T[]) => packLoci(events)
