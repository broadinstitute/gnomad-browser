const Y1_ALT_SIZE_ONLY_TYPES = new Set([
  'ins',
  'insertion',
  'alu_ins',
  'line_ins',
  'sva_ins',
  'numt',
  'dup',
  'duplication',
  'dup_interspersed',
  'dup_tandem',
  'complex_dup',
  'inv_dup',
  'trv',
])

type Y1ReferenceInterval = {
  position: unknown
  referenceEnd: unknown
  refAllele: unknown
  alleleType: unknown
}

/**
 * Resolve the genomic interval occupied on the reference by an accepted Y1 allele.
 *
 * Y1 reference_end is inclusive and is derived from the source REF allele. Insertion,
 * duplication, and TR allele lengths describe ALT sequence/delta size, not additional
 * reference bases. Re-derive their bounded reference locus from REF so a stale builder
 * cannot turn ALT size (or symbolic SVLEN) into a multi-kilobase genomic bar.
 */
export const resolveY1ReferenceEnd = ({
  position,
  referenceEnd,
  refAllele,
  alleleType,
}: Y1ReferenceInterval): number => {
  const start = Number(position)
  if (!Number.isFinite(start)) throw new Error(`Invalid Y1 position: ${position}`)

  const ref = typeof refAllele === 'string' ? refAllele : ''
  const refEnd = start + Math.max(ref.length, 1) - 1
  const type = String(alleleType || '')
    .trim()
    .toLowerCase()

  if (Y1_ALT_SIZE_ONLY_TYPES.has(type)) return refEnd

  const candidate = Number(referenceEnd)
  return Number.isFinite(candidate) && candidate >= start ? candidate : refEnd
}
