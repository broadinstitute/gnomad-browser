import React from 'react'
import { Provider } from 'react-redux'

import { createHelpStore } from './store'
import Help from '../Help'

const store = createHelpStore()

const ExampleApp = () => (
  <Provider store={store}>
    <Help />
  </Provider>
)

export default ExampleApp
