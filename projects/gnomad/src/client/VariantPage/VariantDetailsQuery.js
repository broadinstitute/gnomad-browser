import PropTypes from 'prop-types'
import React from 'react'

import Query from '../Query'

import gnomadVariantQuery from './queries/gnomadVariantQuery'

export const VariantDetailsQuery = ({ children, datasetId, variantId }) => (
  <Query query={gnomadVariantQuery} variables={{ datasetId, variantId }}>
    {children}
  </Query>
)

VariantDetailsQuery.propTypes = {
  children: PropTypes.func.isRequired,
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}
