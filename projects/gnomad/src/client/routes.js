import React from 'react'
import queryString from 'query-string'
import { Route, Switch } from 'react-router-dom'
import styled from 'styled-components'

import { Help, HelpButton } from '@broad/help'
import { normalizeRegionId, normalizeVariantId } from '@broad/utilities'

import AboutPage from './AboutPage'
import ContactPage from './ContactPage'
import DownloadsPage from './DownloadsPage'
import FAQPage from './FAQPage'
import GenePage from './GenePage'
import HomePage from './HomePage'
import RegionPage from './RegionPage'
import SearchRedirectPage from './SearchRedirectPage'
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
            const regionId = normalizeRegionId(match.params.regionId)
            return <RegionPage datasetId={datasetId} regionId={regionId} />
          }}
        />
        <Route
          exact
          path="/variant/:variantId"
          render={({ location, match }) => {
            const params = queryString.parse(location.search)
            const datasetId = params.dataset || defaultDataset
            const variantId = normalizeVariantId(match.params.variantId)
            return <VariantPage datasetId={datasetId} variantId={variantId} />
          }}
        />
        <Route exact path="/about" component={AboutPage} />
        <Route exact path="/downloads" component={DownloadsPage} />
        <Route exact path="/terms" component={TermsPage} />
        <Route exact path="/contact" component={ContactPage} />
        <Route exact path="/faq" component={FAQPage} />
        <Route
          exact
          path="/awesome"
          render={({ location }) => {
            const params = queryString.parse(location.search)
            return <SearchRedirectPage query={params.query} />
          }}
        />
      </Switch>
    </MainPanel>
    <Help index="gnomad_help" />
    <HelpButton />
  </div>
)

export default App
