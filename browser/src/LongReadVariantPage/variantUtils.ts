/**
 * Shared variant classification and color utilities for LR variant views.
 * Single source of truth for the 5-category system used by both
 * Summary and Haplotype views.
 */

export type VariantCategory = 'snv' | 'deletion' | 'insertion' | 'sv' | 'tr'

/**
 * Map raw allele_type strings (11 values in DB) to 5 display categories.
 * Used by variant tracks, tables, and DeckGL rendering.
 */
export const getVariantCategory = (
  alleleType: string,
  length?: number | null
): VariantCategory => {
  const t = alleleType.toLowerCase()
  if (t === 'trv') return 'tr'
  if (t === 'snv') return 'snv'
  if (t === 'ins' || t === 'alu_ins' || t === 'sva_ins' || t === 'numt') {
    return length != null && Math.abs(length) >= 50 ? 'sv' : 'insertion'
  }
  if (t === 'del' || t === 'alu_del' || t === 'line_del' || t === 'sva_del') {
    return 'deletion'
  }
  // dup, dup_interspersed, complex_dup, inv_dup, inv, etc.
  return 'sv'
}

export const VARIANT_CATEGORY_COLORS: Record<VariantCategory, string> = {
  snv: '#4A90D9',
  deletion: '#D73027',
  insertion: '#43A047',
  sv: '#9467BD',
  tr: '#E8A838',
}

/**
 * Labels for the 5-category filter UI.
 */
export const VARIANT_CATEGORY_LABELS: Record<VariantCategory, string> = {
  snv: 'SNV',
  deletion: 'Deletion',
  insertion: 'Insertion',
  sv: 'SV',
  tr: 'TR',
}

/**
 * Band assignment for summary variant track (3 bands: snv, sv, tr).
 * Small insertions/deletions go into the SNV band; large ones go to SV.
 */
export type Band = 'snv' | 'sv' | 'tr'

/**
 * LOD visibility thresholds based on genomic region size.
 * At larger scales, SNVs become sub-pixel noise and are replaced by a density track.
 */
export type LodVisibility = {
  showSnvs: boolean
  showSmallIndels: boolean
  showDensityTrack: boolean
}

export const getLodVisibility = (regionSize: number): LodVisibility => ({
  showSnvs: regionSize < 50_000,
  showSmallIndels: regionSize < 200_000,
  showDensityTrack: regionSize >= 50_000,
})

export const assignBand = (alleleType: string, length?: number | null): Band => {
  const cat = getVariantCategory(alleleType, length)
  if (cat === 'tr') return 'tr'
  if (cat === 'snv') return 'snv'
  if (cat === 'insertion' || cat === 'deletion') {
    return length != null && Math.abs(length) >= 50 ? 'sv' : 'snv'
  }
  return 'sv'
}
