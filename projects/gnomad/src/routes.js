import React from 'react'
import styled from 'styled-components'
import { Route } from 'react-router-dom'

import GenePage from './GenePage'
import TopBar from './TopBar'

const Root = styled.div`
  display: flex;
  flex-direction: column;
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
      <TopBar />
      <Route exact path="/" component={GenePage} />
      <Route path="/gene/:gene" component={GenePage} />
      <Route path="/variant/:variant" component={GenePage} />
      <Route path="/rsid/:rsid" component={GenePage} />
      <Route path="/gene-name/:geneName" component={GenePage} />
    </MainPanel>
  </Root>
)

export default App

// :root {
//   --backgroundColor: #FAFAFA;
//   /*--primaryColor: #375D81;*/
//   --primaryColor: black;
//   --secondaryColor: #91AA9D;
//   --exonColor: #475453;
//   --paddingColor: #183152;
//   --rowHoverColor: #E8EAF6;
//   --rowBackGroundColor: #FAFAFA;
// }
//
// /*:root {
//   --backgroundColor: #1E1E20;
//   --primaryColor: #D9CB9E;
//   --secondaryColor: #DC3522;
//   --exonColor: #475453;
//   --paddingColor: #5A5E5C;
//   --rowHoverColor: #183152;
//   --rowBackGroundColor: #1E1E20;
// }*/
