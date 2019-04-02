import { applyMiddleware, combineReducers, createStore } from 'redux'
import createDebounce from 'redux-debounced'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'

import { createGeneReducer } from '@broad/redux-genes'
import { createVariantReducer } from '@broad/redux-variants'
import { createTableReducer } from '@broad/table'
import { createUserInterfaceReducer } from '@broad/ui'

export const createVariantFXStore = (appSettings, appReducers) => {
  const rootReducer = combineReducers({
    genes: createGeneReducer(appSettings),
    table: createTableReducer(),
    ui: createUserInterfaceReducer(),
    variants: createVariantReducer(appSettings),
    ...appReducers,
  })

  return createStore(
    rootReducer,
    undefined,
    applyMiddleware(createDebounce(), thunk, createLogger())
  )
}
