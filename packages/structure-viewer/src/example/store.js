import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import reducer from '../redux'

const logger = createLogger()

export default function createTestStore () {
  return createStore(reducer, applyMiddleware(thunk, logger))
}
