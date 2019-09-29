import PropTypes from 'prop-types'
import React from 'react'

import Query from '../Query'
import StatusMessage from '../StatusMessage'
import { withWindowSize } from '../windowSize'
import RegionPage from './RegionPage'

const AutosizedRegionPage = withWindowSize(RegionPage)

const RegionPageContainer = ({ datasetId, regionId, ...otherProps }) => {
  const [chrom, startStr, stopStr] = regionId.split('-')
  const start = parseInt(startStr, 10)
  const stop = parseInt(stopStr, 10)

  const query = `
    query FetchRegion($chrom: String!, $start: Int!, $stop: Int!) {
      region(chrom: $chrom, start: $start, stop: $stop) {
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

  return (
    <Query query={query} variables={{ chrom, start, stop }}>
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
