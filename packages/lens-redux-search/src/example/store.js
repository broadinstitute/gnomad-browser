import { applyMiddleware, combineReducers, compose, createStore } from 'redux'
import { reducer as searchReducer, reduxSearch } from 'redux-search'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import { reducer as resourceReducer } from './resources'

const logger = createLogger()

export default function createTestStore() {
  const finalCreateStore = compose(
    applyMiddleware(thunk),
    reduxSearch({
      resourceIndexes: {
        variants: ['variant_id', 'hgvsp', 'hgvsc', 'consequence'],
      },
      resourceSelector: (resourceName, state) => {
        // console.log('resource name', state.resources.get(resourceName))
        return state.resources.get(resourceName)
      },
    }),
  )(createStore)

  const rootReducer = combineReducers({
    resources: resourceReducer,
    search: searchReducer,
  })

  return finalCreateStore(rootReducer)
}
