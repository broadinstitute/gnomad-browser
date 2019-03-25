import Immutable from 'immutable'
import keymirror from 'keymirror'

export const types = keymirror({
  SET_CURRENT_TABLE_INDEX: null,
  SET_CURRENT_TABLE_SCROLL_WINDOW: null,
})

export const actions = {
  setCurrentTableIndex: tableIndex => ({
    type: types.SET_CURRENT_TABLE_INDEX,
    tableIndex,
  }),
  setCurrentTableScrollWindow: ({ startIndex, stopIndex }) => ({
    type: types.SET_CURRENT_TABLE_SCROLL_WINDOW,
    startIndex,
    stopIndex,
  }),
}

const actionHandlers = {
  [types.SET_CURRENT_TABLE_INDEX] (state, { tableIndex }) {
    return state.set('currentTableIndex', tableIndex)
  },
  [types.SET_CURRENT_TABLE_SCROLL_WINDOW](state, { startIndex, stopIndex }) {
    return state.set('currentTableScrollWindow', {
      startIndex,
      stopIndex,
    })
  },
}

export default function createTableReducer () {
  const State = Immutable.Record({
    currentTableIndex: 0,
    currentTableScrollWindow: {
      startIndex: 0,
      stopIndex: 20,
    },
  })
  function reducer (state = new State(), action) {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }
  return reducer
}

export const currentTableIndex = state => state.table.currentTableIndex
export const currentTableScrollWindow = state => state.table.currentTableScrollWindow
