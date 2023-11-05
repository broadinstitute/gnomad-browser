import React from 'react'

import { Button } from '@gnomad/ui'

import { cnvTypeLabels } from './copyNumberVariantTypes'
import { CopyNumberVariant } from '../CopyNumberVariantPage/CopyNumberVariantPage'

const columns = [
  {
    label: 'Variant ID',
    getValue: (variant: CopyNumberVariant) => variant.variant_id,
  },
  {
    label: 'Class',
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    getValue: (variant: CopyNumberVariant) => cnvTypeLabels[variant.type] || variant.type,
  },
  {
    label: 'Position',
    getValue: (variant: CopyNumberVariant) => {
      return `${variant.pos}-${variant.end}`
    },
  },
  {
    label: 'Size',
    getValue: (variant: CopyNumberVariant) => {
      return `${variant.length}`
    },
  },
  {
    label: 'Site Count',
    getValue: (variant: CopyNumberVariant) => JSON.stringify(variant.sc),
  },
  {
    label: 'Site Number',
    getValue: (variant: CopyNumberVariant) => JSON.stringify(variant.sn),
  },
  {
    label: 'Site Frequency',
    getValue: (variant: CopyNumberVariant) => JSON.stringify(variant.sf),
  },
]

const exportVariantsToCsv = (variants: CopyNumberVariant[], baseFileName: any) => {
  const headerRow = columns.map((c) => c.label)

  const csv = `${headerRow}\r\n${variants
    .map((variant: CopyNumberVariant) =>
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

type ExportCopyNumberVariantsButtonProps = {
  exportFileName: string
  variants: any[]
}

const ExportCopyNumberVariantsButton = ({
  exportFileName,
  variants,
  ...rest
}: ExportCopyNumberVariantsButtonProps) => (
  <Button
    {...rest}
    onClick={() => {
      exportVariantsToCsv(variants, exportFileName)
    }}
  >
    Export variants to CSV
  </Button>
)

export default ExportCopyNumberVariantsButton
