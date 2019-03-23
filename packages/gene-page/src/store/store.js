import {
  applyMiddleware,
  compose,
  combineReducers,
  createStore,
} from 'redux'

import thunk from 'redux-thunk'
import throttle from 'redux-throttle'
import createDebounce from 'redux-debounced'
import { createLogger } from 'redux-logger'
import { createVariantReducer } from '@broad/redux-variants'
import { createGeneReducer } from '@broad/redux-genes'
import { createHelpReducer } from '@broad/help'
import { createUserInterfaceReducer } from '@broad/ui'
import { createTableReducer } from '@broad/table'


const logger = createLogger()

const defaultWait = 500
const defaultThrottleOption = { // https://lodash.com/docs#throttle
  leading: true,
  trailing: false,
}
const reduxThrottle = throttle(defaultWait, defaultThrottleOption)  // eslint-disable-line

const middlewares = [createDebounce(), thunk]

export default function createGenePageStore(appSettings, appReducers) {
  if (appSettings.logger) {
    middlewares.push(logger)
  }
  const rootReducer = combineReducers({
    genes: createGeneReducer(appSettings),
    variants: createVariantReducer(appSettings),
    help: createHelpReducer(appSettings.docs),
    ui: createUserInterfaceReducer(),
    table: createTableReducer(),
    ...appReducers,
  })

  const finalCreateStore = compose(
    applyMiddleware(...middlewares)
  )(createStore)

  return finalCreateStore(rootReducer)
}
