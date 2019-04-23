import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '@broad/utilities'

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

  if (filter.onlyDeNovo) {
    filteredVariants = filteredVariants.filter(v => v.n_denovos > 0)
  }

  if (filter.onlyInAnalysis) {
    filteredVariants = filteredVariants.filter(v => v.in_analysis)
  }

  if (filter.searchText) {
    const query = filter.searchText.toLowerCase()
    filteredVariants = filteredVariants.filter(
      v =>
        v.variant_id.toLowerCase().includes(query) ||
        (getLabelForConsequenceTerm(v.consequence) || '').toLowerCase().includes(query) ||
        (v.hgvsc_canonical || '').toLowerCase().includes(query) ||
        (v.hgvsp_canonical || '').toLowerCase().includes(query)
    )
  }

  return filteredVariants
}

export default filterVariants
