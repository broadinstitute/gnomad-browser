import React, { lazy } from 'react'
import queryString from 'query-string'
import { Redirect, Route, Switch } from 'react-router-dom'

import { isRegionId, normalizeRegionId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'

// Content pages
const AboutPage = lazy(() => import('./AboutPage'))
const FeedbackPage = lazy(() => import('./FeedbackPage'))
const DownloadsPage = lazy(() => import('./DownloadsPage/DownloadsPage'))
const HelpPage = lazy(() => import('./help/HelpPage'))
const HelpTopicPage = lazy(() => import('./help/HelpTopicPage'))
const HomePage = lazy(() => import('./HomePage'))
const MOUPage = lazy(() => import('./MOUPage'))
const PublicationsPage = lazy(() => import('./PublicationsPage'))
const TermsPage = lazy(() => import('./TermsPage'))

const GenePageContainer = lazy(() => import('./GenePage/GenePageContainer'))
const RegionPageContainer = lazy(() => import('./RegionPage/RegionPageContainer'))
const TranscriptPageContainer = lazy(() => import('./TranscriptPage/TranscriptPageContainer'))
const VariantPageRouter = lazy(() => import('./VariantPageRouter'))

const ShortTandemRepeatPage = lazy(() => import('./ShortTandemRepeatPage/ShortTandemRepeatPage'))
const VariantCooccurrencePage = lazy(() =>
  import('./VariantCooccurrencePage/VariantCooccurrencePage')
)

// Other pages
const PageNotFoundPage = lazy(() => import('./PageNotFoundPage'))
const SearchRedirectPage = lazy(() => import('./SearchRedirectPage'))

const defaultDataset = 'gnomad_r2_1'

const Routes = () => {
  // ==================================================================================
  //
  //                                     NOTE!
  //
  // New routes must also be added as a rewrite rule in Nginx configuration.
  // ==================================================================================
  return (
    <Switch>
      <Route exact path="/" component={HomePage} />

      <Route
        exact
        path="/gene/:gene/transcript/:transcriptId"
        render={({ location, match }) => (
          <Redirect to={{ ...location, pathname: `/transcript/${match.params.transcriptId}` }} />
        )}
      />

      <Route
        exact
        path="/gene/:gene"
        render={({ location, match }) => {
          const params = queryString.parse(location.search)
          const datasetId = params.dataset || defaultDataset
          return <GenePageContainer datasetId={datasetId} geneIdOrSymbol={match.params.gene} />
        }}
      />

      <Route
        exact
        path="/region/:regionId"
        render={({ location, match }) => {
          const params = queryString.parse(location.search)
          const datasetId = params.dataset || defaultDataset
          if (!isRegionId(match.params.regionId)) {
            return (
              <Page>
                <DocumentTitle title="Invalid region" />
                <PageHeading>Invalid region</PageHeading>
                <p>Region must be formatted chrom-start-stop.</p>
              </Page>
            )
          }

          const regionId = normalizeRegionId(match.params.regionId)
          return <RegionPageContainer datasetId={datasetId} regionId={regionId} />
        }}
      />

      <Route
        exact
        path="/transcript/:transcriptId"
        render={({ location, match }) => {
          const params = queryString.parse(location.search)
          const datasetId = params.dataset || defaultDataset
          return (
            <TranscriptPageContainer
              datasetId={datasetId}
              transcriptId={match.params.transcriptId}
            />
          )
        }}
      />

      <Route
        exact
        path="/variant/:variantId"
        render={({ location, match }) => {
          const queryParams = queryString.parse(location.search)
          const datasetId = queryParams.dataset || defaultDataset
          return <VariantPageRouter datasetId={datasetId} variantId={match.params.variantId} />
        }}
      />

      <Route
        exact
        path="/variant-cooccurrence"
        render={({ location }) => {
          const params = queryString.parse(location.search)
          const datasetId = params.dataset || defaultDataset
          return <VariantCooccurrencePage datasetId={datasetId} />
        }}
      />

      <Route
        exact
        path="/short-tandem-repeat/:strId"
        render={({ location, match }) => {
          const queryParams = queryString.parse(location.search)
          const datasetId = queryParams.dataset || defaultDataset
          return <ShortTandemRepeatPage datasetId={datasetId} strId={match.params.strId} />
        }}
      />

      <Route exact path="/about" component={AboutPage} />

      <Route exact path="/downloads" component={DownloadsPage} />

      <Route exact path="/terms" component={TermsPage} />

      <Route exact path="/publications" component={PublicationsPage} />

      <Route exact path="/feedback" component={FeedbackPage} />

      <Route exact path="/contact" render={() => <Redirect to="/feedback" />} />

      <Route exact path="/mou" component={MOUPage} />

      <Route
        exact
        path="/faq"
        render={({ location }) => {
          if (location.hash) {
            return <Redirect to={`/help/${location.hash.slice(1)}`} />
          }

          return <Redirect to={{ pathname: '/help', hash: '#frequently-asked-questions' }} />
        }}
      />

      <Route
        exact
        path="/help/:topic"
        render={({ match }) => <HelpTopicPage topicId={match.params.topic} />}
      />

      <Route exact path="/help" component={HelpPage} />

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
  )
  // ==================================================================================
  //
  //                                     NOTE!
  //
  // New routes must also be added as a rewrite rule in Nginx configuration.
  // ==================================================================================
}

export default Routes
