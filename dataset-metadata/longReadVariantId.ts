export type LongReadVariantId = {
  chrom: string
  pos: number
  ref?: string
  alt?: string
  alleleType?: string
  alleleLength?: number
  provenance?: number
}

const LONG_READ_VARIANT_ID =
  /^(?:chr)?([1-9]|1\d|2[0-2]|X|Y)-(\d+)-(?:([ACGTN]+)-([ACGTN]+)|([A-Z]+)(?:-(\d+))?)(?:~(\d+))?$/i

/**
 * Parse an ID used by the long-read tables.
 *
 * LR data contains ordinary sequence IDs as well as compact symbolic IDs. Both
 * forms may retain the source VCF's chr prefix and provenance suffix.
 */
export const parseLongReadVariantId = (id: string): LongReadVariantId | null => {
  const match = LONG_READ_VARIANT_ID.exec(id)
  if (!match) return null

  const [, chrom, pos, ref, alt, alleleType, alleleLength, provenance] = match
  return {
    chrom,
    pos: Number(pos),
    ...(ref ? { ref: ref.toUpperCase(), alt: alt.toUpperCase() } : {}),
    ...(alleleType ? { alleleType: alleleType.toLowerCase() } : {}),
    ...(alleleLength ? { alleleLength: Number(alleleLength) } : {}),
    ...(provenance ? { provenance: Number(provenance) } : {}),
  }
}

export const isLongReadVariantId = (id: string) => parseLongReadVariantId(id) !== null
