import R from 'ramda'
import { combineReducers } from 'redux'

import * as geneTypes from '../constants/actionTypes'
import gene from './gene'

const isFetching = (state = false, action) => {
  switch (action.type) {
    case geneTypes.REQUEST_GENE_DATA:
      return true
    case geneTypes.RECEIVE_GENE_DATA:
      return false
    default:
      return state
  }
}

const byGeneName = (state = {}, action) => {
  switch (action.type) {
    case geneTypes.RECEIVE_GENE_DATA:
      return {
        ...state,
        [action.geneName]: gene(state[action.geneName], action),
      }
    default:
      return state
  }
}

const allGeneNames = (state = [], action) => {
  switch (action.type) {
    case geneTypes.RECEIVE_GENE_DATA:
      return R.uniq([...state, action.geneName])
    default:
      return state
  }
}

const genes = combineReducers({
  isFetching,
  byGeneName,
  allGeneNames,
})

export default genes

export const getGene = (state, geneName) => state.byGeneName[geneName]

export const getAllVariantsInGeneForDataset = (state, geneName, datasetId) => {
  return state.byGeneName[geneName].variantIdsByDataset[datasetId]
}

