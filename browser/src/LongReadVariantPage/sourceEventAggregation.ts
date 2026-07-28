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
  family: string
}

const eventChrom = (variant: SourceEventRecord) =>
  variant.main_reference_region?.chrom || variant.chrom || 'unknown'

/** Normalize mechanistic subtypes only where the display contract formally
 * treats them as one structural-event family. Unknown classes remain distinct.
 */
export const getSourceEventFamily = (alleleType: string): string => {
  const type = alleleType.toLowerCase()
  if (['dup', 'dup_interspersed', 'complex_dup', 'inv_dup'].includes(type)) return 'duplication'
  if (['ins', 'alu_ins', 'sva_ins', 'numt'].includes(type)) return 'insertion'
  if (['del', 'alu_del', 'line_del', 'sva_del'].includes(type)) return 'deletion'
  if (type === 'inv') return 'inversion'
  return type
}

/**
 * Y1 source_variant_id is the byte-exact source record ID, not a guaranteed
 * shared locus/event ID. AoU emits separate IDs for sequence-distinct alleles
 * (for example, chr22-20075553-INS-849_1 and ...-849_2). The bounded glyph
 * identity is therefore an exact reference interval plus normalized event
 * family. Overlap is intentionally insufficient, and source-ID prefixes are
 * not parsed because no such prefix contract exists in the serving schema.
 */
export const getSourceEventKey = (variant: SourceEventRecord): string =>
  `locus:${getSourceEventFamily(variant.allele_type)}:${eventChrom(variant)}:${variant.start}:${
    variant.stop
  }`

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
      family: getSourceEventFamily(alleles[0].allele_type),
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
