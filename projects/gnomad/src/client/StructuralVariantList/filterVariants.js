import { svConsequenceCategories, svConsequenceLabels } from './structuralVariantConsequences'
import { svTypeLabels } from './structuralVariantTypes'

const filterVariants = (variants, filter) => {
  let filteredVariants = variants

  filteredVariants = filteredVariants.filter(
    v =>
      v.consequence
        ? filter.includeConsequenceCategories[svConsequenceCategories[v.consequence]]
        : filter.includeConsequenceCategories.other
  )

  filteredVariants = filteredVariants.filter(
    v =>
      filter.includeTypes[v.type] === undefined
        ? filter.includeTypes.OTH
        : filter.includeTypes[v.type]
  )

  if (!filter.includeFilteredVariants) {
    filteredVariants = filteredVariants.filter(v => v.filters.length === 0)
  }

  if (filter.searchText) {
    const query = filter.searchText.toLowerCase()
    filteredVariants = filteredVariants.filter(
      v =>
        v.variant_id.toLowerCase().includes(query) ||
        (svConsequenceLabels[v.consequence] || '').toLowerCase().includes(query) ||
        svTypeLabels[v.type].toLowerCase().includes(query)
    )
  }

  return filteredVariants
}

export default filterVariants
