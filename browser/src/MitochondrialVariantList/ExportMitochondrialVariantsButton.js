import PropTypes from 'prop-types'
import React from 'react'

import { Button } from '@gnomad/ui'

import MitochondrialVariantPropType from './MitochondrialVariantPropType'

const columns = [
  {
    label: 'Variant ID',
    getValue: variant => variant.variant_id,
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

const exportVariantsToCsv = (variants, baseFileName) => {
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

const ExportMitochondrialVariantsButton = ({ exportFileName, variants, ...rest }) => (
  <Button
    {...rest}
    onClick={() => {
      exportVariantsToCsv(variants, exportFileName)
    }}
  >
    Export variants to CSV
  </Button>
)

ExportMitochondrialVariantsButton.propTypes = {
  exportFileName: PropTypes.string.isRequired,
  variants: PropTypes.arrayOf(MitochondrialVariantPropType).isRequired,
}

export default ExportMitochondrialVariantsButton
