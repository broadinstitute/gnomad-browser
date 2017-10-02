import React from 'react'
import styled from 'styled-components'
import { Route } from 'react-router-dom'
// import GwasPage from './GwasPage'
import HomePage from './HomePage'
import MainPage from './MainPage'
import TopBar from './TopBar'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  font-family: Roboto, sans-serif;
  font-size: 12px;
  height: 100%;
  width: 100%;
  background-color: #FAFAFA;
`

const MainPanel = styled.div`
  width: 100%;
  height: 100%;
`

const App = () => (
  <Root>
    <MainPanel>
      <TopBar />
      <Route path="/" exact component={HomePage} />
      {/* <Route path="/gwas" component={GwasPage} /> */}
      <Route path="/exomes" component={MainPage} />
    </MainPanel>
  </Root>
)

export default App
