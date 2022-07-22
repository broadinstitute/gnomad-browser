import { getCategoryFromConsequence } from '../vepConsequences'

const filterVariants = (variants: any, filter: any, selectedColumns: any) => {
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
    filteredVariants = filteredVariants.map((v: any) => ({
      ...v,
      exome: v.exome && v.exome.filters.length === 0 ? v.exome : null,
      genome: v.genome && v.genome.filters.length === 0 ? v.genome : null,
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

  filteredVariants = filteredVariants.filter((v: any) => v.exome || v.genome)

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

  // Indel and Snp filters.
  filteredVariants = filteredVariants.filter((v: any) => {
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
