import { combineReducers } from 'redux'
import * as types from '../constants/actionTypes'

const message = (state = 'Hello', action) => {
  console.log(action.type)
  switch (action.type) {
    case types.UPDATE_MESSAGE:
      return action.message
    default:
      return state
  }
}

export default combineReducers({
  message,
})
