import React from 'react'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

import { HelpButton, HelpModal } from '..'
import { createHelpReducer } from '../redux'

// eslint-disable-next-line import/no-webpack-loader-syntax,import/no-unresolved
import helpTopics from '../loader!./helpConfig'

import toc from '../../../../projects/gnomad/gnomad-docs/toc.json'

const help = createHelpReducer({
  topics: helpTopics,
  toc: toc.toc,
})

const store = createStore(combineReducers({ help }), applyMiddleware(thunk))

const HelpExample = () => (
  <Provider store={store}>
    <div>
      <HelpModal />
      <HelpButton />
    </div>
  </Provider>
)

export default HelpExample
