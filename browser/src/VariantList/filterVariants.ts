import { Variant } from '../VariantPage/VariantPage'
import { getCategoryFromConsequence } from '../vepConsequences'
import { VariantTableColumn } from './variantTableColumns'

type Categories = {
  lof: boolean
  missense: boolean
  synonymous: boolean
  other: boolean
}

export type VariantFilterState = {
  includeCategories: Categories
  includeFilteredVariants: boolean
  includeSNVs: boolean
  includeIndels: boolean
  includeExomes: boolean
  includeGenomes: boolean
  includeLongReads: boolean
  includeContext: boolean
  searchText: string
}

export function getFilteredVariants(
  filter: VariantFilterState,
  variants: Variant[],
  variantTableColumns: VariantTableColumn[]
) {
  const searchColumns = variantTableColumns.filter((column) => !!column.getSearchTerms)
  const getVariantSearchTerms = (variant: Variant) =>
    searchColumns
      .flatMap((column) => {
        if (column.getSearchTerms) {
          return column.getSearchTerms(variant)
        }
        return []
      })
      .filter(Boolean)
      .map((s: any) => s.toLowerCase())

  const searchTerms = filter.searchText
    .toLowerCase()
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)

  return variants.filter((variant: Variant) =>
    getVariantSearchTerms(variant).some((variantTerm: string) =>
      searchTerms.some((searchTerm: string) => variantTerm.includes(searchTerm))
    )
  )
}

const filterVariants = (
  variants: Variant[],
  filter: VariantFilterState,
  selectedColumns: any
): Variant[] => {
  let filteredVariants = variants

  const isEveryConsequenceCategorySelected =
    filter.includeCategories.lof &&
    filter.includeCategories.missense &&
    filter.includeCategories.synonymous &&
    filter.includeCategories.other

  if (!isEveryConsequenceCategorySelected) {
    filteredVariants = variants.filter((variant: any) => {
      const category =
        (getCategoryFromConsequence(variant.consequence) as keyof Categories) || 'other'
      return filter.includeCategories[category]
    })
  }

  if (!filter.includeFilteredVariants) {
    filteredVariants = filteredVariants.map((v: any) => ({
      ...v,
      exome: v.exome && v.exome.filters && v.exome.filters.length === 0 ? v.exome : null,
      genome: v.genome && v.genome.filters && v.genome.filters.length === 0 ? v.genome : null,
      long_read:
        v.long_read && (!v.long_read.filters || v.long_read.filters.length === 0) ? v.long_read : null,
      long_read_details:
        v.long_read && (!v.long_read.filters || v.long_read.filters.length === 0) ? v.long_read_details : null,
    }))
  }

  if (!filter.includeExomes) {
    filteredVariants = filteredVariants.map((v: any) => ({
      ...v,
      exome: null,
    }))
  }

  if (!filter.includeGenomes) {
    filteredVariants = filteredVariants.map((v: any) => ({
      ...v,
      genome: null,
    }))
  }

  if (!filter.includeLongReads) {
    filteredVariants = filteredVariants.map((v: any) => ({
      ...v,
      long_read: null,
      long_read_details: null,
    }))
  }

  filteredVariants = filteredVariants.filter(
    (v: any) => v.exome || v.genome || v.long_read
  )

  if (filter.searchText && !filter.includeContext) {
    filteredVariants = getFilteredVariants(filter, filteredVariants, selectedColumns)
  }

  // Indel and Snp filters.
  filteredVariants = filteredVariants.filter((v: any) => {
    const splits = v.variant_id.split('-')
    const ref = splits[2]
    const alt = splits[3]

    // TRV/STR variants (e.g. 22-20277853-TRV-14) are treated as indels
    if (ref === 'TRV' || (v.long_read_details && v.long_read_details.is_likely_tr)) {
      return filter.includeIndels
    }

    const refLength = ref.length
    const altLength = alt.length

    const isSNV = refLength === 1 && altLength === 1
    const isIndel = refLength !== altLength

    return (filter.includeSNVs && isSNV) || (filter.includeIndels && isIndel)
  })

  return filteredVariants
}

export default filterVariants
