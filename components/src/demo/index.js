import React from 'react'
import { render } from 'react-dom'
import { AppContainer } from 'react-hot-loader'

import Demo from './Demo'

const mount = document.getElementById('root')

render(
  <AppContainer>
    <Demo />
  </AppContainer>,
  mount,
)

if (module.hot) {
  module.hot.accept('./Demo', () => {
    const NextApp = require('./Demo').default  // eslint-disable-line
    render(
      <AppContainer>
        <NextApp />
      </AppContainer>,
      mount,
    )
  })
}
