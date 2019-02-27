import React from 'react'
import queryString from 'query-string'
import { hot } from 'react-hot-loader/root'
import { Route, Switch } from 'react-router-dom'
import styled from 'styled-components'

import { Help, HelpButton } from '@broad/help'
import { normalizeRegionId, normalizeVariantId } from '@broad/utilities'

import AboutPage from './AboutPage'
import ContactPage from './ContactPage'
import DownloadsPage from './DownloadsPage'
import FAQPage from './FAQPage'
import GenePage from './GenePage/GenePage'
import HomePage from './HomePage'
import PageNotFoundPage from './PageNotFoundPage'
import RegionPage from './RegionPage/RegionPage'
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
          render={({ history, location, match }) => {
            const params = queryString.parse(location.search)
            const datasetId = params.dataset || defaultDataset
            return (
              <GenePage
                datasetId={datasetId}
                geneIdOrName={match.params.gene}
                history={history}
                location={location}
                match={match}
                transcriptId={match.params.transcriptId}
              />
            )
          }}
        />
        <Route
          exact
          path="/gene/:gene"
          render={({ history, location, match }) => {
            const params = queryString.parse(location.search)
            const datasetId = params.dataset || defaultDataset
            return (
              <GenePage
                datasetId={datasetId}
                geneIdOrName={match.params.gene}
                history={history}
                location={location}
                match={match}
              />
            )
          }}
        />
        <Route
          exact
          path="/region/:regionId"
          render={({ history, location, match }) => {
            const params = queryString.parse(location.search)
            const datasetId = params.dataset || defaultDataset
            const regionId = normalizeRegionId(match.params.regionId)
            return (
              <RegionPage
                datasetId={datasetId}
                regionId={regionId}
                history={history}
                location={location}
                match={match}
              />
            )
          }}
        />
        <Route
          exact
          path="/variant/:variantId"
          render={({ history, location, match }) => {
            const params = queryString.parse(location.search)
            const datasetId = params.dataset || defaultDataset
            const variantId = normalizeVariantId(match.params.variantId)
            return (
              <VariantPage
                datasetId={datasetId}
                variantId={variantId}
                history={history}
                location={location}
                match={match}
              />
            )
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
        <Route component={PageNotFoundPage} />
      </Switch>
    </MainPanel>
    <Help index="gnomad_help" />
    <HelpButton />
  </div>
)

export default hot(App)
