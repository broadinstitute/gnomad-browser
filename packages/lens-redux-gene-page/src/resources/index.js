import { combineReducers } from 'redux'
import { reducer as searchReducer } from 'redux-search'

import active from './active'
import table from './table'
import genes, { resourcesReducer as resources }from './genes'

const app = combineReducers({
  active,
  genes,
  table,
  resources,
  search: searchReducer,
})

export default app
