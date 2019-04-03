export const types = {
  SET_SCREEN_SIZE: 'SET_SCREEN_SIZE',
}

export const actions = {
  setScreenSize: (height, width) => ({ type: types.SET_SCREEN_SIZE, height, width }),
}

const actionHandlers = {
  [types.SET_SCREEN_SIZE](state, { height, width }) {
    return { ...state, screenSize: { height, width } }
  },
}

export default function createUserInterfaceReducer() {
  const initialState = {
    screenSize: {
      height: window.innerHeight,
      width: window.innerWidth,
    },
  }

  function reducer(state = initialState, action) {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }
  return reducer
}

export const screenSize = state => state.ui.screenSize
