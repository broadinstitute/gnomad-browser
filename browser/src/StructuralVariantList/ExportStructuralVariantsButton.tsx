import React from 'react'

import { Button } from '@gnomad/ui'

import { svConsequenceLabels } from './structuralVariantConsequences'
import { StructuralVariant } from '../StructuralVariantPage/StructuralVariantPage'
import { svTypeLabels } from './structuralVariantTypes'
import { logButtonClick } from '../analytics'
import { exportTableToCsv } from '../exportTableToCsv'

const columns = [
  {
    label: 'Variant ID',
    getValue: (variant: any) => variant.variant_id,
  },
  {
    label: 'Consequence',
    getValue: (variant: any) => {
      const { consequence } = variant
      if (consequence) {
        return svConsequenceLabels[consequence]
      }
      if (variant.intergenic) {
        return 'intergenic'
      }
      return ''
    },
  },
  {
    label: 'Class',
    getValue: (variant: any) => svTypeLabels[variant.type] || variant.type,
  },
  {
    label: 'Position',
    getValue: (variant: any) => {
      if (variant.type === 'INS') {
        return `${variant.pos}`
      }

      if (variant.type === 'BND' || variant.type === 'CTX') {
        return `${variant.chrom}:${variant.pos}-${variant.end}|${variant.chrom2}:${variant.pos2}-${variant.end2}`
      }

      return `${variant.pos}-${variant.end}`
    },
  },
  {
    label: 'Size',
    getValue: (variant: any) => {
      if (variant.type === 'CTX' || variant.type === 'BND' || variant.length === -1) {
        return ''
      }

      return `${variant.length}`
    },
  },
  {
    label: 'Allele Count',
    getValue: (variant: any) => JSON.stringify(variant.ac),
  },
  {
    label: 'Allele Number',
    getValue: (variant: any) => JSON.stringify(variant.an),
  },
  {
    label: 'Allele Frequency',
    getValue: (variant: any) => JSON.stringify(variant.af),
  },
  {
    label: 'Homozygote Count',
    getValue: (variant: any) => JSON.stringify(variant.ac_hom),
  },
]

type ExportStructuralVariantsButtonProps = {
  exportFileName: string
  variants: StructuralVariant[]
}

const ExportStructuralVariantsButton = ({
  exportFileName,
  variants,
  ...rest
}: ExportStructuralVariantsButtonProps) => (
  <Button
    {...rest}
    onClick={() => {
      exportTableToCsv(variants, columns, exportFileName)
      logButtonClick('Exported structural variants to CSV')
    }}
  >
    Export variants to CSV
  </Button>
)

export default ExportStructuralVariantsButton
