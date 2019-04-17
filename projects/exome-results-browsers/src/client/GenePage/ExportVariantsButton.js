import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Button as BaseButton } from '@broad/ui'

import downloadCSV from '../downloadCSV'
import columns from './variantTableColumns'

const Button = styled(BaseButton)`
  @media (max-width: 700px) {
    margin-top: 0.5em;
  }
`

const exportVariantsToCSV = (variants, baseFileName) => {
  const headerRow = columns.map(col => col.heading)
  const dataRows = variants.map(variant =>
    columns.map(col => (col.renderForCSV ? col.renderForCSV(variant, col.key) : variant[col.key]))
  )
  downloadCSV([headerRow].concat(dataRows), baseFileName)
}

const ExportVariantsButton = ({ exportFileName, variants, ...rest }) => (
  <Button
    {...rest}
    disabled={variants.length === 0}
    onClick={() => {
      exportVariantsToCSV(variants, exportFileName)
    }}
  >
    Export variants to CSV
  </Button>
)

ExportVariantsButton.propTypes = {
  exportFileName: PropTypes.string.isRequired,
  variants: PropTypes.arrayOf(PropTypes.object).isRequired,
}

export default ExportVariantsButton
