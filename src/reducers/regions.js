import { combineReducers } from 'redux'

const byRegion = (state = {}, action) => {
  switch (action.type) {
    case 'RECEIVE_REGION':
      return {
        ...state,
        [`${action.chromosome}-${action.start}-${action.stop}`]: {
          ...action.data,
        },
      }
    default:
      return state
  }
}

const regions = combineReducers({
  byRegion,
})

export default regions

export const getRegion = (state, regionId) => state.byRegion[regionId]
