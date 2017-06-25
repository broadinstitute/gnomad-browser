import { createSelector } from 'reselect'

const sortVariants = (variants, { key, ascending }) => (
  ascending ?
  variants.sort((a, b) => a[key] - b[key]) :
  variants.sort((a, b) => b[key] - a[key])
)

const getCurrentGene = state => state.active.currentGene

const getGenes = state => state.genes.byGeneName

export const getGene = createSelector(
  [getGenes, getCurrentGene],
  (genes, currentGene) => genes[currentGene],
)

const getVariantSort = state => state.table.variantSort

const getVariantFilter = state => state.table.variantFilter

export const getVisibleVariants = createSelector(
  [getCurrentGene, getGenes, getVariantSort, getVariantFilter],
  (currentGene, genesList, variantSort, variantFilter) => {
    if (genesList[currentGene]) {
      if (variantFilter === 'all') {
        return genesList[currentGene].minimal_gnomad_variants
      }
      const filtered = genesList[currentGene].minimal_gnomad_variants.filter((v) => {
        return v.consequence === variantFilter
      })
      return sortVariants(filtered, variantSort)
    }
    return []
  },
)
