import React from 'react'
import { render } from 'react-dom'
import { AppContainer } from 'react-hot-loader'

import Component from './Component'

const mount = document.getElementById('root')

render(
  <AppContainer>
    <Component />
  </AppContainer>,
  mount,
)

if (module.hot) {
  module.hot.accept('./Component', () => {
    const NextApp = require('./Component').default  // eslint-disable-line
    render(
      <AppContainer>
        <NextApp />
      </AppContainer>,
      mount,
    )
  })
}
