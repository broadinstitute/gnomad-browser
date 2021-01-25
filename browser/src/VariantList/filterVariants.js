import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'

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
    const searchTerms = filter.searchText
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    filteredVariants = filteredVariants.filter(v =>
      [
        v.variant_id,
        v.rsid,
        getLabelForConsequenceTerm(v.consequence),
        v.hgvs,
        v.clinical_significance,
      ]
        .filter(Boolean)
        .map(val => val.toLowerCase())
        .some(val => searchTerms.some(term => val.includes(term)))
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
