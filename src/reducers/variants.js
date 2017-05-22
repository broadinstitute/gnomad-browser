/* eslint-disable no-case-declarations */

import { combineReducers } from 'redux'

import * as types from '../constants/actionTypes'
import variant from './variant'

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

const byVariantId = (state = {}, action) => {
  switch (action.type) {
    case types.REQUEST_REGION_DATA:
      // hack
      return {}
    case types.RECEIVE_REGION_DATA:
      const { variants } = action.regionData
      const byId = variants.reduce((acc, v) => ({
        ...acc,
        [v.variant_id]: { ...v },
      }), {})
      return {
        ...state,
        ...byId,
      }
    case 'RECEIVE_VARIANT':
      return {
        ...state,
        [action.variantId]: variant(state[action.variantId], action),
      }
    default:
      return state
  }
}

const allVariantIds = (state = [], action) => {
  switch (action.type) {
    case types.REQUEST_REGION_DATA:
      // hack
      return []
    case types.RECEIVE_REGION_DATA:
      const { variants } = action.regionData
      return variants.map(v => v.variant_id)
    case 'RECEIVE_VARIANT':
      return [...state, action.variantId]
    default:
      return state
  }
}

const variants = combineReducers({
  status,
  byVariantId,
  allVariantIds,
})

export default variants

export const getVariant = (state, variantId) =>
  state.byVariantId[variantId]

export const getAllVariantsAsArray = state =>
  state.allVariantIds.map(id => state.byVariantId[id])
