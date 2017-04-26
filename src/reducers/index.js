import { combineReducers } from 'redux'

import selections from './selections'
import genes, * as fromGenes from './genes'
import variants, * as fromVariants from './variants'
import regions, * as fromRegions from './regions'

import * as types from '../constants/actionTypes'

const message = (state = 'Hello', action) => {
  console.log(action.type)
  switch (action.type) {
    case types.UPDATE_MESSAGE:
      return action.message
    default:
      return state
  }
}

const app = combineReducers({
  selections,
  regions,
  genes,
  variants,
  message,
})

export default app

export const getRegion = (state, regionId) =>
  fromRegions.getRegion(state.regions, regionId)

export const getGene = (state, geneName) =>
  fromGenes.getGene(state.genes, geneName)

export const getVariant = (state, variantId) =>
  fromVariants.getVariant(state.variants, variantId)
