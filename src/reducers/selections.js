import { combineReducers } from 'redux'

const currentGene = (state = 'PCSK9', action) => {
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
