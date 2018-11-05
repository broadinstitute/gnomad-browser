import React from 'react'
import queryString from 'query-string'
import { Route, Switch } from 'react-router-dom'
import styled from 'styled-components'

import { Help, HelpButton } from '@broad/help'

import AboutPage from './AboutPage'
import ContactPage from './ContactPage'
import DownloadsPage from './DownloadsPage'
import FAQPage from './FAQPage'
import GenePage from './GenePage'
import HomePage from './HomePage'
import RegionPage from './RegionPage'
import TermsPage from './TermsPage'
import VariantPage from './VariantPage/VariantPage'

import NavBar from './NavBar'

const MainPanel = styled.div`
  width: 100%;
`

const defaultDataset = 'gnomad_r2_1'

const App = () => (
  <div>
    <Route
      path="/"
      render={({ location }) => {
        if (window.gtag) {
          window.gtag('config', window.gaTrackingId, {
            page_path: location.pathname,
          })
        }
        return null
      }}
    />
    <MainPanel>
      <NavBar />
      <Switch>
        <Route exact path="/" component={HomePage} />
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
        <Route
          exact
          path="/variant/:variantId"
          render={({ location, match }) => {
            const params = queryString.parse(location.search)
            const datasetId = params.dataset || defaultDataset
            return <VariantPage datasetId={datasetId} variantId={match.params.variantId} />
          }}
        />
        <Route exact path="/about" component={AboutPage} />
        <Route exact path="/downloads" component={DownloadsPage} />
        <Route exact path="/terms" component={TermsPage} />
        <Route exact path="/contact" component={ContactPage} />
        <Route exact path="/faq" component={FAQPage} />
      </Switch>
      {/* <Route path="/variant/:variant" component={GenePage} /> */}
      {/* <Route path="/rsid/:rsid" component={GenePage} /> */}
    </MainPanel>
    <Help index={'gnomad_help'} />
    <HelpButton />
  </div>
)

export default App
