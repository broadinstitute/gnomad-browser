/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import RegionViewerComponent from '@broad/region'
import TranscriptTrack from '@broad/track-transcript'
import CoverageTrack from '@broad/track-coverage'
import VariantTrack from '@broad/track-variant'
import { exonPadding } from '@broad/gene-page/src/resources/active'
import { regionData } from '@broad/gene-page/src/resources/regions'
import NavigatorConnected from '@broad/gene-page/src/containers/NavigatorConnected'

import {
  coverageConfigClassic,
  coverageConfigNew,
  markerExacClassic,
  attributeConfig,
} from '@broad/gene-page/src/presentation/RegionViewerStyles'

import {
  finalFilteredVariants,
} from '@broad/gene-page/src/resources/variants'

const RegionViewer = ({
  regionData,
  allVariants,
  exonPadding,
  coverageStyle,
}) => {
  const {
    chrom,
    start,
    stop,
    exome_coverage,
    genome_coverage,
  } = regionData.toJS()

  const variantsReversed = allVariants.reverse()

  const allTrack = (
    <VariantTrack
      key={'All-variants'}
      title={`variants (${allVariants.size})`}
      height={60}
      color={'#75757'}
      markerConfig={markerExacClassic}
      variants={variantsReversed}
    />
  )

  const coverageConfig = coverageStyle === 'classic' ?
    coverageConfigClassic(exome_coverage, genome_coverage) :
    coverageConfigNew(exome_coverage, genome_coverage)

  const featuresToDisplay = ['default']

  const regions = [{
    chrom,
    start,
    stop,
    feature_type: 'default',
    strand: '+',
  }]

  return (
    <div>
      <RegionViewerComponent
        width={1000}
        padding={0}
        regions={regions}
        regionAttributes={attributeConfig}
        featuresToDisplay={featuresToDisplay}
      >
        <CoverageTrack
          title={'Coverage'}
          height={200}
          dataConfig={coverageConfig}
          yTickNumber={11}
          yMax={110}
        />
        {allTrack}
        <NavigatorConnected />
      </RegionViewerComponent>
    </div>
  )
}
RegionViewer.propTypes = {
  regionData: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  exonPadding: PropTypes.number.isRequired,
  coverageStyle: PropTypes.string,
}
RegionViewer.defaultProps = {
  coverageStyle: null,
}

export default connect(
  state => ({
    regionData: regionData(state),
    exonPadding: exonPadding(state),
    allVariants: finalFilteredVariants(state),
  }),
)(RegionViewer)
