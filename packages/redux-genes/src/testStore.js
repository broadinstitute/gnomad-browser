import {
  applyMiddleware,
  combineReducers,
  createStore,
} from 'redux'
import thunk from 'redux-thunk'

import createGeneReducer from './genes'


const config = {
  startingGene: 'DMD',
  variantDatasets: {},
}

export const createTestStore = () => createStore(
  combineReducers({
    genes: createGeneReducer(config),
  }),
  applyMiddleware(thunk)
)
