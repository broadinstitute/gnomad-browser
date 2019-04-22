import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { finalFilteredVariants, isLoadingVariants } from '@broad/redux-variants'
import { Button } from '@broad/ui'

import downloadCSV from '../downloadCSV'
import columns from './variantTableColumns'

const ExportVariantsButton = styled(Button)`
  margin-left: 0.5em;

  @media (max-width: 700px) {
    margin-top: 0.5em;
    margin-left: 0;
  }
`

const exportVariantsToCSV = (variants, baseFileName) => {
  const headerRow = columns.map(col => col.heading)
  const dataRows = variants.map(variant =>
    columns.map(col => (col.renderForCSV ? col.renderForCSV(variant, col.key) : variant[col.key]))
  )
  downloadCSV([headerRow].concat(dataRows), baseFileName)
}

export default connect((state, ownProps) => {
  const variants = finalFilteredVariants(state)
  return {
    disabled: isLoadingVariants(state) || variants.size === 0,
    onClick: () => exportVariantsToCSV(variants.toJS(), ownProps.exportFileName),
  }
})(({ exportFileName, ...buttonProps }) => (
  <ExportVariantsButton {...buttonProps}>Export variants to CSV</ExportVariantsButton>
))
