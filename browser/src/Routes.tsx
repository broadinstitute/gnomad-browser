import React, { lazy } from 'react'
import queryString from 'query-string'
import { Redirect, Route, Switch } from 'react-router-dom'

import { isRegionId, normalizeRegionId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

// Content pages
const AboutPage = lazy(() => import('./AboutPage'))
const TeamPage = lazy(() => import('./TeamPage/TeamPage'))
const ContactPage = lazy(() => import('./ContactPage'))
const DownloadsPage = lazy(() => import('./DownloadsPage/DownloadsPage'))
const HelpPage = lazy(() => import('./help/HelpPage'))
const HelpTopicPage = lazy(() => import('./help/HelpTopicPage'))
const HomePage = lazy(() => import('./HomePage'))
const MOUPage = lazy(() => import('./MOUPage'))
const StatsPage = lazy(() => import('./StatsPage/StatsPage'))
const PublicationsPage = lazy(() => import('./PublicationsPage'))
const PoliciesPage = lazy(() => import('./PoliciesPage'))

const GenePageContainer = lazy(() => import('./GenePage/GenePageContainer'))
const RegionPageContainer = lazy(() => import('./RegionPage/RegionPageContainer'))
const TranscriptPageContainer = lazy(() => import('./TranscriptPage/TranscriptPageContainer'))
const VariantPageRouter = lazy(() => import('./VariantPageRouter'))

const ShortTandemRepeatPage = lazy(() => import('./ShortTandemRepeatPage/ShortTandemRepeatPage'))
const ShortTandemRepeatsPage = lazy(() => import('./ShortTandemRepeatsPage/ShortTandemRepeatsPage'))
const VariantCooccurrencePage = lazy(
  () => import('./VariantCooccurrencePage/VariantCooccurrencePage')
)
const LiftoverDisambiguationPage = lazy(() => import('./VariantPage/LiftoverDisambiguationPage'))

// Other pages
const PageNotFoundPage = lazy(() => import('./PageNotFoundPage'))
const SearchRedirectPage = lazy(() => import('./SearchRedirectPage'))

const defaultDataset = 'gnomad_r4'

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
        render={({ location, match }: any) => (
          <Redirect to={{ ...location, pathname: `/transcript/${match.params.transcriptId}` }} />
        )}
      />

      <Route
        exact
        path="/gene/:gene"
        render={({ location, match }: any) => {
          const params = queryString.parse(location.search)
          const datasetId = params.dataset || defaultDataset
          // @ts-expect-error TS(2322) FIXME: Type 'string | (string | null)[]' is not assignabl... Remove this comment to see the full error message
          return <GenePageContainer datasetId={datasetId} geneIdOrSymbol={match.params.gene} />
        }}
      />

      <Route
        exact
        path="/region/:regionId"
        render={({ location, match }: any) => {
          const params = queryString.parse(location.search)
          const datasetId = params.dataset || defaultDataset
          if (!isRegionId(match.params.regionId)) {
            return (
              // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
              <Page>
                <DocumentTitle title="Invalid region" />
                <PageHeading>Invalid region</PageHeading>
                <p>Region must be formatted chrom-start-stop.</p>
              </Page>
            )
          }

          const regionId = normalizeRegionId(match.params.regionId)
          // @ts-expect-error TS(2322) FIXME: Type 'string | (string | null)[]' is not assignabl... Remove this comment to see the full error message
          return <RegionPageContainer datasetId={datasetId} regionId={regionId} />
        }}
      />

      <Route
        exact
        path="/transcript/:transcriptId"
        render={({ location, match }: any) => {
          const params = queryString.parse(location.search)
          const datasetId = params.dataset || defaultDataset
          return (
            <TranscriptPageContainer
              // @ts-expect-error TS(2322) FIXME: Type 'string | (string | null)[]' is not assignabl... Remove this comment to see the full error message
              datasetId={datasetId}
              transcriptId={match.params.transcriptId}
            />
          )
        }}
      />

      <Route
        exact
        path="/variant/liftover/:fromVariantId/:fromDatasetId/:toDatasetId"
        render={({ match }) => {
          const { fromVariantId, fromDatasetId, toDatasetId } = match.params as {
            fromVariantId: string
            fromDatasetId: DatasetId
            toDatasetId: DatasetId
          }
          return (
            <LiftoverDisambiguationPage
              fromVariantId={fromVariantId}
              fromDatasetId={fromDatasetId}
              toDatasetId={toDatasetId}
            />
          )
        }}
      />
      <Route
        exact
        path="/variant/:variantId"
        render={({ location, match }: any) => {
          const queryParams = queryString.parse(location.search)
          const datasetId = queryParams.dataset || defaultDataset
          // @ts-expect-error TS(2322) FIXME: Type 'string | (string | null)[]' is not assignabl... Remove this comment to see the full error message
          return <VariantPageRouter datasetId={datasetId} variantId={match.params.variantId} />
        }}
      />

      <Route
        exact
        path="/variant-cooccurrence"
        render={({ location }: any) => {
          const params = queryString.parse(location.search)
          const datasetId = params.dataset || defaultDataset
          // @ts-expect-error TS(2322) FIXME: Type 'string | (string | null)[]' is not assignabl... Remove this comment to see the full error message
          return <VariantCooccurrencePage datasetId={datasetId} />
        }}
      />

      <Route
        exact
        path="/short-tandem-repeats"
        render={({ location }: any) => {
          const queryParams = queryString.parse(location.search)
          const datasetId = queryParams.dataset || defaultDataset
          // @ts-expect-error TS(2322) FIXME: Type 'string | (string | null)[]' is not assignabl... Remove this comment to see the full error message
          return <ShortTandemRepeatsPage datasetId={datasetId} />
        }}
      />

      <Route
        exact
        path="/short-tandem-repeat/:strId"
        render={({ location, match }: any) => {
          const queryParams = queryString.parse(location.search)
          const datasetId = queryParams.dataset || defaultDataset
          // @ts-expect-error TS(2322) FIXME: Type 'string | (string | null)[]' is not assignabl... Remove this comment to see the full error message
          return <ShortTandemRepeatPage datasetId={datasetId} strId={match.params.strId} />
        }}
      />

      <Route exact path="/about" component={AboutPage} />

      <Route exact path="/team" component={TeamPage} />

      <Route exact path="/downloads" component={DownloadsPage} />

      <Redirect from="/terms" to="/policies" />

      <Route exact path="/policies" component={PoliciesPage} />

      <Route exact path="/publications" component={PublicationsPage} />

      <Route exact path="/contact" component={ContactPage} />

      <Route exact path="/feedback" render={() => <Redirect to="/contact" />} />

      <Route exact path="/mou" component={MOUPage} />

      <Route exact path="/stats" component={StatsPage} />

      <Route
        exact
        path="/faq"
        render={({ location }: any) => {
          if (location.hash) {
            return <Redirect to={`/help/${location.hash.slice(1)}`} />
          }

          return <Redirect to={{ pathname: '/help', hash: '#frequently-asked-questions' }} />
        }}
      />

      {/* Redirect legacy citations page to publications page */}
      <Route
        exact
        path="/help/how-should-i-cite-discoveries-made-using-gnomad-data"
        render={() => <Redirect to="/publications" />}
      />

      <Route
        exact
        path="/help/:topic"
        render={({ match }: any) => <HelpTopicPage topicId={match.params.topic} />}
      />

      <Route exact path="/help" component={HelpPage} />

      <Route
        exact
        path="/awesome"
        render={({ location }: any) => {
          const params = queryString.parse(location.search)
          // @ts-expect-error TS(2322) FIXME: Type 'string | (string | null)[] | null' is not as... Remove this comment to see the full error message
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
