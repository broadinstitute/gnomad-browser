import React from 'react'
import { Route, Switch } from 'react-router-dom'
import styled from 'styled-components'

import GenePage from './GenePage/GenePage'
import OverallGeneResultsPage from './OverallGeneResultsPage'
import HomePage from './HomePage'
import TopBar from './TopBar'

const Root = styled.div`
  width: 100%;
  height: 100%;
  background-color: #fafafa;
  font-family: Roboto, sans-serif;
  font-size: 14px;
`

const App = () => (
  <Root>
    <TopBar />
    <Route path="/" exact component={HomePage} />
    <Switch>
      <Route path="/results" component={OverallGeneResultsPage} />
      <Route path="/gene/:gene" render={({ match }) => <GenePage geneName={match.params.gene} />} />
    </Switch>
  </Root>
)

export default App
