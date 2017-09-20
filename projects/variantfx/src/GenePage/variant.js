import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { currentVariantData } from '@broad/gene-page/src/resources/variants'

import { processCardioVariant } from '../utilities'

const VariantContainer = styled.div`
  display: flex;
  flex-direction: row;
`

const Variant = ({ variant }) => {
  if (!variant) {
    return <div></div>
  }
  const processedVariant = processCardioVariant(variant)
  return <div>{JSON.stringify(processedVariant)}</div>
}
Variant.propTypes = {
  variant: PropTypes.object,
}

export default connect(
  state => ({
    variant: currentVariantData(state),
  })
)(Variant)
