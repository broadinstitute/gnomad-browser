import { createStore, applyMiddleware, combineReducers } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import structureViewer from '../redux'

const logger = createLogger()

export default function createTestStore () {
  return createStore(combineReducers({ structureViewer }), applyMiddleware(thunk, logger))
}
