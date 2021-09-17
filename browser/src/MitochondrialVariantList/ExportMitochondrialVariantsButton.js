import PropTypes from 'prop-types'
import React from 'react'

import { Button } from '@gnomad/ui'

import { FLAGS_CONFIG } from '../VariantList/VariantFlag'
import { getLabelForConsequenceTerm } from '../vepConsequences'

import MitochondrialVariantPropType from './MitochondrialVariantPropType'

const BASE_COLUMNS = [
  {
    label: 'Variant ID',
    getValue: variant => variant.variant_id,
  },
  {
    label: 'Filters',
    getValue: variant => (variant.filters.length === 0 ? 'PASS' : variant.filters.join(',')),
  },
  {
    label: 'HGVS Consequence',
    getValue: variant => variant.hgvsp || variant.hgvsc || '',
  },
  {
    label: 'VEP Annotation',
    getValue: variant =>
      variant.consequence ? getLabelForConsequenceTerm(variant.consequence) : '',
  },
  {
    label: 'ClinVar Clinical Significance',
    getValue: variant => variant.clinical_significance || '',
  },
  {
    label: 'ClinVar Variation ID',
    getValue: variant => variant.clinvar_variation_id || '',
  },
  {
    label: 'Flags',
    getValue: variant => variant.flags.map(flag => FLAGS_CONFIG[flag].label).join(';'),
  },
  {
    label: 'Allele Number',
    getValue: variant => JSON.stringify(variant.an),
  },
  {
    label: 'Homoplasmic Allele Count',
    getValue: variant => JSON.stringify(variant.ac_hom),
  },
  {
    label: 'Homoplasmic Allele Frequency',
    getValue: variant => JSON.stringify(variant.af_hom),
  },
  {
    label: 'Heteroplasmic Allele Count',
    getValue: variant => JSON.stringify(variant.ac_het),
  },
  {
    label: 'Heteroplasmic Allele Frequency',
    getValue: variant => JSON.stringify(variant.af_het),
  },
  {
    label: 'Max observed heteroplasmy',
    getValue: variant => JSON.stringify(variant.max_heteroplasmy),
  },
]

const exportVariantsToCsv = (variants, baseFileName, includeGene) => {
  const columns = [...BASE_COLUMNS]
  if (includeGene) {
    columns.splice(2, 0, {
      label: 'Gene',
      getValue: variant => variant.gene_symbol || '',
    })
  }

  const headerRow = columns.map(c => c.label)

  const csv = `${headerRow}\r\n${variants
    .map(variant =>
      columns
        .map(c => c.getValue(variant))
        .map(val =>
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
  link.onClick = () => {
    URL.revokeObjectURL(url)
    link.remove()
  }
  document.body.appendChild(link)
  link.click()
}

const ExportMitochondrialVariantsButton = ({ exportFileName, includeGene, variants, ...rest }) => (
  <Button
    {...rest}
    onClick={() => {
      exportVariantsToCsv(variants, exportFileName, includeGene)
    }}
  >
    Export variants to CSV
  </Button>
)

ExportMitochondrialVariantsButton.propTypes = {
  exportFileName: PropTypes.string.isRequired,
  includeGene: PropTypes.bool,
  variants: PropTypes.arrayOf(MitochondrialVariantPropType).isRequired,
}

ExportMitochondrialVariantsButton.defaultProps = {
  includeGene: false,
}

export default ExportMitochondrialVariantsButton
