import { getAlleleTypeColor, normalizeAlleleTypeToSvClass } from './variantUtils'

export type LongReadVariantType =
  | 'snv'
  | 'ins'
  | 'del'
  | 'dup'
  | 'tr'
  | 'inv'
  | 'mcnv'
  | 'cpx'
  | 'oth'
export type LongReadVariantTypeSelection = LongReadVariantType | 'all'
export type LongReadVariantTypeFilters = Record<LongReadVariantType, boolean>

/**
 * Filter categories shared by the LR-unique density, summary, table, and
 * haplotype tracks. BND and CTX intentionally use OTH because that is how the
 * LR display normalization handles breakends/translocations.
 */
export const LONG_READ_VARIANT_TYPE_OPTIONS: ReadonlyArray<{
  id: LongReadVariantTypeSelection
  label: string
}> = [
  { id: 'all', label: 'All' },
  { id: 'snv', label: 'SNV' },
  { id: 'ins', label: 'INS' },
  { id: 'del', label: 'DEL' },
  { id: 'dup', label: 'DUP' },
  { id: 'tr', label: 'TR' },
  { id: 'inv', label: 'INV' },
  { id: 'mcnv', label: 'MCNV' },
  { id: 'cpx', label: 'CPX' },
  { id: 'oth', label: 'Other / BND / CTX' },
]

const FILTER_TYPE_TO_ALLELE_TYPE: Record<LongReadVariantType, string> = {
  snv: 'snv',
  ins: 'ins',
  del: 'del',
  dup: 'dup',
  tr: 'trv',
  inv: 'inv',
  mcnv: 'mcnv',
  cpx: 'cpx',
  oth: 'oth',
}

export const getLongReadVariantTypeColor = (type: LongReadVariantType): string =>
  getAlleleTypeColor(FILTER_TYPE_TO_ALLELE_TYPE[type])

export const LONG_READ_VARIANT_TYPES = LONG_READ_VARIANT_TYPE_OPTIONS.filter(
  (option): option is { id: LongReadVariantType; label: string } => option.id !== 'all'
).map((option) => option.id)

export const allLongReadVariantTypesSelected = (): LongReadVariantTypeFilters =>
  Object.fromEntries(
    LONG_READ_VARIANT_TYPES.map((type) => [type, true])
  ) as LongReadVariantTypeFilters

export const filtersForLongReadVariantType = (
  selection: LongReadVariantTypeSelection
): LongReadVariantTypeFilters =>
  Object.fromEntries(
    LONG_READ_VARIANT_TYPES.map((type) => [type, selection === 'all' || type === selection])
  ) as LongReadVariantTypeFilters

export const getLongReadVariantType = (alleleType: string): LongReadVariantType => {
  const normalized = (alleleType || '').toLowerCase()
  if (normalized === 'snv') return 'snv'
  if (normalized === 'trv') return 'tr'

  const svClass = normalizeAlleleTypeToSvClass(normalized)
  if (svClass === 'INS') return 'ins'
  if (svClass === 'DEL') return 'del'
  if (svClass === 'DUP') return 'dup'
  if (svClass === 'INV') return 'inv'
  if (svClass === 'MCNV') return 'mcnv'
  if (svClass === 'CPX') return 'cpx'
  return 'oth'
}

export const passesLongReadVariantTypeFilters = (
  alleleType: string,
  filters?: Partial<LongReadVariantTypeFilters>
): boolean => !filters || filters[getLongReadVariantType(alleleType)] !== false

export const selectedLongReadVariantType = (
  filters: Partial<LongReadVariantTypeFilters>
): LongReadVariantTypeSelection | 'custom' => {
  const selected = LONG_READ_VARIANT_TYPES.filter((type) => filters[type] !== false)
  if (selected.length === LONG_READ_VARIANT_TYPES.length) return 'all'
  return selected.length === 1 ? selected[0] : 'custom'
}
