import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'

const filterMitochondrialVariants = (variants, filter) => {
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
    const searchTerms = filter.searchText
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    filteredVariants = filteredVariants.filter(v =>
      [v.variant_id, v.rsid, getLabelForConsequenceTerm(v.consequence), v.hgvsp || v.hgvsc]
        .filter(Boolean)
        .map(val => val.toLowerCase())
        .some(val => searchTerms.some(term => val.includes(term)))
    )
  }

  return filteredVariants
}

export default filterMitochondrialVariants
