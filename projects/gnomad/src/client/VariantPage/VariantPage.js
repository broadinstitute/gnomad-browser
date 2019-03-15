import PropTypes from 'prop-types'
import React from 'react'

import StructuralVariantPage from '../StructuralVariantPage/StructuralVariantPage'
import GnomadVariantPage from './GnomadVariantPage'

const VariantPage = ({ datasetId, variantId, ...otherProps }) => {
  if (datasetId === 'exac') {
    window.location = `http://exac.broadinstitute.org/variant/${variantId}`
    return null
  }

  if (datasetId === 'gnomad_sv_r2') {
    return <StructuralVariantPage {...otherProps} datasetId={datasetId} variantId={variantId} />
  }

  return <GnomadVariantPage {...otherProps} datasetId={datasetId} variantId={variantId} />
}

VariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantPage
