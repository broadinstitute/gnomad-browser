import PropTypes from 'prop-types'
import React, { lazy } from 'react'

import { isVariantId, normalizeVariantId, isRsId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'

const MitochondrialVariantPage = lazy(() =>
  import('./MitochondrialVariantPage/MitochondrialVariantPage')
)
const MNVPage = lazy(() => import('./MNVPage/MNVPage'))
const StructuralVariantPage = lazy(() => import('./StructuralVariantPage/StructuralVariantPage'))
const VariantPage = lazy(() => import('./VariantPage/VariantPage'))

const VariantPageRouter = ({ datasetId, variantId }) => {
  if (datasetId.startsWith('gnomad_sv')) {
    return <StructuralVariantPage datasetId={datasetId} variantId={variantId} />
  }

  if (isVariantId(variantId)) {
    const normalizedVariantId = normalizeVariantId(variantId).replace(/^MT/, 'M')
    const [chrom, pos, ref, alt] = normalizedVariantId.split('-') // eslint-disable-line no-unused-vars
    if (ref.length === alt.length && ref.length > 1) {
      return <MNVPage datasetId={datasetId} variantId={normalizedVariantId} />
    }

    if (chrom === 'M') {
      return <MitochondrialVariantPage datasetId={datasetId} variantId={normalizedVariantId} />
    }

    return <VariantPage datasetId={datasetId} variantId={normalizedVariantId} />
  }

  if (isRsId(variantId)) {
    return <VariantPage datasetId={datasetId} rsId={variantId} />
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
  variantId: PropTypes.string.isRequired,
}

export default VariantPageRouter
