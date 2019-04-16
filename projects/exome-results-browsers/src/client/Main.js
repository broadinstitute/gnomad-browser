import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { createGlobalStyle } from 'styled-components'

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

const Main = () => (
  <React.Fragment>
    <GlobalStyles />
    <Router>
      <App />
    </Router>
  </React.Fragment>
)

export default Main
