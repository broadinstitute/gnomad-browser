import Immutable from 'immutable'
import keymirror from 'keymirror'

export const types = keymirror({
  SET_CURRENT_TABLE_INDEX: null,
  SET_CURRENT_TABLE_SCROLL_DATA: null,
  SET_VISIBLE_IN_TABLE: null,
})

export const actions = {
  setCurrentTableIndex: tableIndex => ({
    type: types.SET_CURRENT_TABLE_INDEX,
    tableIndex,
    // meta: {
    //   throttle: true,
    // }
  }),

  setCurrentTableScrollData: tableScrollData => (dispatch) => {
    return dispatch(({
      type: types.SET_CURRENT_TABLE_SCROLL_DATA,
      tableScrollData,
    }))
  },

  setVisibleInTable: (range) => {
    return {
      type: types.SET_VISIBLE_IN_TABLE,
      range,
    }
  },
}

const actionHandlers = {
  [types.SET_CURRENT_TABLE_INDEX] (state, { tableIndex }) {
    return state.set('currentTableIndex', tableIndex)
  },
  [types.SET_CURRENT_TABLE_SCROLL_DATA] (state, { tableScrollData }) {
    return state.set('currentTableScrollData', tableScrollData)
  },
  [types.SET_VISIBLE_IN_TABLE] (state, { range }) {
    const [min, max] = state.get('visibleInTable')
    if (min < 0 || max < 0) {
      return state.set('visibleInTable', [0, 15])
    }
    return state.set('visibleInTable', range)
  },
}

export default function createTableReducer () {
  const State = Immutable.Record({
    currentTableIndex: 0,
    currentTableScrollData: { scrollHeight: 1, scrollTop: 2 },
    visibleInTable: [0, 15],
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
