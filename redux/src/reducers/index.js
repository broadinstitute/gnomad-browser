import { combineReducers } from 'redux'

import selections from './selections'
import table from './table'
import genes from './genes'
// import variants from './variants'
// import regions from './regions'
// import coverage from './coverage'

const app = combineReducers({
  selections,
  // regions,
  genes,
  // coverage,
  // variants,
  table,
})

export default app
