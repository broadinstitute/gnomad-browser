import PropTypes from 'prop-types'
import React from 'react'

import { Page, PageHeading } from '@broad/ui'
import { isRegionId, normalizeRegionId } from '@broad/utilities'

import { referenceGenomeForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import { withWindowSize } from '../windowSize'
import RegionPage from './RegionPage'

const AutosizedRegionPage = withWindowSize(RegionPage)

const query = `
  query FetchRegion($chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
    region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
      reference_genome
      chrom
      start
      stop
      genes {
        gene_id
        symbol
        start
        stop
        exons {
          feature_type
          start
          stop
        }
      }
    }
  }
`

const RegionPageContainer = ({ datasetId, regionId, ...otherProps }) => {
  if (!isRegionId(regionId)) {
    return (
      <Page>
        <DocumentTitle title="Invalid region ID" />
        <PageHeading>Invalid region ID</PageHeading>
        <p>Regions IDs must be formatted chrom-start-stop.</p>
      </Page>
    )
  }

  const [chrom, startStr, stopStr] = normalizeRegionId(regionId).split('-')
  const start = parseInt(startStr, 10)
  const stop = parseInt(stopStr, 10)

  const variables = {chrom, start, stop}
  variables.referenceGenome = referenceGenomeForDataset(datasetId)
  variables.datasetId = datasetId

  return (
    <Query query={query} variables={variables}>
    {({ data, error, loading }) => {
      if (loading) {
        return <StatusMessage>Loading region...</StatusMessage>
      }

      if (error || !data || !data.region) {
        return <StatusMessage>Unable to load region</StatusMessage>
      }

      return (
        <AutosizedRegionPage
          {...otherProps}
          datasetId={datasetId}
          region={data.region}
          regionId={regionId}
        />
      )
    }}
    </Query>
  )
}

RegionPageContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
}

export default RegionPageContainer
