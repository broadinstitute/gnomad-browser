export type TrLocusComponent = {
  chrom: string
  start0: number
  end0: number
  motif: string
}

export type TrLocusId = {
  components: TrLocusComponent[]
  canonicalId: string
  sourceTrid: string
}

const COMPONENT = /^(?:chr)?([1-9]|1\d|2[0-2]|X|Y)-(\d+)-(\d+)-([A-Z]+)$/i

export const formatTrLocusComponent = (component: TrLocusComponent) =>
  `${component.chrom}-${component.start0}-${component.end0}-${component.motif}`

/**
 * Parse the source TRID comma form or the public route's plus form.
 * Component order and duplicates are identity-bearing and are never changed.
 */
export const parseTrLocusId = (value: string): TrLocusId | null => {
  if (!value || value.trim() !== value || (value.includes(',') && value.includes('+'))) return null
  const parts = value.split(value.includes(',') ? ',' : '+')
  if (!parts.length || parts.some((part) => !part)) return null

  const parsedComponents = parts.map((part): TrLocusComponent | null => {
    const match = COMPONENT.exec(part)
    if (!match) return null
    const [, rawChrom, rawStart, rawEnd, rawMotif] = match
    const chrom = rawChrom.toUpperCase()
    const start0 = Number(rawStart)
    const end0 = Number(rawEnd)
    const motif = rawMotif.toUpperCase()
    if (
      !Number.isSafeInteger(start0) ||
      !Number.isSafeInteger(end0) ||
      start0 < 0 ||
      start0 >= end0
    )
      return null
    return { chrom, start0, end0, motif }
  })
  if (parsedComponents.some((component) => component === null)) return null
  const components = parsedComponents as TrLocusComponent[]
  if (components.some((component) => component.chrom !== components[0].chrom)) return null

  const formatted = components.map(formatTrLocusComponent)
  return {
    components,
    canonicalId: formatted.join('+'),
    sourceTrid: formatted.join(','),
  }
}

export const isTrLocusId = (value: string) => parseTrLocusId(value) !== null

export const trComponentDisplayRegion = (component: TrLocusComponent) => ({
  chrom: component.chrom,
  start1: component.start0 + 1,
  end1: component.end0,
})

export const trLocusDisplayEnvelope = (locus: TrLocusId) => ({
  chrom: locus.components[0].chrom,
  start1: Math.min(...locus.components.map((component) => component.start0)) + 1,
  end1: Math.max(...locus.components.map((component) => component.end0)),
})

export const trLocusUrl = (
  locus: string | TrLocusId,
  cohort: 'hgsvc_hprc' | 'aou',
  allele?: string
) => {
  const parsed = typeof locus === 'string' ? parseTrLocusId(locus) : locus
  if (!parsed) throw new Error('Invalid tandem-repeat locus ID')
  const params = new URLSearchParams({ dataset: 'gnomad_r4_lr', lr_cohort: cohort })
  if (allele) params.set('allele', allele)
  return `/tandem-repeat/${parsed.canonicalId}?${params}`
}
