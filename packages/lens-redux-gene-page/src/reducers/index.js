import { combineReducers } from 'redux'

import active from '../resources/active'
import table from './table'
import genes from './genes'
// import variants from './variants'
// import regions from './regions'
// import coverage from './coverage'

const app = combineReducers({
  active,
  // regions,
  genes,
  // coverage,
  // variants,
  table,
})

export default app
