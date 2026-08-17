export type TrAlleleRecord = {
  variant_id: string
  source_variant_id?: string | null
  alt_index?: number | null
  lr_cohort?: string | null
  chrom?: string
  pos: number
  end: number | null
  allele_length: number | null
  main_reference_region: { chrom: string; start: number; stop: number } | null
  freq?: {
    all?: { af?: number | null; ac?: number | null; an?: number | null } | null
    af?: number | null
    populations?: Array<{ id: string; ac?: number | null }> | null
  } | null
}

export type TrDistributionPoint = { length_diff: number; pop: string; count: number }

export type TrLocus<T extends TrAlleleRecord = TrAlleleRecord> = {
  key: string
  chrom: string
  start: number
  stop: number
  alleles: T[]
  representative: T
  minLengthDiff: number | null
  maxLengthDiff: number | null
  maxAf: number | null
}

export const getAltAf = (variant: TrAlleleRecord): number | null => {
  const af = variant.freq?.all?.af ?? variant.freq?.af
  return typeof af === 'number' && Number.isFinite(af) ? af : null
}

const coordinates = (variant: TrAlleleRecord) => {
  const region = variant.main_reference_region
  const chrom = region?.chrom || variant.chrom || 'unknown'
  const start = region?.start ?? variant.pos
  const stop =
    region?.stop ?? variant.end ?? variant.pos + Math.max(Math.abs(variant.allele_length || 0), 1)
  return { chrom, start, stop }
}

/**
 * Stable source IDs identify a locus across ALT-suffixed records. If unavailable,
 * only an exact chromosome/start/stop tuple is used. Overlap alone is deliberately
 * insufficient because independently catalogued TR loci can overlap.
 */
export const getTrLocusKey = (variant: TrAlleleRecord): string => {
  const scope = variant.lr_cohort ? `cohort:${variant.lr_cohort}:` : ''
  if (variant.source_variant_id) return `${scope}source:${variant.source_variant_id}`
  const locus = coordinates(variant)
  return `${scope}coordinates:${locus.chrom}:${locus.start}:${locus.stop}`
}

/** ALT identity within a locus. Repeated query/join rows for the same ALT must
 * not contribute frequency or distribution counts more than once. */
export const getTrAlleleKey = (variant: TrAlleleRecord): string => {
  if (variant.source_variant_id && variant.alt_index != null) {
    return `source-alt:${variant.source_variant_id}:${variant.alt_index}`
  }
  return `variant:${variant.variant_id}`
}

const POPULATION_LABELS: Record<string, string> = {
  afr: 'AFR',
  amr: 'AMR',
  asj: 'ASJ',
  eas: 'EAS',
  nfe: 'EUR',
  oth: 'RMI',
  rmi: 'RMI',
  sas: 'SAS',
}

const availableCount = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return value
}

/**
 * Build an ALT-allele count histogram for a summary TR locus. Y1 allele_length is
 * the signed ALT-minus-REF base-pair difference. Population ACs are preferred so
 * stacked bars do not double-count the cohort AC; cohort AC is used only when no
 * ancestry AC is available for that ALT. Missing lengths/counts stay missing.
 */
export const getTrLocusDistribution = <T extends TrAlleleRecord>(
  alleles: T[]
): TrDistributionPoint[] => {
  const distribution: TrDistributionPoint[] = []
  alleles.forEach((allele) => {
    const lengthDiff = allele.allele_length
    if (typeof lengthDiff !== 'number' || !Number.isFinite(lengthDiff)) return

    const populationCounts = (allele.freq?.populations || []).flatMap((population) => {
      const pop = POPULATION_LABELS[population.id.toLowerCase()]
      const count = availableCount(population.ac)
      return pop && count !== null ? [{ length_diff: lengthDiff, pop, count }] : []
    })
    if (populationCounts.length > 0) {
      distribution.push(...populationCounts)
      return
    }

    const count = availableCount(allele.freq?.all?.ac)
    if (count !== null) distribution.push({ length_diff: lengthDiff, pop: 'N/A', count })
  })
  return distribution
}

export const aggregateTrLoci = <T extends TrAlleleRecord>(variants: T[]): TrLocus<T>[] => {
  const groupedAlleles = new Map<string, Map<string, T>>()
  variants.forEach((variant) => {
    const locusKey = getTrLocusKey(variant)
    let alleles = groupedAlleles.get(locusKey)
    if (!alleles) {
      alleles = new Map()
      groupedAlleles.set(locusKey, alleles)
    }
    // Keep the first authoritative row for an ALT. Later identical join rows
    // are occurrences, not additional alleles.
    if (!alleles.has(getTrAlleleKey(variant))) {
      alleles.set(getTrAlleleKey(variant), variant)
    }
  })
  const groups = new Map(
    Array.from(groupedAlleles, ([key, alleles]) => [key, Array.from(alleles.values())])
  )

  return Array.from(groups, ([key, alleles]) => {
    const locus = coordinates(alleles[0])
    const lengths = alleles
      .map((allele) => allele.allele_length)
      .filter((length): length is number => typeof length === 'number' && Number.isFinite(length))
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
      ...locus,
      alleles,
      representative,
      minLengthDiff: lengths.length > 0 ? Math.min(...lengths) : null,
      maxLengthDiff: lengths.length > 0 ? Math.max(...lengths) : null,
      maxAf,
    }
  })
}

export const packLoci = <T extends { start: number; stop: number }>(loci: T[]) => {
  const sorted = [...loci].sort((a, b) => a.start - b.start || a.stop - b.stop)
  const rowEnds: number[] = []
  const packed = sorted.map((locus) => {
    const row = rowEnds.findIndex((end) => locus.start > end + 2)
    if (row === -1) {
      rowEnds.push(locus.stop)
      return { ...locus, row: rowEnds.length - 1 }
    }
    rowEnds[row] = locus.stop
    return { ...locus, row }
  })
  return { packed, maxRows: Math.max(rowEnds.length, 1) }
}

// Retain the TR-specific name for existing consumers while sharing the exact
// packing behavior with other source-event summary bands.
export const packTrLoci = <T extends TrLocus>(loci: T[]) => packLoci(loci)
