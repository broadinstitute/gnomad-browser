/**
 * Shared variant classification and color utilities for LR variant views.
 * Single source of truth for the 5-category system used by both
 * Summary and Haplotype views.
 */

export type VariantCategory = 'snv' | 'deletion' | 'insertion' | 'sv' | 'tr'

/**
 * Normalize spelling/case aliases emitted by LR data sources. Legacy
 * haplotype payloads use `SNP`, while summary and Y1 payloads use `snv`.
 */
export const normalizeLongReadAlleleType = (alleleType: string): string => {
  const normalized = (alleleType || '').trim().toLowerCase()
  return normalized === 'snp' ? 'snv' : normalized
}

const DELETION_ALLELE_TYPES = new Set([
  'del', 'deletion',
  'alu_del', 'alu_deletion',
  'line_del', 'line_deletion',
  'sva_del', 'sva_deletion',
])

export const isDeletionAlleleType = (alleleType: string) =>
  DELETION_ALLELE_TYPES.has(normalizeLongReadAlleleType(alleleType))

/**
 * Map raw allele_type strings (11 values in DB) to 5 display categories.
 * Used by variant tracks, tables, and DeckGL rendering.
 */
export const getVariantCategory = (
  alleleType: string,
  _length?: number | null
): VariantCategory => {
  const t = normalizeLongReadAlleleType(alleleType)
  if (t === 'trv') return 'tr'
  if (t === 'snv') return 'snv'
  if (t === 'ins' || t === 'insertion' || t === 'alu_ins' || t === 'line_ins' || t === 'sva_ins' || t === 'numt') {
    return 'insertion'
  }
  if (isDeletionAlleleType(t)) return 'deletion'
  // dup, dup_interspersed, complex_dup, inv_dup, inv, etc.
  return 'sv'
}

export const GNOMAD_SV_CLASS_COLORS = {
  DEL: '#D43925',
  DUP: '#2376B2',
  MCNV: '#7459B2',
  INS: '#D474E0',
  INV: '#FA931E',
  CPX: '#71E38C',
  OTH: '#397246',
} as const

export type GnomadSvClass = keyof typeof GNOMAD_SV_CLASS_COLORS

const ALLELE_TYPE_TO_SV_CLASS: Record<string, GnomadSvClass> = {
  del: 'DEL',
  deletion: 'DEL',
  alu_del: 'DEL',
  alu_deletion: 'DEL',
  line_del: 'DEL',
  line_deletion: 'DEL',
  sva_del: 'DEL',
  sva_deletion: 'DEL',
  dup: 'DUP',
  duplication: 'DUP',
  dup_interspersed: 'DUP',
  mcnv: 'MCNV',
  cnv: 'MCNV',
  ins: 'INS',
  insertion: 'INS',
  alu_ins: 'INS',
  line_ins: 'INS',
  sva_ins: 'INS',
  numt: 'INS',
  inv: 'INV',
  inversion: 'INV',
  complex_dup: 'CPX',
  inv_dup: 'CPX',
  cpx: 'CPX',
  complex: 'CPX',
  oth: 'OTH',
  other: 'OTH',
  bnd: 'OTH',
  ctx: 'OTH',
}

export const normalizeAlleleTypeToSvClass = (alleleType: string): GnomadSvClass | null =>
  ALLELE_TYPE_TO_SV_CLASS[normalizeLongReadAlleleType(alleleType)] || null

export const VARIANT_CATEGORY_COLORS: Record<VariantCategory, string> = {
  snv: '#4A90D9',
  deletion: GNOMAD_SV_CLASS_COLORS.DEL,
  insertion: GNOMAD_SV_CLASS_COLORS.INS,
  sv: GNOMAD_SV_CLASS_COLORS.OTH,
  tr: '#E8A838',
}

/**
 * Per-allele_type colors for raw LR types and accepted browser aliases.
 * Shape/geometry decisions still use getVariantCategory() → 5 categories.
 */
export const ALLELE_TYPE_COLORS = Object.keys(ALLELE_TYPE_TO_SV_CLASS).reduce<Record<string, string>>(
  (colors, alleleType) => ({
    ...colors,
    [alleleType]: GNOMAD_SV_CLASS_COLORS[ALLELE_TYPE_TO_SV_CLASS[alleleType]],
  }),
  { snv: VARIANT_CATEGORY_COLORS.snv, trv: VARIANT_CATEGORY_COLORS.tr }
)

export const getAlleleTypeColor = (alleleType: string): string => {
  const normalized = normalizeLongReadAlleleType(alleleType)
  return ALLELE_TYPE_COLORS[normalized] || GNOMAD_SV_CLASS_COLORS.OTH
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
export type Band = 'snv' | 'ins' | 'del' | 'dup' | 'sv' | 'tr'

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
  if (cat === 'insertion') return 'ins'
  if (cat === 'deletion') return 'del'
  const t = normalizeLongReadAlleleType(alleleType)
  if (t === 'dup' || t === 'dup_interspersed' || t === 'complex_dup' || t === 'inv_dup') return 'dup'
  return 'sv' // inv, other SVs
}
