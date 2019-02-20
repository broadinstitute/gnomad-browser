import React from 'react'
import { hot } from 'react-hot-loader/root'
import styled from 'styled-components'
import { Route } from 'react-router-dom'
import HomePage from './HomePage'
import GenePage from './GenePage'
import TopBar from './TopBar'
import AboutPage from './AboutPage'
import TermPage from './TermPage'
import ContactPage from './ContactPage'
import FaqPage from './FaqPage'

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
      <Route exact path="/gene/:gene" component={GenePage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/terms" component={TermPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/faq" component={FaqPage} />
    </MainPanel>
  </Root>
)

export default hot(App)
