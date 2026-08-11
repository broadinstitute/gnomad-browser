type VariantWithId = { variant_id: string }

type VariantSet = { variants?: VariantWithId[] | null }

type HaplotypeLikeRow = {
  variants?: VariantSet | null
  haplotypeA?: VariantSet | null
  haplotypeB?: VariantSet | null
}

export const variantsForHaplotypeRow = (row: HaplotypeLikeRow): VariantWithId[] => {
  if (row.haplotypeA || row.haplotypeB) {
    return [
      ...(row.haplotypeA?.variants || []),
      ...(row.haplotypeB?.variants || []),
    ]
  }
  return row.variants?.variants || []
}

export const countVariantLociAcrossHaplotypeRows = (
  rows: HaplotypeLikeRow[]
): Map<string, number> => {
  const counts = new Map<string, number>()
  rows.forEach((row) => {
    variantsForHaplotypeRow(row).forEach((variant) => {
      counts.set(variant.variant_id, (counts.get(variant.variant_id) || 0) + 1)
    })
  })
  return counts
}
