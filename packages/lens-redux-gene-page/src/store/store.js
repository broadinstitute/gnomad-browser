/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'
import throttle from 'redux-throttle'
import rootReducer from '../resources'

const logger = createLogger()

const defaultWait = 400
const defaultThrottleOption = { // https://lodash.com/docs#throttle
  leading: true,
  trailing: false,
}

const store = createStore(
  rootReducer,
  applyMiddleware(
    throttle(defaultWait, defaultThrottleOption),
    thunk,
    logger,
  ),
)

export default store
