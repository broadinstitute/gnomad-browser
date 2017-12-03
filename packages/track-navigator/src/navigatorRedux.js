// @flow

import Immutable from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'

import {
  types as variantTypes,
  allVariantsInCurrentDatasetAsList,
} from '@broad/redux-variants'
import { actions as tableActions } from '@broad/table'

import { getTableIndexByPosition } from '@broad/utilities/src/variant'

export const types = keymirror({
  SET_CURRENT_NAVIGATOR_POSITION: null,
})

export const actions = {

  setNavigatorPosition: navigatorPosition => ({
    type: types.SET_CURRENT_NAVIGATOR_POSITION,
    navigatorPosition,
  }),

  onNavigatorClick (tableIndex, position) {
    return (dispatch) => {
      dispatch({ type: variantTypes.ORDER_VARIANTS_BY_POSITION })
      dispatch(tableActions.setCurrentTableIndex(tableIndex))
      dispatch(actions.setNavigatorPosition(position))
    }
  },
}

const actionHandlers = {
  [types.SET_CURRENT_NAVIGATOR_POSITION] (state, { navigatorPosition }) {
    return state.set('currentNavigatorPosition', navigatorPosition)
  },
}

export default function createNavigatorReducer () {
  const State = Immutable.Record({
    currentNavigatorPosition: 0,
  })
  function reducer (state = new State(), action: Object): State {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }
  return reducer
}

export const currentNavigatorPosition = state => state.navigator.currentNavigatorPosition

export const tablePosition = createSelector(
  [currentNavigatorPosition, allVariantsInCurrentDatasetAsList],
  (currentNavigatorPosition, variants) => {
    return getTableIndexByPosition(
      currentNavigatorPosition,
      variants
    )
  }
)
