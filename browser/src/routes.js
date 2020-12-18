import React, { Suspense, lazy } from 'react'
import queryString from 'query-string'
import { hot } from 'react-hot-loader/root'
import { Redirect, Route, Switch } from 'react-router-dom'
import styled from 'styled-components'

import { isVariantId, normalizeRegionId, normalizeVariantId, isRsId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import ErrorBoundary from './ErrorBoundary'
import HelpButton from './help/HelpButton'
import HelpModal from './help/HelpModal'
import NavBar from './NavBar'

// Content pages
const AboutPage = lazy(() => import('./AboutPage'))
const ContactPage = lazy(() => import('./ContactPage'))
const DownloadsPage = lazy(() => import('./downloads/DownloadsPage'))
const FAQPage = lazy(() => import('./FAQPage'))
const HelpPage = lazy(() => import('./help/HelpPage'))
const HomePage = lazy(() => import('./HomePage'))
const MOUPage = lazy(() => import('./MOUPage'))
const PublicationsPage = lazy(() => import('./PublicationsPage'))
const TermsPage = lazy(() => import('./TermsPage'))

const GenePageContainer = lazy(() => import('./GenePage/GenePageContainer'))
const RegionPageContainer = lazy(() => import('./RegionPage/RegionPageContainer'))
const TranscriptPageContainer = lazy(() => import('./TranscriptPage/TranscriptPageContainer'))

// Variant pages
const MitochondrialVariantPage = lazy(() =>
  import('./MitochondrialVariantPage/MitochondrialVariantPage')
)
const MNVPage = lazy(() => import('./MNVPage/MNVPage'))
const StructuralVariantPage = lazy(() => import('./StructuralVariantPage/StructuralVariantPage'))
const VariantPage = lazy(() => import('./VariantPage/VariantPage'))

const PageNotFoundPage = lazy(() => import('./PageNotFoundPage'))
const SearchRedirectPage = lazy(() => import('./SearchRedirectPage'))

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
        <Suspense fallback={null}>
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
                  <GenePageContainer
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
                const datasetId = queryParams.dataset || defaultDataset
                const variantIdOrRsId = match.params.variantId

                if (datasetId.startsWith('gnomad_sv')) {
                  return (
                    <StructuralVariantPage
                      datasetId={datasetId}
                      variantId={variantIdOrRsId}
                      history={history}
                      location={location}
                      match={match}
                    />
                  )
                }

                if (isVariantId(variantIdOrRsId)) {
                  const normalizedVariantId = normalizeVariantId(variantIdOrRsId).replace(
                    /^MT/,
                    'M'
                  )
                  const [chrom, pos, ref, alt] = normalizedVariantId.split('-') // eslint-disable-line no-unused-vars
                  if (ref.length === alt.length && ref.length > 1) {
                    return (
                      <MNVPage
                        datasetId={datasetId}
                        variantId={normalizedVariantId}
                        history={history}
                        location={location}
                        match={match}
                      />
                    )
                  }

                  if (chrom === 'M') {
                    return (
                      <MitochondrialVariantPage
                        datasetId={datasetId}
                        variantId={normalizedVariantId}
                        history={history}
                        location={location}
                        match={match}
                      />
                    )
                  }

                  return (
                    <VariantPage
                      datasetId={datasetId}
                      variantId={normalizedVariantId}
                      history={history}
                      location={location}
                      match={match}
                    />
                  )
                }

                if (isRsId(variantIdOrRsId)) {
                  return (
                    <VariantPage
                      datasetId={datasetId}
                      rsId={variantIdOrRsId}
                      history={history}
                      location={location}
                      match={match}
                    />
                  )
                }

                return (
                  <Page>
                    <DocumentTitle title="Invalid variant ID" />
                    <PageHeading>Invalid Variant ID</PageHeading>
                    <p>Variant IDs must be chrom-pos-ref-alt or rsIDs.</p>
                  </Page>
                )
              }}
            />
            <Route exact path="/about" component={AboutPage} />
            <Route exact path="/downloads" component={DownloadsPage} />
            <Route exact path="/terms" component={TermsPage} />
            <Route exact path="/publications" component={PublicationsPage} />
            <Route exact path="/contact" component={ContactPage} />
            <Route exact path="/faq" component={FAQPage} />
            <Route exact path="/mou" component={MOUPage} />
            <Route
              exact
              path="/help/:topic"
              render={({ match }) => <HelpPage topicId={match.params.topic} />}
            />
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
        </Suspense>
      </ErrorBoundary>
    </MainPanel>
    <HelpModal />
    <HelpButton />
  </div>
)

export default hot(App)
