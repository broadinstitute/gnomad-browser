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

  if (!filter.includeFilteredVariants) {
    filteredVariants = filteredVariants.map(v => ({
      ...v,
      exome: v.exome && v.exome.filters.length === 0 ? v.exome : null,
      genome: v.genome && v.genome.filters.length === 0 ? v.genome : null,
    }))
  }

  if (!filter.includeExomes) {
    filteredVariants = filteredVariants.map(v => ({ ...v, exome: null }))
  }

  if (!filter.includeGenomes) {
    filteredVariants = filteredVariants.map(v => ({ ...v, genome: null }))
  }

  filteredVariants = filteredVariants.filter(v => v.exome || v.genome)

  if (filter.searchText) {
    const query = filter.searchText.toLowerCase()
    filteredVariants = filteredVariants.filter(
      v =>
        v.variant_id.toLowerCase().includes(query) ||
        (v.rsid || '').toLowerCase().includes(query) ||
        getLabelForConsequenceTerm(v.consequence)
          .toLowerCase()
          .includes(query) ||
        (v.hgvs || '').toLowerCase().includes(query)
    )
  }

  // Indel and Snp filters.
  filteredVariants = filteredVariants.filter(v => {
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
