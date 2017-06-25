import { combineReducers } from 'redux'

import active from './active'
import table from './table'
import genes from './genes'

const app = combineReducers({
  active,
  genes,
  table,
})

export default app
