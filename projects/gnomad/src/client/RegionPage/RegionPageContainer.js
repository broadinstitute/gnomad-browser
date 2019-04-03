import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'

import { screenSize } from '@broad/ui'

import { Query } from '../Query'
import StatusMessage from '../StatusMessage'
import RegionPage from './RegionPage'

const SizedRegionPage = connect(state => ({ screenSize: screenSize(state) }))(RegionPage)

const RegionPageContainer = ({ datasetId, regionId, ...otherProps }) => {
  const [chrom, startStr, stopStr] = regionId.split('-')
  const start = parseInt(startStr, 10)
  const stop = parseInt(stopStr, 10)

  const query = `
    query FetchRegion($chrom: String!, $start: Int!, $stop: Int!) {
      region(chrom: $chrom, start: $start, stop: $stop) {
        chrom
        start
        stop
        genes {
          gene_id
          gene_name
          start
          stop
          transcript {
            exons {
              feature_type
              start
              stop
            }
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
          <SizedRegionPage
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
