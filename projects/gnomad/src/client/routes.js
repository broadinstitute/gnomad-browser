import React from 'react'
import queryString from 'query-string'
import { hot } from 'react-hot-loader/root'
import { Redirect, Route, Switch } from 'react-router-dom'
import styled from 'styled-components'

import { HelpButton, HelpModal } from '@broad/help'
import { normalizeRegionId } from '@broad/utilities'

import AboutPage from './AboutPage'
import ContactPage from './ContactPage'
import DownloadsPage from './DownloadsPage'
import ErrorBoundary from './ErrorBoundary'
import FAQPage from './FAQPage'
import HomePage from './HomePage'
import PageNotFoundPage from './PageNotFoundPage'
import SearchRedirectPage from './SearchRedirectPage'
import TermsPage from './TermsPage'
import GenePage from './GenePage/GenePageContainer'
import RegionPageContainer from './RegionPage/RegionPageContainer'
import TranscriptPageContainer from './TranscriptPage/TranscriptPageContainer'
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
    <Route
      path="/"
      render={({ location }) => {
        if (location.hash) {
          setTimeout(() => {
            const anchor = document.querySelector(`a${location.hash}`)
            if (anchor) {
              anchor.scrollIntoView()
            } else {
              document.body.scrollTop = 0
            }
          }, 0)
        } else {
          document.body.scrollTop = 0
        }
      }}
    />
    <MainPanel>
      <NavBar />
      <ErrorBoundary>
        <Switch>
          <Route exact path="/" component={HomePage} />
          <Route
            exact
            path="/gene/:gene/transcript/:transcriptId"
            render={({ location, match }) => (
              <Redirect
                to={{ ...location, pathname: `/transcript/${match.params.transcriptId}` }}
              />
            )}
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
                  geneIdOrSymbol={match.params.gene}
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
                <RegionPageContainer
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
            path="/transcript/:transcriptId"
            render={({ history, location, match }) => {
              const params = queryString.parse(location.search)
              const datasetId = params.dataset || defaultDataset
              return (
                <TranscriptPageContainer
                  datasetId={datasetId}
                  transcriptId={match.params.transcriptId}
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
              const queryParams = queryString.parse(location.search)
              return (
                <VariantPage
                  datasetId={queryParams.dataset || defaultDataset}
                  variantId={match.params.variantId}
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
      </ErrorBoundary>
    </MainPanel>
    <HelpModal />
    <HelpButton />
  </div>
)

export default hot(App)
