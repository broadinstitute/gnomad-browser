/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import {
  applyMiddleware,
  combineReducers,
  createStore,
} from 'redux'

import thunk from 'redux-thunk'
// import { createLogger } from 'redux-logger'


import {
  createGeneReducer,
} from './index'

// const logger = createLogger()

const config = { startingGene: 'DMD' }

export const createTestStore = () => createStore(
  combineReducers({
    genes: createGeneReducer(config),
  }),
  applyMiddleware(thunk)
)
