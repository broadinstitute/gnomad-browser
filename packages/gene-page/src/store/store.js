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
import { createLogger } from 'redux-logger'
import { reduxSearch, reducer as searchReducer } from 'redux-search'

import createGeneReducer from '../resources/genes'
import createVariantReducer, {
  allVariantsInCurrentDatasetAsList
} from '../resources/variants'
import createActiveReducer from '../resources/active'

const logger = createLogger()

const defaultWait = 20
const defaultThrottleOption = { // https://lodash.com/docs#throttle
  leading: true,
  trailing: false,
}

const middlewares = [throttle(defaultWait, defaultThrottleOption), thunk]

export default function createGenePageStore(appSettings) {
  if (appSettings.logger) {
    middlewares.push(logger)
  }
  const rootReducer = combineReducers({
    active: createActiveReducer(appSettings),
    genes: createGeneReducer(appSettings),
    search: searchReducer,
    variants: createVariantReducer(appSettings),
  })

  const finalCreateStore = compose(
    applyMiddleware(...middlewares),
    reduxSearch({
      resourceIndexes: {
        variants: appSettings.searchIndexes,
      },
      resourceSelector: (resourceName, state) => {
        return allVariantsInCurrentDatasetAsList(state)
      },
    }),
  )(createStore)

  return finalCreateStore(rootReducer)
}
