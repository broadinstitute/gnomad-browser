import { combineReducers } from 'redux'
import * as types from '../constants/actionTypes'

const currentGene = (state = 'BRCA2', action) => {
  switch (action.type) {
    case 'SET_CURRENT_GENE':
      return action.geneName
    default:
      return state
  }
}

const variantSort = (state = { key: 'pos', ascending: true }, action) => {
  switch (action.type) {
    case types.SET_VARIANT_SORT:
      if (action.key === state.key) {
        return { ...state, ascending: !state.ascending }
      }
      return { ...state, key: action.key }
    default:
      return state
  }
}

const selections = combineReducers({
  currentGene,
  variantSort,
})

export default selections
