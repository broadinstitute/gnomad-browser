import PropTypes from 'prop-types'
import React from 'react'

import { Badge } from '@broad/ui'

const flagProps = {
  lcr: {
    children: 'LCR',
    level: 'info',
    formatTooltip: () => 'Found in a low complexity region\nVariant annotation or quality dubious',
  },
  lc_lof: {
    children: 'LC pLoF',
    level: 'error',
    formatTooltip: variant =>
      `Low-confidence pLoF: ${variant.lof_filter}\nVariant annotation or quality dubious`,
  },
  lof_flag: {
    children: 'pLoF flag',
    level: 'warning',
    formatTooltip: variant =>
      `Flagged by LOFTEE: ${variant.lof_flags}\nVariant annotation or quality dubious`,
  },
  nc_transcript: {
    children: 'NC Transcript',
    level: 'error',
    formatTooltip: () => 'Non-protein-coding transcript\nVariant annotation dubious',
  },
  os_lof: {
    children: 'OS pLoF',
    level: 'info',
    formatTooltip: () =>
      'Variant predicted to create or disrupt a splice site outside the canonical splice site (beta)',
  },
  mnv: {
    children: 'MNV',
    level: 'error',
    formatTooltip: () => 'Multi-nucleotide variant\nVariant annotation dubious',
  },
}

const VariantFlag = ({ type, variant }) => {
  const { children, level, formatTooltip } = flagProps[type]
  return (
    <Badge level={level} tooltip={formatTooltip(variant)}>
      {children}
    </Badge>
  )
}

VariantFlag.propTypes = {
  type: PropTypes.oneOf(Object.keys(flagProps)).isRequired,
  variant: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
}

export default VariantFlag
