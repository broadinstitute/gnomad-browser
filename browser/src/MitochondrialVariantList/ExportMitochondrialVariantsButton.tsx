import React from 'react'

import { Button } from '@gnomad/ui'

import { FLAGS_CONFIG } from '../VariantList/VariantFlag'
import { getLabelForConsequenceTerm } from '../vepConsequences'

import MitochondrialVariantPropType from './MitochondrialVariantPropType'

const BASE_COLUMNS = [
  {
    label: 'Variant ID',
    getValue: (variant: any) => variant.variant_id,
  },
  {
    label: 'Filters',
    getValue: (variant: any) => (variant.filters.length === 0 ? 'PASS' : variant.filters.join(',')),
  },
  {
    label: 'HGVS Consequence',
    getValue: (variant: any) => variant.hgvsp || variant.hgvsc || '',
  },
  {
    label: 'VEP Annotation',
    getValue: (variant: any) =>
      variant.consequence ? getLabelForConsequenceTerm(variant.consequence) : '',
  },
  {
    label: 'ClinVar Clinical Significance',
    getValue: (variant: any) => variant.clinical_significance || '',
  },
  {
    label: 'ClinVar Variation ID',
    getValue: (variant: any) => variant.clinvar_variation_id || '',
  },
  {
    label: 'Flags',
    getValue: (variant: any) =>
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      variant.flags.map((flag: any) => FLAGS_CONFIG[flag].label).join(';'),
  },
  {
    label: 'Allele Number',
    getValue: (variant: any) => JSON.stringify(variant.an),
  },
  {
    label: 'Homoplasmic Allele Count',
    getValue: (variant: any) => JSON.stringify(variant.ac_hom),
  },
  {
    label: 'Homoplasmic Allele Frequency',
    getValue: (variant: any) => JSON.stringify(variant.af_hom),
  },
  {
    label: 'Heteroplasmic Allele Count',
    getValue: (variant: any) => JSON.stringify(variant.ac_het),
  },
  {
    label: 'Heteroplasmic Allele Frequency',
    getValue: (variant: any) => JSON.stringify(variant.af_het),
  },
  {
    label: 'Max observed heteroplasmy',
    getValue: (variant: any) => JSON.stringify(variant.max_heteroplasmy),
  },
]

const exportVariantsToCsv = (variants: any, baseFileName: any, includeGene: any) => {
  const columns = [...BASE_COLUMNS]
  if (includeGene) {
    columns.splice(2, 0, {
      label: 'Gene',
      getValue: (variant) => variant.gene_symbol || '',
    })
  }

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

type OwnProps = {
  exportFileName: string
  includeGene?: boolean
  // @ts-expect-error TS(2749) FIXME: 'MitochondrialVariantPropType' refers to a value, ... Remove this comment to see the full error message
  variants: MitochondrialVariantPropType[]
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof ExportMitochondrialVariantsButton.defaultProps

// @ts-expect-error TS(7022) FIXME: 'ExportMitochondrialVariantsButton' implicitly has... Remove this comment to see the full error message
const ExportMitochondrialVariantsButton = ({
  exportFileName,
  includeGene,
  variants,
  ...rest
}: Props) => (
  <Button
    {...rest}
    onClick={() => {
      exportVariantsToCsv(variants, exportFileName, includeGene)
    }}
  >
    Export variants to CSV
  </Button>
)

ExportMitochondrialVariantsButton.defaultProps = {
  includeGene: false,
}

export default ExportMitochondrialVariantsButton
