import { combineReducers } from 'redux'
import { createSelector } from 'reselect'

import selections from './selections'
import table from './table'
import genes, * as fromGenes from './genes'
import variants, * as fromVariants from './variants'
import regions, * as fromRegions from './regions'
import coverage from './coverage'

import * as types from '../constants/actionTypes'

const app = combineReducers({
  selections,
  // regions,
  genes,
  // coverage,
  // variants,
  table,
})

export default app

export const getRegion = (state, regionId) =>
  fromRegions.getRegion(state.regions, regionId)

export const getGene = (state, geneName) =>
  fromGenes.getGene(state.genes, geneName)

export const getVariant = (state, variantId) =>
  fromVariants.getVariant(state.variants, variantId)

export const getAllVariantsAsArray = state =>
  fromVariants.getAllVariantsAsArray(state.variants)

export const getVariantsInGeneForDataset = (state, geneName, datasetId) => {
  const variantIds = fromGenes.getAllVariantsInGeneForDataset(state.genes, geneName, datasetId)
  if (geneName === 'TTN') {
    return state.variants.variantsByDataSet[datasetId].byVariantId
  }
  return fromVariants.getDatasetVariants(state.variants, variantIds, datasetId)
}

const sortVariants = (variants, { key, ascending }) => (
  ascending ?
  variants.sort((a, b) => a[key] - b[key]) :
  variants.sort((a, b) => b[key] - a[key])
)

const getCurrentGene = state => state.selections.currentGene

const getGenes = state => state.genes.byGeneName

const getVariantSort = state => state.table.variantSort

const getVariantFilter = state => state.table.variantFilter

export const getVisibleVariants = createSelector(
  [getCurrentGene, getGenes, getVariantSort, getVariantFilter],
  (currentGene, genesList, variantSort, variantFilter) => {
    console.log(variantFilter)
    if (genesList[currentGene]) {
      if (variantFilter === 'all') {
        return genesList[currentGene].minimal_gnomad_variants
      }
      const filtered = genesList[currentGene].minimal_gnomad_variants.filter((v) => {
        return v.consequence === variantFilter
      })
      // return sortVariants(filtered, variantSort)
      return filtered
    }
  },
)

// export const getVariantsInGeneForDataset = (state, geneName, datasetId) => {
//   const variantIds = fromGenes.getAllVariantsInGeneForDataset(state.genes, geneName, datasetId)
//   if (geneName == 'TTN') {
//     return state.variants.variantsByDataSet[datasetId].byVariantId
//   }
//   return fromVariants.getDatasetVariants(state.variants, variantIds, datasetId)
// }
