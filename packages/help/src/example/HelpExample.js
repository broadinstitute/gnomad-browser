import React from 'react'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

import Help from '../Help'
import HelpButton from '../HelpButton'
import { createHelpReducer } from '../redux'

// eslint-disable-next-line import/no-webpack-loader-syntax,import/no-unresolved
import helpTopics from '../loader!./helpConfig'

const toc = {
  sections: [
    {
      id: 'general',
      title: 'General information',
      children: ['about-gnomad', 'data-usage'],
    },
    {
      id: 'concepts',
      title: 'Concepts',
      children: ['variant-qc'],
    },
  ],
}

const help = createHelpReducer({
  topics: helpTopics,
  toc,
})

const store = createStore(combineReducers({ help }), applyMiddleware(thunk))

const HelpExample = () => (
  <Provider store={store}>
    <div>
      <Help />
      <HelpButton />
    </div>
  </Provider>
)

export default HelpExample
