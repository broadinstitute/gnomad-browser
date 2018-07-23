import Immutable from 'immutable'
import keymirror from 'keymirror'

export const types = keymirror({
  SET_CURRENT_TABLE_INDEX: null,
  SET_CURRENT_TABLE_SCROLL_DATA: null,
})

export const actions = {
  setCurrentTableIndex: tableIndex => ({
    type: types.SET_CURRENT_TABLE_INDEX,
    tableIndex,
  }),

  setCurrentTableScrollData: tableScrollData => (dispatch) => {
    return dispatch(({
      type: types.SET_CURRENT_TABLE_SCROLL_DATA,
      tableScrollData,
    }))
  },
}

const actionHandlers = {
  [types.SET_CURRENT_TABLE_INDEX] (state, { tableIndex }) {
    return state.set('currentTableIndex', tableIndex)
  },
  [types.SET_CURRENT_TABLE_SCROLL_DATA] (state, { tableScrollData }) {
    return state.set('currentTableScrollData', tableScrollData)
  },
}

export default function createTableReducer () {
  const State = Immutable.Record({
    currentTableIndex: 0,
    currentTableScrollData: { scrollHeight: 1, scrollTop: 2 },
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

export const currentTableIndex = state => state.table.currentTableIndex
export const currentTableScrollData = state => state.table.currentTableScrollData
