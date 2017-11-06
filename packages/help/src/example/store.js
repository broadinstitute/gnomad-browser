import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

import { help } from '../redux'

export function createHelpStore() {
  return createStore(combineReducers({ help }), applyMiddleware(thunk))
}
