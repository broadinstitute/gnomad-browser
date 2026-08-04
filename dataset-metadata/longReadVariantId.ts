export type LongReadVariantId = {
  chrom: string
  pos: number
  ref?: string
  alt?: string
  alleleType?: string
  alleleLength?: number
  symbolicSuffix?: string
  provenance?: number
}

const LONG_READ_VARIANT_ID =
  /^(?:chr)?([1-9]|1\d|2[0-2]|X|Y)-(\d+)-(?:([ACGTN]+)-([ACGTN]+)|([A-Z]+)(?:-([A-Z0-9._+-]+))?)(?:~(\d+))?$/i

/**
 * Parse an ID used by the long-read tables.
 *
 * LR data contains ordinary sequence IDs as well as compact symbolic IDs. Both
 * forms may retain the source VCF's chr prefix and provenance suffix.
 */
export const parseLongReadVariantId = (id: string): LongReadVariantId | null => {
  const match = LONG_READ_VARIANT_ID.exec(id)
  if (!match) return null

  const [, chrom, pos, ref, alt, alleleType, symbolicSuffix, provenance] = match
  return {
    chrom,
    pos: Number(pos),
    ...(ref ? { ref: ref.toUpperCase(), alt: alt.toUpperCase() } : {}),
    ...(alleleType ? { alleleType: alleleType.toLowerCase() } : {}),
    ...(symbolicSuffix && !/^\d+$/.test(symbolicSuffix) ? { symbolicSuffix } : {}),
    ...(symbolicSuffix && /^\d+$/.test(symbolicSuffix)
      ? { alleleLength: Number(symbolicSuffix) }
      : {}),
    ...(provenance ? { provenance: Number(provenance) } : {}),
  }
}

export const isLongReadVariantId = (id: string) => parseLongReadVariantId(id) !== null
