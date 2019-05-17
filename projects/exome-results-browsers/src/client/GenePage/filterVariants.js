import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '@broad/utilities'

import browserConfig from '@browser/config'

const filterVariants = (variants, filter) => {
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

  if (filter.onlyInAnalysis) {
    filteredVariants = filteredVariants.filter(v => v.in_analysis)
  }

  ;(browserConfig.variants.filters || [])
    .filter(f => filter.browserFilters[f.id])
    .forEach(f => {
      filteredVariants = filteredVariants.filter(f.filter)
    })

  if (filter.searchText) {
    const query = filter.searchText.toLowerCase()
    filteredVariants = filteredVariants.filter(
      v =>
        v.variant_id.toLowerCase().includes(query) ||
        (getLabelForConsequenceTerm(v.consequence) || '').toLowerCase().includes(query) ||
        (v.hgvsc || '').toLowerCase().includes(query) ||
        (v.hgvsp || '').toLowerCase().includes(query)
    )
  }

  return filteredVariants
}

export default filterVariants
