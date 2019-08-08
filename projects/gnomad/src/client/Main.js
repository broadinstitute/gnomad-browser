import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { Provider } from 'react-redux'
import { applyMiddleware, combineReducers, createStore } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import { createHelpReducer } from '@broad/help'
import { actions as userInterfaceActions, createUserInterfaceReducer } from '@broad/ui'

// eslint-disable-next-line import/no-webpack-loader-syntax,import/no-unresolved
import helpTopics from '@broad/help/src/loader!./helpConfig'

import App from './routes'

import toc from './help/toc.json'

const rootReducer = combineReducers({
  help: createHelpReducer({
    topics: helpTopics,
    toc: toc.toc,
  }),
  ui: createUserInterfaceReducer(),
})

const store = createStore(rootReducer, undefined, applyMiddleware(thunk, createLogger()))

window.addEventListener('resize', () =>
  store.dispatch(userInterfaceActions.setScreenSize(window.innerHeight, window.innerWidth))
)

const Main = () => (
  <Provider store={store}>
    <Router>
      <App />
    </Router>
  </Provider>
)

export default Main
