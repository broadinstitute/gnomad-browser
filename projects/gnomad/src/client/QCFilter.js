import PropTypes from 'prop-types'
import React from 'react'

import { Badge } from '@broad/ui'

const FILTER_DESCRIPTIONS = {
  AC0: 'Allele count is zero (i.e. no high-confidence genotype)',
  AS_VQSR: 'Failed allele-specific variant quality recalibration',
  InbreedingCoeff: 'Has an inbreeding coefficient < -0.3',
  RF: 'Failed random forest filters',
}

const QCFilter = ({ filter }) => (
  <Badge level="warning" tooltip={FILTER_DESCRIPTIONS[filter]}>
    {filter}
  </Badge>
)

QCFilter.propTypes = {
  filter: PropTypes.oneOf(['AC0', 'AS_VQSR', 'InbreedingCoeff', 'RF']).isRequired,
}

export default QCFilter
