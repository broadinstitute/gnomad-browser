import React from 'react'

import { Badge } from '@gnomad/ui'

type Flag = {
  label: string
  level: 'info' | 'warning' | 'error' | 'success' | undefined
  formatTooltip: (input: any) => string
}

export const FLAGS_CONFIG: Record<string, Flag> = {
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
      'Other Splice Predicted Loss-of-Function: this variant is predicted to create or disrupt a splice site outside the canonical splice site (beta)',
  },
  mnv: {
    label: 'MNV',
    level: 'error',
    formatTooltip: () =>
      'Multi-nucleotide variant: this variant is found in phase with another variant in some individuals, altering the amino acid sequence\nVariant annotation dubious',
  },
  monoallelic: {
    label: 'Monoallelic',
    level: 'info',
    formatTooltip: () => 'All samples are homozygous alternate for the variant',
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
  type: string
  variant: any
}

const VariantFlag = ({ type, variant }: Props) => {
  if (type in FLAGS_CONFIG) {
    const { label, level, formatTooltip } = FLAGS_CONFIG[type as keyof typeof FLAGS_CONFIG]
    return (
      <Badge level={level} tooltip={formatTooltip(variant)}>
        {label}
      </Badge>
    )
  }

  return null
}

export default VariantFlag
