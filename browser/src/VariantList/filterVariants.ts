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

const filterVariants = (variants: Variant[], filter: VariantFilterState, selectedColumns: any) => {
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
    filteredVariants = filteredVariants.map((v: Variant) => ({
      ...v,
      exome: v.exome && v.exome.filters.length === 0 ? v.exome : null,
      genome: v.genome && v.genome.filters.length === 0 ? v.genome : null,
    }))
  }

  if (!filter.includeExomes) {
    filteredVariants = filteredVariants.map((v: Variant) => ({
      ...v,
      exome: null,
    }))
  }

  if (!filter.includeGenomes) {
    filteredVariants = filteredVariants.map((v: Variant) => ({
      ...v,
      genome: null,
    }))
  }

  filteredVariants = filteredVariants.filter((v: Variant) => v.exome || v.genome)

  if (filter.searchText && !filter.includeContext) {
    filteredVariants = getFilteredVariants(filter, variants, selectedColumns)
  }

  // Indel and Snp filters.
  filteredVariants = filteredVariants.filter((v: Variant) => {
    const splits = v.variant_id.split('-')
    // ref and alt are extracted from variant id.
    const refLength = splits[2].length
    const altLength = splits[3].length

    const isSNV = refLength === 1 && altLength === 1
    const isIndel = refLength !== altLength

    return (filter.includeSNVs && isSNV) || (filter.includeIndels && isIndel)
  })

  return filteredVariants
}

export default filterVariants
