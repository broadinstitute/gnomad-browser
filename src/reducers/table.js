import { combineReducers } from 'redux'
import * as types from '../constants/actionTypes'

const variantSort = (state = { key: 'pos', ascending: true }, action) => {
  switch (action.type) {
    case types.SET_VARIANT_SORT:
      if (action.key === state.key) {
        return { ...state, ascending: !state.ascending }
      }
      return { ...state, key: action.key }
    case types.ORDER_VARIANTS_BY_POSITION:
      return { ...state, key: 'pos', ascending: true }
    default:
      return state
  }
}

const visibleInTable = (state = [0, 15], action) => {
  switch (action.type) {
    case types.SET_VISIBLE_IN_TABLE:
      const [min, max] = state
      if (min < 0 || max < 0) {
        return [0, 15]
      }
      return action.range
    default:
      return state
  }
}

const table = combineReducers({
  variantSort,
  visibleInTable,
})

export default table
