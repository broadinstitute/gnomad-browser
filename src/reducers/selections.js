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

const selections = combineReducers({
  currentGene,
})

export default selections
