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
// import { createLogger } from 'redux-logger'
import { reduxSearch, reducer as searchReducer } from 'redux-search'

import { makeGeneReducers } from '../resources/genes'
import active from '../resources/active'
import table from '../resources/table'
import structureViewer from 'lens-structure-viewer/lib/redux'

// const logger = createLogger()

const defaultWait = 20
const defaultThrottleOption = { // https://lodash.com/docs#throttle
  leading: true,
  trailing: false,
}

export default function createGenePageStore({
  searchIndexes,
  // fetchFunction,
  variantSchema,
}) {
  const rootReducer = combineReducers({
    active,
    ...makeGeneReducers(variantSchema),
    table,
    search: searchReducer,
    structureViewer,
  })

  const finalCreateStore = compose(
    applyMiddleware(
      throttle(defaultWait, defaultThrottleOption),
      thunk,
      // logger,
    ),
    reduxSearch({
      resourceIndexes: {
        variants: searchIndexes,
      },
      resourceSelector: (resourceName, state) => {
        return state.resources.get(resourceName)
      },
    }),
  )(createStore)

  return finalCreateStore(rootReducer)
}
