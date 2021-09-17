import PropTypes from 'prop-types'
import React from 'react'

import { Badge } from '@gnomad/ui'

export const FLAGS_CONFIG = {
  lcr: {
    label: 'LCR',
    level: 'info',
    formatTooltip: () => 'Found in a low complexity region\nVariant annotation or quality dubious',
  },
  lc_lof: {
    label: 'LC pLoF',
    level: 'error',
    formatTooltip: variant =>
      `Low-confidence pLoF: ${variant.lof_filter}\nVariant annotation or quality dubious`,
  },
  lof_flag: {
    label: 'pLoF flag',
    level: 'warning',
    formatTooltip: variant =>
      `Flagged by LOFTEE: ${variant.lof_flags}\nVariant annotation or quality dubious`,
  },
  nc_transcript: {
    label: 'NC Transcript',
    level: 'error',
    formatTooltip: () => 'Non-protein-coding transcript\nVariant annotation dubious',
  },
  os_lof: {
    label: 'OS pLoF',
    level: 'info',
    formatTooltip: () =>
      'Variant predicted to create or disrupt a splice site outside the canonical splice site (beta)',
  },
  mnv: {
    label: 'MNV',
    level: 'error',
    formatTooltip: () =>
      'Multi-nucleotide variant: this variant is found in phase with another variant in some individuals, altering the amino acid sequence\nVariant annotation dubious',
  },
  // Mitochondrial variants
  common_low_heteroplasmy: {
    label: 'Common Low Heteroplasmy',
    level: 'warning',
    formatTooltip: () =>
      'Variant is present at an overall frequency of .001 across all samples with a heteroplasmy level > 0 and < 0.50',
  },
}

const VariantFlag = ({ type, variant }) => {
  const { label, level, formatTooltip } = FLAGS_CONFIG[type]
  return (
    <Badge level={level} tooltip={formatTooltip(variant)}>
      {label}
    </Badge>
  )
}

VariantFlag.propTypes = {
  type: PropTypes.oneOf(Object.keys(FLAGS_CONFIG)).isRequired,
  variant: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
}

export default VariantFlag
