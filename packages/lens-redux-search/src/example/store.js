import { applyMiddleware, combineReducers, compose, createStore } from 'redux'
import { reducer as searchReducer, reduxSearch } from 'redux-search'
import thunk from 'redux-thunk'

import { reducer as resourceReducer } from './resources'

export default function createTestStore() {
  const finalCreateStore = compose(
    applyMiddleware(thunk),
    reduxSearch({
      resourceIndexes: {
        variants: ['variant_id', 'hgvsp', 'hgvsc'],
      },
      resourceSelector: (resourceName, state) => {
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
