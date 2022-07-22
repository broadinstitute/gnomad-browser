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
    formatTooltip: (variant: any) =>
      `Low-confidence pLoF: ${variant.lof_filter}\nVariant annotation or quality dubious`,
  },
  lof_flag: {
    label: 'pLoF flag',
    level: 'warning',
    formatTooltip: (variant: any) =>
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

type Props = {
  type: any // TODO: PropTypes.oneOf(Object.keys(FLAGS_CONFIG))
  variant: any
}

const VariantFlag = ({ type, variant }: Props) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const { label, level, formatTooltip } = FLAGS_CONFIG[type]
  return (
    <Badge level={level} tooltip={formatTooltip(variant)}>
      {label}
    </Badge>
  )
}

export default VariantFlag
