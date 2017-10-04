import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { currentVariantData } from '@broad/gene-page/src/resources/variants'

const VariantPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const VariantProperty = styled.div`
  margin-bottom: 10px;
  font-size: 14px;
`

const VariantPage = ({ variantData }) => {
  return (
    <VariantPageWrapper>
      <h1>{variantData.variant_id}</h1>
      {variantData.toOrderedMap().map((value, key) =>
        <VariantProperty><strong>{key}</strong> {value}</VariantProperty>)}
    </VariantPageWrapper>
  )
}
VariantPage.propTypes = {
  variantData: PropTypes.object.isRequired,
}

export default connect(
  state => ({
    variantData: currentVariantData(state),
  })
)(VariantPage)
