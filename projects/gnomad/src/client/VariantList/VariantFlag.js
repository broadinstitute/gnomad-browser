import PropTypes from 'prop-types'
import React from 'react'

import { Badge } from '@broad/ui'

const flagProps = {
  lcr: {
    children: 'LCR',
    level: 'info',
    tooltip: 'Found in a low complexity region\nVariant annotation or quality dubious',
  },
  lc_lof: {
    children: 'LC LoF',
    level: 'error',
    tooltip: 'Low-confidence LoF\nVariant annotation or quality dubious',
  },
  lof_flag: {
    children: 'LoF flag',
    level: 'warning',
    tooltip: 'Flagged by LOFTEE\nVariant annotation or quality dubious',
  },
  nc_transcript: {
    children: 'NC Transcript',
    level: 'error',
    tooltip: 'Non-protein-coding transcript\nVariant annotation dubious',
  },
  mnv: {
    children: 'MNV',
    level: 'error',
    tooltip: 'Multi-nucleotide variant\nVariant annotation dubious',
  },
}

const VariantFlag = ({ type }) => <Badge {...flagProps[type]} />

VariantFlag.propTypes = {
  type: PropTypes.oneOf(Object.keys(flagProps)).isRequired,
}

export default VariantFlag
