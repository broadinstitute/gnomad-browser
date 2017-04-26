import { combineReducers } from 'redux'
import variant from './variant'

const byVariantId = (state = {}, action) => {
  switch (action.type) {
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
    case 'RECEIVE_VARIANT':
      return [...state, action.variantId]
    default:
      return state
  }
}

const variants = combineReducers({
  byVariantId,
  allVariantIds,
})

export default variants

export const getVariant = (state, variantId) =>
  state.byVariantId[variantId]
