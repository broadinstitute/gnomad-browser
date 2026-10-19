import React from 'react'

import { Button } from '@gnomad/ui'

import { cnvTypeLabels } from './copyNumberVariantTypes'
import { CopyNumberVariant } from '../CopyNumberVariantPage/CopyNumberVariantPage'
import { logButtonClick } from '../analytics'
import { exportTableToCsv } from '../exportTableToCsv'

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
      exportTableToCsv(variants, columns, exportFileName)
      logButtonClick('Exported copy number variants to CSV')
    }}
  >
    Export variants to CSV
  </Button>
)

export default ExportCopyNumberVariantsButton
