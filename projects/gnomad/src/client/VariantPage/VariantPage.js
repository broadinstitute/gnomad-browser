import PropTypes from 'prop-types'
import React from 'react'

import GnomadVariantPage from './GnomadVariantPage'

const VariantPage = ({ datasetId, variantId, ...otherProps }) => {
  if (datasetId === 'exac') {
    window.location = `http://exac.broadinstitute.org/variant/${variantId}`
    return null
  }

  return <GnomadVariantPage {...otherProps} datasetId={datasetId} variantId={variantId} />
}

VariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantPage
