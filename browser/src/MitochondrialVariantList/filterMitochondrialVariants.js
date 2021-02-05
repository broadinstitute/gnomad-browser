import { getCategoryFromConsequence } from '../vepConsequences'

const filterMitochondrialVariants = (variants, filter, selectedColumns) => {
  let filteredVariants = variants

  const isEveryConsequenceCategorySelected =
    filter.includeCategories.lof &&
    filter.includeCategories.missense &&
    filter.includeCategories.synonymous &&
    filter.includeCategories.other

  if (!isEveryConsequenceCategorySelected) {
    filteredVariants = variants.filter(variant => {
      const category = getCategoryFromConsequence(variant.consequence) || 'other'
      return filter.includeCategories[category]
    })
  }

  if (!filter.includeFilteredVariants) {
    filteredVariants = filteredVariants.filter(v => v.filters.length === 0)
  }

  if (filter.searchText) {
    const searchColumns = selectedColumns.filter(column => !!column.getSearchTerms)
    const getVariantSearchTerms = variant =>
      searchColumns
        .flatMap(column => column.getSearchTerms(variant))
        .filter(Boolean)
        .map(s => s.toLowerCase())

    const searchTerms = filter.searchText
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    filteredVariants = filteredVariants.filter(variant =>
      getVariantSearchTerms(variant).some(variantTerm =>
        searchTerms.some(searchTerm => variantTerm.includes(searchTerm))
      )
    )
  }

  return filteredVariants
}

export default filterMitochondrialVariants
