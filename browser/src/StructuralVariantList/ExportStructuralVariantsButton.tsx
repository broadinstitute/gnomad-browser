import React from 'react'

import { Button } from '@gnomad/ui'

import { svConsequenceLabels } from './structuralVariantConsequences'
import { StructuralVariant } from '../StructuralVariantPage/StructuralVariantPage'
import { svTypeLabels } from './structuralVariantTypes'

type ColumnSpecifier = { label: string; getValue: (_: StructuralVariant) => string }

const columns: ColumnSpecifier[] = [
  {
    label: 'Variant ID',
    getValue: (variant) => variant.variant_id,
  },
  {
    label: 'Consequence',
    getValue: (variant) => {
      const { major_consequence } = variant
      if (major_consequence) {
        return svConsequenceLabels[major_consequence]
      }
      return ''
    },
  },
  {
    label: 'Class',
    getValue: (variant) => {
      if (variant.type) {
        return svTypeLabels[variant.type] || variant.type
      }
      return ''
    },
  },
  {
    label: 'Position',
    getValue: (variant) => {
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
    getValue: (variant) => {
      if (variant.type === 'CTX' || variant.type === 'BND' || variant.length === -1) {
        return ''
      }

      return `${variant.length}`
    },
  },
  {
    label: 'Allele Count',
    getValue: (variant) => JSON.stringify(variant.ac),
  },
  {
    label: 'Allele Number',
    getValue: (variant) => JSON.stringify(variant.an),
  },
  {
    label: 'Allele Frequency',
    getValue: (variant) => JSON.stringify(variant.af),
  },
  {
    label: 'Homozygote Count',
    getValue: (variant) => JSON.stringify(variant.ac_hom),
  },
]

const exportVariantsToCsv = (variants: StructuralVariant[], baseFileName: string) => {
  const headerRow = columns.map((c) => c.label)

  const csv = `${headerRow}\r\n${variants
    .map((variant) =>
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
    .padStart(2, '0')}_${date.getDate().toString().padStart(2, '0')}_${date
    .getHours()
    .toString()
    .padStart(2, '0')}_${date.getMinutes().toString().padStart(2, '0')}_${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`

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
      exportVariantsToCsv(variants, exportFileName)
    }}
  >
    Export variants to CSV
  </Button>
)

export default ExportStructuralVariantsButton
