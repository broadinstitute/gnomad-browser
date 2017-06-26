/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import { createStore, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'
import throttle from 'redux-throttle'
import { reduxSearch } from 'redux-search'
import rootReducer from '../resources'

const logger = createLogger()

const defaultWait = 400
const defaultThrottleOption = { // https://lodash.com/docs#throttle
  leading: true,
  trailing: false,
}

export default function createTestStore() {
  const finalCreateStore = compose(
    applyMiddleware(
      throttle(defaultWait, defaultThrottleOption),
      thunk,
    ),
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

  return finalCreateStore(rootReducer)
}
