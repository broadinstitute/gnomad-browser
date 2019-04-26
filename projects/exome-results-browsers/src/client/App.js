import React from 'react'
import { hot } from 'react-hot-loader/root'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { createGlobalStyle } from 'styled-components'

import { registerConsequences } from '@broad/utilities'

import browserConfig from '@browser/config'

import ErrorBoundary from './ErrorBoundary'
import GenePage from './GenePage/GenePage'
import GeneResultsPage from './GeneResultsPage/GeneResultsPage'
import HomePage from './HomePage'
import PageNotFoundPage from './PageNotFoundPage'
import TopBar from './TopBar'

const GlobalStyles = createGlobalStyle`
  html,
  body {
    background-color: #fafafa;
    font-family: Roboto, sans-serif;
    font-size: 14px;
  }
`

registerConsequences(browserConfig.variants.consequences)

const App = () => (
  <React.Fragment>
    <GlobalStyles />
    <Router>
      <TopBar />
      {window.gtag && (
        <Route
          path="/"
          render={({ location }) => {
            window.gtag('config', window.gaTrackingId, {
              anonymize_ip: true,
              page_path: location.pathname,
            })
            return null
          }}
        />
      )}
      <ErrorBoundary>
        <Switch>
          <Route path="/" exact component={HomePage} />
          <Route path="/results" component={GeneResultsPage} />
          <Route
            path="/gene/:gene"
            render={({ match }) => <GenePage geneIdOrName={match.params.gene} />}
          />
          <Route component={PageNotFoundPage} />
        </Switch>
      </ErrorBoundary>
    </Router>
  </React.Fragment>
)

export default hot(App)
