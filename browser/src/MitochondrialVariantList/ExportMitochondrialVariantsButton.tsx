import React from 'react'

import { Button } from '@gnomad/ui'

import { FLAGS_CONFIG } from '../VariantList/VariantFlag'
import { getLabelForConsequenceTerm } from '../vepConsequences'

import { logButtonClick } from '../analytics'
import { exportTableToCsv } from '../exportTableToCsv'

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
    label: 'ClinVar Germline Classification',
    getValue: (variant: any) => variant.clinical_significance || '',
  },
  {
    label: 'ClinVar Variation ID',
    getValue: (variant: any) => variant.clinvar_variation_id || '',
  },
  {
    label: 'Flags',
    getValue: (variant: any) =>
      variant.flags.map((flag: string) => FLAGS_CONFIG[flag].label).join(';'),
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

const getColumns = (includeGene: any) => {
  const columns = [...BASE_COLUMNS]
  if (includeGene) {
    columns.splice(2, 0, {
      label: 'Gene',
      getValue: (variant) => variant.gene_symbol || '',
    })
  }

  return columns
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
      exportTableToCsv(variants, getColumns(includeGene), exportFileName)
      logButtonClick('Exported mitochondrial variants to CSV')
    }}
  >
    Export variants to CSV
  </Button>
)

ExportMitochondrialVariantsButton.defaultProps = {
  includeGene: false,
}

export default ExportMitochondrialVariantsButton
