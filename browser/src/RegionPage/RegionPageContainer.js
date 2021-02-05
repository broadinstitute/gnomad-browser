import PropTypes from 'prop-types'
import React from 'react'

import { isRegionId, parseRegionId } from '@gnomad/identifiers'
import { Page, PageHeading } from '@gnomad/ui'

import { referenceGenomeForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import { withWindowSize } from '../windowSize'
import RegionPage from './RegionPage'

const AutosizedRegionPage = withWindowSize(RegionPage)

const RegionPageContainer = ({ datasetId, regionId }) => {
  if (!isRegionId(regionId)) {
    return (
      <Page>
        <DocumentTitle title="Invalid region ID" />
        <PageHeading>Invalid region ID</PageHeading>
        <p>Regions IDs must be formatted chrom-start-stop.</p>
      </Page>
    )
  }

  const { chrom, start, stop } = parseRegionId(regionId)
  const referenceGenome = referenceGenomeForDataset(datasetId)

  return (
    <AutosizedRegionPage
      datasetId={datasetId}
      region={{
        reference_genome: referenceGenome,
        chrom: chrom === 'MT' ? 'M' : chrom,
        start,
        stop,
      }}
    />
  )
}

RegionPageContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
}

export default RegionPageContainer
