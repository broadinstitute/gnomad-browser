import React from 'react'
import styled from 'styled-components'
import { Route, Switch } from 'react-router-dom'
import { Help, HelpButton } from '@broad/help'

import GenePage from './GenePage'
// import RegionPage from './RegionPage'
import TopBar from './TopBar'

const Root = styled.div`
  display: flex;
  flex-direction: row;
  font-family: Roboto, sans-serif;
  font-size: 12px;
  height: 100%;
  width: 100%;
  background-color: #FAFAFA;;
`

const MainPanel = styled.div`
  width: 100%;
`
const App = () => (
  <Root>
    <MainPanel>
      {/* <TopBar /> */}
      {/* <Route exact path="/" component={GenePage} /> */}
      <Switch>
        {/* <Route path="/gene/:gene/:variantId" component={GenePage} /> */}
        <Route exact path="/gene/:gene" component={GenePage} />
        {/* <Route exact path="/region/:regionId" component={RegionPage} /> */}
      </Switch>
      {/* <Route path="/variant/:variant" component={GenePage} /> */}
      {/* <Route path="/rsid/:rsid" component={GenePage} /> */}
    </MainPanel>
    <Help index={'gnomad_help'} />
    <HelpButton />
  </Root>
)

export default App
