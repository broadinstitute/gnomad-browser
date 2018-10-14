import PropTypes from 'prop-types'
import React from 'react'

import { Page } from '@broad/ui'

import StatusMessage from '../StatusMessage'
import GnomadVariantPage from './GnomadVariantPage'

const VariantPage = ({ datasetId, variantId }) => {
  if (datasetId === 'exac') {
    window.location = `http://exac.broadinstitute.org/variant/${variantId}`
    return null
  }

  if (datasetId === 'gnomad_r2_0_2') {
    return (
      <Page>
        <StatusMessage>gnomAD 2.0.2 not supported</StatusMessage>
      </Page>
    )
  }

  return <GnomadVariantPage datasetId={datasetId} variantId={variantId} />
}

VariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantPage
