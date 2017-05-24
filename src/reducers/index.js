import { combineReducers } from 'redux'

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
  if (geneName == 'TTN') {
    return state.variants.variantsByDataSet[datasetId].byVariantId
  }
  return fromVariants.getDatasetVariants(state.variants, variantIds, datasetId)
}

// export const getVariantsInGeneForDataset = (state, geneName, datasetId) => {
//   const variantIds = fromGenes.getAllVariantsInGeneForDataset(state.genes, geneName, datasetId)
//   if (geneName == 'TTN') {
//     return state.variants.variantsByDataSet[datasetId].byVariantId
//   }
//   return fromVariants.getDatasetVariants(state.variants, variantIds, datasetId)
// }
