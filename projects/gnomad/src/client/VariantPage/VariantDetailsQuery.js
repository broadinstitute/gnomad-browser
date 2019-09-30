import PropTypes from 'prop-types'
import React from 'react'

import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'

import exacVariantQuery from './queries/exacVariantQuery'
import gnomadVariantQuery from './queries/gnomadVariantQuery'

export const VariantDetailsQuery = ({ children, datasetId, variantId }) => (
  <Query
    query={datasetId === 'exac' ? exacVariantQuery : gnomadVariantQuery}
    variables={{ datasetId, variantId, referenceGenome: referenceGenomeForDataset(datasetId) }}
  >
    {children}
  </Query>
)

VariantDetailsQuery.propTypes = {
  children: PropTypes.func.isRequired,
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}
