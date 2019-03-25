import Immutable from 'immutable'
import keymirror from 'keymirror'

export const types = keymirror({
  SET_SCREEN_SIZE: null,
})

export const actions = {
  setScreenSize: (height, width) => ({ type: types.SET_SCREEN_SIZE, height, width }),
}

const actionHandlers = {
  [types.SET_SCREEN_SIZE] (state, { height, width }) {
    return state.set('screenSize', { height, width })
  },
}

export default function createUserInterfaceReducer () {
  const State = Immutable.Record({
    screenSize: {
      width: typeof window === 'object' ? window.innerWidth : null,
      height: typeof window === 'object' ? window.innerHeight : null,
    }
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

export const screenSize = state => state.ui.screenSize
