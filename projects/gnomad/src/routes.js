import React from 'react'
import queryString from 'query-string'
import { Route, Switch } from 'react-router-dom'
import styled from 'styled-components'

import { Help, HelpButton } from '@broad/help'

import GenePage from './GenePage'
import RegionPage from './RegionPage'
import TopBar from './TopBar'

const Root = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  background-color: #fafafa;
  font-family: Roboto, sans-serif;
  font-size: 14px;
`

const MainPanel = styled.div`
  width: 100%;
`

const defaultDataset = 'gnomad_r2_0_2'

const App = () => (
  <Root>
    <MainPanel>
      {/* <TopBar /> */}
      {/* <Route exact path="/" component={GenePage} /> */}
      <Switch>
        <Route
          exact
          path="/gene/:gene/transcript/:transcriptId"
          render={({ location, match }) => {
            const params = queryString.parse(location.search)
            const datasetId = params.dataset || defaultDataset
            return (
              <GenePage
                datasetId={datasetId}
                geneIdOrName={match.params.gene}
                transcriptId={match.params.transcriptId}
              />
            )
          }}
        />
        <Route
          exact
          path="/gene/:gene"
          render={({ location, match }) => {
            const params = queryString.parse(location.search)
            const datasetId = params.dataset || defaultDataset
            return <GenePage datasetId={datasetId} geneIdOrName={match.params.gene} />
          }}
        />
        <Route
          exact
          path="/region/:regionId"
          render={({ location, match }) => {
            const params = queryString.parse(location.search)
            const datasetId = params.dataset || defaultDataset
            return <RegionPage datasetId={datasetId} regionId={match.params.regionId} />
          }}
        />
      </Switch>
      {/* <Route path="/variant/:variant" component={GenePage} /> */}
      {/* <Route path="/rsid/:rsid" component={GenePage} /> */}
    </MainPanel>
    <Help index={'gnomad_help'} />
    <HelpButton />
  </Root>
)

export default App
