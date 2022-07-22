import { getCategoryFromConsequence } from '../vepConsequences'

const filterMitochondrialVariants = (variants: any, filter: any, selectedColumns: any) => {
  let filteredVariants = variants

  const isEveryConsequenceCategorySelected =
    filter.includeCategories.lof &&
    filter.includeCategories.missense &&
    filter.includeCategories.synonymous &&
    filter.includeCategories.other

  if (!isEveryConsequenceCategorySelected) {
    filteredVariants = variants.filter((variant: any) => {
      const category = getCategoryFromConsequence(variant.consequence) || 'other'
      return filter.includeCategories[category]
    })
  }

  if (!filter.includeFilteredVariants) {
    filteredVariants = filteredVariants.filter((v: any) => v.filters.length === 0)
  }

  if (filter.searchText) {
    const searchColumns = selectedColumns.filter((column: any) => !!column.getSearchTerms)
    const getVariantSearchTerms = (variant: any) =>
      searchColumns
        .flatMap((column: any) => column.getSearchTerms(variant))
        .filter(Boolean)
        .map((s: any) => s.toLowerCase())

    const searchTerms = filter.searchText
      .toLowerCase()
      .split(',')
      .map((s: any) => s.trim())
      .filter((s: any) => s.length > 0)

    filteredVariants = filteredVariants.filter((variant: any) =>
      getVariantSearchTerms(variant).some((variantTerm: any) =>
        searchTerms.some((searchTerm: any) => variantTerm.includes(searchTerm))
      )
    )
  }

  return filteredVariants
}

export default filterMitochondrialVariants
