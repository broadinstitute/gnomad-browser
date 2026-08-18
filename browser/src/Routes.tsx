import React, { lazy } from 'react'
import queryString from 'query-string'
import { Redirect, Route, Switch } from 'react-router-dom'

import { isRegionId, normalizeRegionId } from '@gnomad/identifiers'
import { parseTrLocusId } from '@gnomad/dataset-metadata/longReadTrLocusId'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { parseLongReadCohort } from './LongReadVariantPage/longReadCohort'
import { getSearchDatasetForSelectedDataset } from './search'

// Content pages
const AcOfOnePage = lazy(() => import('./AcOfOnePage'))
const AboutPage = lazy(() => import('./AboutPage'))
const TeamPage = lazy(() => import('./TeamPage/TeamPage'))
const ContactPage = lazy(() => import('./ContactPage'))
const DataPage = lazy(() => import('./DataPage/DataPage'))
const FederationPage = lazy(() => import('./FederationPage'))
const HelpPage = lazy(() => import('./help/HelpPage'))
const HelpTopicPage = lazy(() => import('./help/HelpTopicPage'))
const HomePage = lazy(() => import('./HomePage'))
const MOUPage = lazy(() => import('./MOUPage'))
const StatsPage = lazy(() => import('./StatsPage/StatsPage'))
const PublicationsPage = lazy(() => import('./PublicationsPage'))
const PoliciesPage = lazy(() => import('./PoliciesPage'))

const GenePageContainer = lazy(() => import('./GenePage/GenePageContainer'))
const RegionPageContainer = lazy(() => import('./RegionPage/RegionPageContainer'))
const HaplotypeRegionPageContainer = lazy(
  () => import('./HaplotypeRegionPage/HaplotypeRegionPageContainer')
)
const TrCatalogPage = lazy(() => import('./Haplotypes/TrCatalogPage'))
const LongReadExamplesPage = lazy(() => import('./LongReadExamplesPage'))
const LongReadExamples22Page = lazy(() => import('./LongReadExamples22Page'))
const LongReadLiteratureExamplesPage = lazy(() => import('./LongReadLiteratureExamplesPage'))
const LongReadLiteratureWorkflowPage = lazy(() => import('./LongReadLiteratureWorkflowPage'))
const ReferenceSequenceContextPage = lazy(() => import('./ReferenceSequenceContextPage'))
const TranscriptPageContainer = lazy(() => import('./TranscriptPage/TranscriptPageContainer'))
const VariantPageRouter = lazy(() => import('./VariantPageRouter'))
const LongReadTandemRepeatPageContainer = lazy(
  () => import('./LongReadTandemRepeatPage/LongReadTandemRepeatPageContainer')
)

const ShortTandemRepeatPageContainer = lazy(
  () => import('./ShortTandemRepeatPage/ShortTandemRepeatPageContainer')
)
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
        path="/haplotype/region/:regionId"
        render={({ location, match }: any) => {
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
          return <HaplotypeRegionPageContainer datasetId={datasetId} regionId={regionId} />
        }}
      />

      <Route exact path="/haplotype/tr-catalog" component={TrCatalogPage} />

      <Route exact path="/long-read-examples" component={LongReadExamplesPage} />
      <Route exact path="/long-read-examples-22" component={LongReadExamples22Page} />
      <Route
        exact
        path="/long-read-literature-examples"
        component={LongReadLiteratureExamplesPage}
      />
      <Route
        exact
        path="/long-read-literature-examples/paper/:slug"
        component={LongReadLiteratureWorkflowPage}
      />
      <Route exact path="/reference-sequence-context" component={ReferenceSequenceContextPage} />

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
        render={({ location, match }: any) => {
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
        path="/tandem-repeat/:locusId"
        render={({ location, match }: any) => {
          const locus = parseTrLocusId(match.params.locusId)
          if (!locus) {
            return (
              <Page>
                <DocumentTitle title="Invalid tandem-repeat locus" />
                <PageHeading>Invalid tandem-repeat locus</PageHeading>
              </Page>
            )
          }
          const queryParams = queryString.parse(location.search)
          const datasetId = (queryParams.dataset || 'gnomad_r4_lr') as DatasetId
          const lrCohort = parseLongReadCohort(queryParams.lr_cohort) || 'hgsvc_hprc'
          const selectedAllele =
            typeof queryParams.allele === 'string' ? queryParams.allele : undefined
          if (locus.canonicalId !== match.params.locusId) {
            return (
              <Redirect to={{ ...location, pathname: `/tandem-repeat/${locus.canonicalId}` }} />
            )
          }
          return (
            <LongReadTandemRepeatPageContainer
              datasetId={datasetId}
              locusId={locus.canonicalId}
              lrCohort={lrCohort}
              selectedAllele={selectedAllele}
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
        path="/variant/:variantId([-A-Za-z0-9_.~]+)"
        render={({ location, match }: any) => {
          const queryParams = queryString.parse(location.search)
          const datasetId = queryParams.dataset || defaultDataset
          const lrCohort = parseLongReadCohort(queryParams.lr_cohort)
          return (
            <VariantPageRouter
              datasetId={datasetId}
              variantId={match.params.variantId}
              lrCohort={lrCohort}
            />
          )
        }}
      />

      <Route
        exact
        path="/variant-cooccurrence"
        render={({ location }: any) => {
          const params = queryString.parse(location.search)
          const datasetId = params.dataset || defaultDataset
          return <VariantCooccurrencePage datasetId={datasetId} />
        }}
      />

      <Route
        exact
        path="/short-tandem-repeats"
        render={({ location }: any) => {
          const queryParams = queryString.parse(location.search)
          const datasetId = queryParams.dataset || defaultDataset
          return <ShortTandemRepeatsPage datasetId={datasetId} />
        }}
      />

      <Route
        exact
        path="/short-tandem-repeat/:strId"
        render={({ location, match }: any) => {
          const queryParams = queryString.parse(location.search)
          const datasetId = queryParams.dataset || defaultDataset
          return <ShortTandemRepeatPageContainer datasetId={datasetId} strId={match.params.strId} />
        }}
      />

      <Route exact path="/AC1" component={AcOfOnePage} />

      <Route exact path="/about" component={AboutPage} />

      <Route exact path="/team" component={TeamPage} />

      <Route exact path="/federated" component={FederationPage} />

      {/* /downloads is the legacy path to the data page, which we still support here because there are lots of extant links to fragments within /downloads, and those get stripped if you use a redirect. */}
      <Route exact path="/downloads" component={DataPage} />

      <Route exact path="/data" component={DataPage} />

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
          return (
            <SearchRedirectPage
              query={params.query}
              datasetId={getSearchDatasetForSelectedDataset(params.dataset)}
              lrCohort={parseLongReadCohort(params.lr_cohort)}
            />
          )
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
