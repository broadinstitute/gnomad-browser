type ViewRegion = { start: number; stop: number }

type ViewportVariant = {
  pos?: number | null
  end?: number | null
  stop?: number | null
  length?: number | null
  allele_length?: number | null
  allele_type?: string | null
  main_reference_region?: { start?: number | null; stop?: number | null } | null
}

const finiteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const longReadVariantOverlapsViewport = (
  variant: ViewportVariant,
  viewport: ViewRegion
): boolean => {
  if (!finiteNumber(variant.pos)) return false

  const referenceStart = variant.main_reference_region?.start
  const referenceStop = variant.main_reference_region?.stop
  const variantStart = finiteNumber(referenceStart)
    ? Math.min(variant.pos, referenceStart)
    : variant.pos

  const explicitStops = [variant.end, variant.stop, referenceStop].filter(finiteNumber)
  let variantStop = explicitStops.length > 0
    ? Math.max(variant.pos, ...explicitStops)
    : variant.pos

  const alleleType = (variant.allele_type || '').toLowerCase()
  const alleleLength = variant.allele_length ?? variant.length
  if (
    finiteNumber(alleleLength) &&
    alleleLength < 0 &&
    ['del', 'deletion', 'cn0'].includes(alleleType)
  ) {
    variantStop = Math.max(variantStop, variant.pos + Math.abs(alleleLength))
  }

  return variantStart <= viewport.stop && variantStop >= viewport.start
}

export const filterLongReadVariantsForViewport = <T extends ViewportVariant>(
  variants: T[],
  viewport: ViewRegion | null | undefined
): T[] => viewport
  ? variants.filter((variant) => longReadVariantOverlapsViewport(variant, viewport))
  : variants
