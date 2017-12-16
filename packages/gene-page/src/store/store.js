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
import { reduxSearch, reducer as searchReducer } from 'redux-search'
import { createVariantReducer } from '@broad/redux-variants'
import { createGeneReducer } from '@broad/redux-genes'
import { createRegionReducer } from '@broad/region'
// import { createHelpReducer } from '@broad/help'
import { createUserInterfaceReducer } from '@broad/ui'
import { createTableReducer } from '@broad/table'
import { createNavigatorReducer } from '@broad/track-navigator'

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
    search: searchReducer,
    variants: createVariantReducer(appSettings),
    regions: createRegionReducer(appSettings),
    // help: createHelpReducer(appSettings.docs),
    ui: createUserInterfaceReducer(),
    navigator: createNavigatorReducer(),
    table: createTableReducer(),
    ...appReducers,
  })

  const finalCreateStore = compose(
    applyMiddleware(...middlewares),
    reduxSearch({
      resourceIndexes: {
        variants: appSettings.searchIndexes,
      },
      resourceSelector: appSettings.searchResourceSelector,
    })
  )(createStore)

  return finalCreateStore(rootReducer)
}
