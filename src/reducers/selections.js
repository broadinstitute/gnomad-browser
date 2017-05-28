import { combineReducers } from 'redux'
import * as types from '../constants/actionTypes'

const currentGene = (state = 'BRCA2', action) => {
  switch (action.type) {
    case types.SET_CURRENT_GENE:
      return action.geneName
    default:
      return state
  }
}

const currentVariant = (state = '', action) => {
  switch (action.type) {
    case types.SET_CURRENT_VARIANT:
      return action.variantId
    default:
      return state
  }
}

const currentNavigatorPosition = (state = 0, action) => {
  switch (action.type) {
    case types.SET_CURRENT_NAVIGATOR_POSITION:
      return action.navigatorPosition
    default:
      return state
  }
}

const currentTableIndex = (state = 0, action) => {
  switch (action.type) {
    case types.SET_CURRENT_TABLE_INDEX:
      return action.tableIndex
    default:
      return state
  }
}

const exonPadding = (state = 75, action) => {
  switch (action.type) {
    case types.SET_EXON_PADDING:
      return action.padding
    default:
      return state
  }
}

const selections = combineReducers({
  currentNavigatorPosition,
  currentTableIndex,
  currentVariant,
  currentGene,
  exonPadding,
})

export default selections
