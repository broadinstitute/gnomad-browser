/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

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


import createVariantReducer, {
  visibleVariantsById,
  filteredVariantsById,
  allVariantsInCurrentDataset,
} from '@broad/redux-variants'

const logger = createLogger()

const defaultWait = 50
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
    active: createActiveReducer(appSettings),
    genes: createGeneReducer(appSettings),
    variants: createVariantReducer(appSettings),
    regions: createRegionReducer(appSettings),
    help: createHelpReducer(appSettings.docs),
    ...appReducers,
  })

  const finalCreateStore = compose(
    applyMiddleware(...middlewares)
  )(createStore)

  return finalCreateStore(rootReducer)
}
