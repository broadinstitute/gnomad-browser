import PropTypes from 'prop-types'
import React from 'react'

import { Query } from '../../Query'

const query = `
query AggregateQualityMetrics ($dataset: AggregateQualityMetricsDataset!) {
  aggregateQualityMetrics(dataset: $dataset) {
    AB_MEDIAN { bins { x0 x1 n } }
    AS_RF { bins { x0 x1 n } }
    BaseQRankSum { bins { x0 x1 n } }
    ClippingRankSum { bins { x0 x1 n } }
    DP { bins { x0 x1 n } }
    DP_MEDIAN { bins { x0 x1 n } }
    DREF_MEDIAN { bins { x0 x1 n } }
    FS { bins { x0 x1 n } }
    GQ_MEDIAN { bins { x0 x1 n } }
    InbreedingCoeff { bins { x0 x1 n } }
    MQ { bins { x0 x1 n } }
    MQRankSum { bins { x0 x1 n } }
    QD { bins { x0 x1 n } }
    ReadPosRankSum { bins { x0 x1 n } }
    SiteQuality {
      singleton { bins { x0 x1 n } }
      doubleton { bins { x0 x1 n } }
      af_bins {
        max_af
        min_af
        bins { x0 x1 n }
      }
    },
    VQSLOD { bins { x0 x1 n } }
  }
}
`

export const AggregateQualityMetricsQuery = ({ children, dataset }) => (
  <Query query={query} variables={{ dataset }}>
    {children}
  </Query>
)

AggregateQualityMetricsQuery.propTypes = {
  children: PropTypes.func.isRequired,
  dataset: PropTypes.oneOf(['gnomadExomes', 'gnomadGenomes']).isRequired,
}
