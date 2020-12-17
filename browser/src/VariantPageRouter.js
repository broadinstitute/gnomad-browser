import PropTypes from 'prop-types'
import React from 'react'

import { isVariantId, normalizeVariantId, isRsId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import StructuralVariantPage from './StructuralVariantPage/StructuralVariantPage'
import VariantPage from './VariantPage/VariantPage'
import MitochondrialVariantPage from './MitochondrialVariantPage/MitochondrialVariantPage'
import MNVPage from './MNVPage/MNVPage'

const VariantPageRouter = ({ datasetId, variantIdOrRsId, ...otherProps }) => {
  if (datasetId.startsWith('gnomad_sv')) {
    return (
      <StructuralVariantPage {...otherProps} datasetId={datasetId} variantId={variantIdOrRsId} />
    )
  }

  if (isVariantId(variantIdOrRsId)) {
    const normalizedVariantId = normalizeVariantId(variantIdOrRsId).replace(/^MT/, 'M')
    const [chrom, pos, ref, alt] = normalizedVariantId.split('-') // eslint-disable-line no-unused-vars
    if (ref.length === alt.length && ref.length > 1) {
      return <MNVPage {...otherProps} datasetId={datasetId} variantId={normalizedVariantId} />
    }

    if (chrom === 'M') {
      return (
        <MitochondrialVariantPage
          {...otherProps}
          datasetId={datasetId}
          variantId={normalizedVariantId}
        />
      )
    }

    return <VariantPage {...otherProps} datasetId={datasetId} variantId={normalizedVariantId} />
  }

  if (isRsId(variantIdOrRsId)) {
    return <VariantPage {...otherProps} datasetId={datasetId} rsId={variantIdOrRsId} />
  }

  return (
    <Page>
      <DocumentTitle title="Invalid variant ID" />
      <PageHeading>Invalid Variant ID</PageHeading>
      <p>Variant IDs must be chrom-pos-ref-alt or rsIDs.</p>
    </Page>
  )
}

VariantPageRouter.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantIdOrRsId: PropTypes.string.isRequired,
}

export default VariantPageRouter
