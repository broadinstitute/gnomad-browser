import React from 'react'
import { Provider } from 'react-redux'

import { createHelpStore } from './store'
import Help from '../Help'
import HelpButton from '../HelpButton'

const store = createHelpStore()

const ExampleApp = () => (
  <Provider store={store}>
    <div>
      <Help />
      <HelpButton />
    </div>
  </Provider>
)

export default ExampleApp
