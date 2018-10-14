import PropTypes from 'prop-types'
import React from 'react'

import { Query } from '../../Query'

const query = `
query AggregateQualityMetrics ($datasetId: DatasetsSupportingFetchAggregateQualityMetrics!) {
  aggregateQualityMetrics(dataset: $datasetId) {
    exome {
      siteQuality {
        singleton {
          bin_edges
          bin_freq
          n_smaller
          n_larger
        }
        doubleton {
          bin_edges
          bin_freq
          n_smaller
          n_larger
        }
        af_bins {
          min_af
          max_af
          histogram {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
      }
      otherMetrics {
        metric
        histogram {
          bin_edges
          bin_freq
          n_smaller
          n_larger
        }
      }
    }
    genome {
      siteQuality {
        singleton {
          bin_edges
          bin_freq
          n_smaller
          n_larger
        }
        doubleton {
          bin_edges
          bin_freq
          n_smaller
          n_larger
        }
        af_bins {
          min_af
          max_af
          histogram {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
      }
      otherMetrics {
        metric
        histogram {
          bin_edges
          bin_freq
          n_smaller
          n_larger
        }
      }
    }
  }
}
`

export const AggregateQualityMetricsQuery = ({ children, datasetId }) => (
  <Query query={query} variables={{ datasetId }}>
    {children}
  </Query>
)

AggregateQualityMetricsQuery.propTypes = {
  children: PropTypes.func.isRequired,
  datasetId: PropTypes.string.isRequired,
}
