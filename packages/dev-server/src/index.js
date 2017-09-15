import React from 'react'
import { render } from 'react-dom'
import { AppContainer } from 'react-hot-loader'  // eslint-disable-line

import Demo from './demo'

const mount = document.getElementById('root')

render(
  <AppContainer>
    <Demo />
  </AppContainer>,
  mount,
)

if (module.hot) {
  module.hot.accept('./demo', () => {
    const NextApp = require('./demo').default  // eslint-disable-line
    render(
      <AppContainer>
        <NextApp />
      </AppContainer>,
      mount,
    )
  })
}
