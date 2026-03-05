import React from 'react'
import { Badge } from '@gnomad/ui'

const GENE_FLAGS_TO_RENDER: Record<string, string> = {
  low_exome_coverage:
    'This gene is not well covered in the gnomAD v4.1.1 exomes. Allele frequency estimates in the exomes and gene constraint metrics may not be reliable.',
  low_exome_mapping_quality:
    'This gene has poor read mapping statistics in the gnomAD v4.1.1 exomes. Allele frequency estimates in the exomes and gene constraint metrics may not be reliable.',
}

const GeneWarnings = ({ flags }: { flags: string[] }) =>
  flags
    .filter((flag) => flag in GENE_FLAGS_TO_RENDER)
    .map((flag) => {
      return (
        <p>
          <Badge level="warning">Warning</Badge> {GENE_FLAGS_TO_RENDER[flag]}
        </p>
      )
    })

export default GeneWarnings
