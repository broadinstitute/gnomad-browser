// @flow
/* eslint-disable space-before-function-paren */
/* eslint-disable comma-dangle */

import Immutable from 'immutable'
import keymirror from 'keymirror'

// HACK
const getDefaultsForProject = (env) => {
  switch (env) {
    case 'gnomad':
      return { startingGene: 'USH2A', padding: 75 }
    case 'schizophrenia':
      return { startingGene: 'GRIN2A', padding: 10000 }
    case 'dblof':
      return { startingGene: 'CFTR', padding: 75 }
    default:
      return { startingGene: 'CFTR', padding: 75 }
  }
}

const State = Immutable.Record({
  currentGene: getDefaultsForProject(process.env.FETCH_FUNCTION).startingGene,
  currentVariant: '',
  currentNavigatorPosition: 0,
  currentTableIndex: 0,
  exonPadding: getDefaultsForProject(process.env.FETCH_FUNCTION).padding
})

export const types = keymirror({
  SET_CURRENT_GENE: null,
  SET_CURRENT_VARIANT: null,
  SET_CURRENT_NAVIGATOR_POSITION: null,
  SET_CURRENT_TABLE_INDEX: null,
  SET_EXON_PADDING: null,
  ORDER_VARIANTS_BY_POSITION: null,
})

export const actions = {
  setCurrentGene: geneName => ({ type: types.SET_CURRENT_GENE, geneName }),
  setCurrentVariant: variantId => ({ type: types.SET_CURRENT_VARIANT, variantId }),

  setNavigatorPosition: navigatorPosition => ({
    type: types.SET_CURRENT_NAVIGATOR_POSITION,
    navigatorPosition,
    meta: {
      throttle: true,
    },
  }),

  setCurrentTableIndex: tableIndex => ({
    type: types.SET_CURRENT_TABLE_INDEX,
    tableIndex,
    meta: {
      throttle: true,
    },
  }),

  setExonPadding: padding => ({ type: types.SET_EXON_PADDING, padding }),

  onNavigatorClick (tableIndex, position) {
    return (dispatch) => {
      dispatch({ type: types.ORDER_VARIANTS_BY_POSITION })
      dispatch(actions.setCurrentTableIndex(tableIndex))
      dispatch(actions.setNavigatorPosition(position))
    }
  }
}

const actionHandlers = {
  [types.SET_CURRENT_GENE] (state, { geneName }) {
    return state.set('currentGene', geneName)
  },
  [types.SET_CURRENT_VARIANT] (state, { variantId }) {
    return state.set('currentVariant', variantId)
  },
  [types.SET_CURRENT_NAVIGATOR_POSITION] (state, { navigatorPosition }) {
    return state.set('currentNavigatorPosition', navigatorPosition)
  },
  [types.SET_CURRENT_TABLE_INDEX] (state, { tableIndex }) {
    return state.set('currentTableIndex', tableIndex)
  },
  [types.SET_EXON_PADDING] (state, { padding }) {
    return state.set('exonPadding', padding)
  },
}

export const currentGene = state => state.active.currentGene
export const currentVariant = state => state.active.currentVariant
export const currentNavigatorPosition = state => state.active.currentNavigatorPosition
export const currentTableIndex = state => state.active.currentTableIndex
export const exonPadding = state => state.active.exonPadding

export default function reducer (state = new State(), action: Object): State {
  const { type } = action
  if (type in actionHandlers) {
    return actionHandlers[type](state, action)
  }
  return state
}
