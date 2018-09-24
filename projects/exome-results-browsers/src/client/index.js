import React from 'react'
import { render } from 'react-dom'
import { AppContainer } from 'react-hot-loader'

import Main from './Main'

const mount = document.getElementById('root')

render(
  <AppContainer>
    <Main />
  </AppContainer>,
  mount
)

if (module.hot) {
  module.hot.accept('./Main', () => {
    const NextApp = require('./Main').default  // eslint-disable-line
    render(
      <AppContainer>
        <NextApp />
      </AppContainer>,
      mount
    )
  })
}
