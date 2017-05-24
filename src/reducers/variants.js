/* eslint-disable no-case-declarations */

import { combineReducers } from 'redux'

import * as types from '../constants/actionTypes'

const status = (state = {
  isFetching: false,
  hasData: false,
}, action) => {
  switch (action.type) {
    case types.REQUEST_REGION_DATA:
      return { ...state, isFetching: true, hasData: false }
    case types.RECEIVE_REGION_DATA:
      return { ...state, isFetching: false, hasData: true }
    default:
      return state
  }
}

const byVariantId = (state = {}, action, datasetId) => {
  switch (action.type) {
    case types.RECEIVE_GENE_DATA:
      console.log(datasetId)
      const variants = action.geneData[datasetId]
      const byId = variants.reduce((acc, v) => ({
        ...acc,
        [v.variant_id]: { ...v },
      }), {})
      return {
        ...state,
        ...byId,
      }

    default:
      return state
  }
}

const allVariantIds = (state = [], action, datasetId) => {
  switch (action.type) {
    case types.RECEIVE_GENE_DATA:
      return [
        ...state,
        ...action.geneData[datasetId].map(v => v.variant_id),
      ]
    default:
      return state
  }
}

const dataset = (state = {}, action, datasetId) => {
  switch (action.type) {
    case types.RECEIVE_GENE_DATA:
      return {
        ...state,
        byVariantId: byVariantId(state[byVariantId], action, datasetId),
        allVariantIds: allVariantIds(state[allVariantIds], action, datasetId),
      }
    default:
      return state
  }
}

const variantsByDataset = (state = {}, action) => {
  switch (action.type) {
    case types.RECEIVE_GENE_DATA:
      const { datasets } = action
      return {
        ...state,
        ...datasets.reduce((acc, datasetId) =>
          ({ [datasetId]: dataset(state[datasetId], action, datasetId) }), {}),
      }
    default:
      return state
  }
}

const variants = combineReducers({
  status,
  variantsByDataset,
})

export default variants

export const getVariant = (state, variantId) =>
  state.byVariantId[variantId]

export const getAllVariantsAsArray = state =>
  state.allVariantIds.map(id => state.byVariantId[id])
