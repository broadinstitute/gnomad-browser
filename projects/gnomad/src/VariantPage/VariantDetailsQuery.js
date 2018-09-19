import PropTypes from 'prop-types'
import React from 'react'

import { Query } from '../Query'

import exacVariantQuery from './queries/exacVariantQuery'
import gnomadVariantQuery from './queries/gnomadVariantQuery'

export const VariantDetailsQuery = ({ children, dataset, variantId }) => (
  <Query
    query={dataset === 'exac' ? exacVariantQuery : gnomadVariantQuery}
    variables={{ variantId }}
  >
    {children}
  </Query>
)

VariantDetailsQuery.propTypes = {
  children: PropTypes.func.isRequired,
  dataset: PropTypes.oneOf(['exac', 'gnomad']).isRequired,
  variantId: PropTypes.string.isRequired,
}
