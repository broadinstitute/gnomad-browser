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

const currentVariant = (state = '', action) => {
  switch (action.type) {
    case 'SET_CURRENT_VARIANT':
      return action.variantId
    default:
      return state
  }
}

const currentNavigatorPosition = (state = 0, action) => {
  switch (action.type) {
    case 'SET_NAVIGATION_POSITION':
      return action.navigationPosition
    default:
      return state
  }
}

const selections = combineReducers({
  currentNavigatorPosition,
  currentVariant,
  currentGene,
})

export default selections
