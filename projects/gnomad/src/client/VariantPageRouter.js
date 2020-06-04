import PropTypes from 'prop-types'
import React from 'react'

import { isVariantId, normalizeVariantId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import StructuralVariantPage from './StructuralVariantPage/StructuralVariantPage'
import VariantPage from './VariantPage/VariantPage'
import MNVPage from './VariantPage/MultiNucleotideVariant/MNVPage'

const VariantPageRouter = ({ datasetId, variantId, ...otherProps }) => {
  if (datasetId.startsWith('gnomad_sv')) {
    return <StructuralVariantPage {...otherProps} datasetId={datasetId} variantId={variantId} />
  }

  // Other datasets require variant IDs in the chrom-pos-ref-alt format
  if (!isVariantId(variantId)) {
    return (
      <Page>
        <DocumentTitle title="Invalid variant ID" />
        <PageHeading>Invalid Variant ID</PageHeading>
        <p>Variant IDs must be formatted chrom-pos-ref-alt.</p>
      </Page>
    )
  }

  const normalizedVariantId = normalizeVariantId(variantId)
  const [chrom, pos, ref, alt] = normalizedVariantId.split('-') // eslint-disable-line no-unused-vars
  if (ref.length === alt.length && ref.length > 1) {
    return <MNVPage {...otherProps} datasetId={datasetId} variantId={normalizedVariantId} />
  }

  return <VariantPage {...otherProps} datasetId={datasetId} variantId={normalizedVariantId} />
}

VariantPageRouter.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantPageRouter
