import React from 'react'
import { Provider } from 'react-redux'
import { BrowserRouter as Router } from 'react-router-dom'
import { applyMiddleware, combineReducers, createStore } from 'redux'
import createDebounce from 'redux-debounced'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import { createGlobalStyle } from 'styled-components'

import { actions as userInterfaceActions, createUserInterfaceReducer } from '@broad/ui'
import { registerConsequences } from '@broad/utilities'

import browserConfig from '@browser/config'

import App from './routes'

const GlobalStyles = createGlobalStyle`
  html,
  body {
    background-color: #fafafa;
    font-family: Roboto, sans-serif;
    font-size: 14px;
  }
`

document.title = browserConfig.pageTitle

registerConsequences(browserConfig.consequences)

const rootReducer = combineReducers({
  ui: createUserInterfaceReducer(),
})

const store = createStore(
  rootReducer,
  undefined,
  applyMiddleware(createDebounce(), thunk, createLogger())
)

window.addEventListener('resize', () =>
  store.dispatch(userInterfaceActions.setScreenSize(window.innerHeight, window.innerWidth))
)

const Main = () => (
  <React.Fragment>
    <GlobalStyles />
    <Provider store={store}>
      <Router>
        <App />
      </Router>
    </Provider>
  </React.Fragment>
)

export default Main
