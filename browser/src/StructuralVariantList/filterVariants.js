import { svConsequenceCategories, svConsequenceLabels } from './structuralVariantConsequences'
import { svTypeLabels } from './structuralVariantTypes'

const filterVariants = (variants, filter) => {
  let filteredVariants = variants

  filteredVariants = filteredVariants.filter(v =>
    v.consequence
      ? filter.includeConsequenceCategories[svConsequenceCategories[v.consequence]]
      : filter.includeConsequenceCategories.other
  )

  filteredVariants = filteredVariants.filter(v =>
    filter.includeTypes[v.type] === undefined
      ? filter.includeTypes.OTH
      : filter.includeTypes[v.type]
  )

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
      [v.variant_id, svConsequenceLabels[v.consequence] || '', svTypeLabels[v.type]]
        .map(val => val.toLowerCase())
        .some(val => searchTerms.some(term => val.includes(term)))
    )
  }

  return filteredVariants
}

export default filterVariants
