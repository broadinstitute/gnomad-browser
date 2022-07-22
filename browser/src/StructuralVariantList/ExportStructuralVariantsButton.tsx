import React from 'react'

import { Button } from '@gnomad/ui'

import { svConsequenceLabels } from './structuralVariantConsequences'
import StructuralVariantPropType from './StructuralVariantPropType'
import { svTypeLabels } from './structuralVariantTypes'

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
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

const exportVariantsToCsv = (variants: any, baseFileName: any) => {
  const headerRow = columns.map((c) => c.label)

  const csv = `${headerRow}\r\n${variants
    .map((variant: any) =>
      columns
        .map((c) => c.getValue(variant))
        .map((val) =>
          val.includes(',') || val.includes('"') || val.includes("'")
            ? `"${val.replace('"', '""')}"`
            : val
        )
        .join(',')
    )
    .join('\r\n')}\r\n`

  const date = new Date()
  const timestamp = `${date.getFullYear()}_${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}_${date
    .getDate()
    .toString()
    .padStart(2, '0')}_${date
    .getHours()
    .toString()
    .padStart(2, '0')}_${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}_${date.getSeconds().toString().padStart(2, '0')}`

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${baseFileName.replace(/\s+/g, '_')}_${timestamp}.csv`)
  // @ts-expect-error TS(2551) FIXME: Property 'onClick' does not exist on type 'HTMLAnc... Remove this comment to see the full error message
  link.onClick = () => {
    URL.revokeObjectURL(url)
    link.remove()
  }
  document.body.appendChild(link)
  link.click()
}

type ExportStructuralVariantsButtonProps = {
  exportFileName: string
  variants: StructuralVariantPropType[]
}

const ExportStructuralVariantsButton = ({
  exportFileName,
  variants,
  ...rest
}: ExportStructuralVariantsButtonProps) => (
  <Button
    {...rest}
    onClick={() => {
      exportVariantsToCsv(variants, exportFileName)
    }}
  >
    Export variants to CSV
  </Button>
)

export default ExportStructuralVariantsButton
