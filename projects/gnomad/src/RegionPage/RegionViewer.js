import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
// import styled from 'styled-components'

import RegionViewerComponent from '@broad/region'
import CoverageTrack from '@broad/track-coverage'
import VariantTrack from '@broad/track-variant'
import StackedBarTrack from '@broad/track-stacked-bar'

import { GenesTrack } from '@broad/track-genes'

import { actions as activeActions } from '@broad/gene-page/src/resources/active'
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
  selectedVariantDataset,
} from '@broad/gene-page/src/resources/variants'

const RegionViewer = ({
  regionData,
  allVariants,
  selectedVariantDataset,
  onGeneClick,
}) => {
  const {
    chrom,
    start,
    stop,
    exome_coverage,
    genome_coverage,
    genes,
    gnomad_consequence_buckets: { buckets },
  } = regionData.toJS()

  const showVariants = false

  const variantsReversed = allVariants.reverse()

  const coverageConfig = selectedVariantDataset === 'exacVariants' ?
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
        <GenesTrack onGeneClick={onGeneClick} genes={genes} />
        {showVariants &&
          <VariantTrack
            key={'All-variants'}
            title={`variants (${allVariants.size})`}
            height={60}
            color={'#75757'}
            markerConfig={markerExacClassic}
            variants={variantsReversed}
          />}
        <StackedBarTrack height={150} data={buckets} />
        <NavigatorConnected />
      </RegionViewerComponent>
    </div>
  )
}
RegionViewer.propTypes = {
  regionData: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  onGeneClick: PropTypes.func,
  selectedVariantDataset: PropTypes.string.isRequired,
}
RegionViewer.defaultProps = {
  coverageStyle: null,
  onGeneClick: () => {},
}

export default connect(
  state => ({
    regionData: regionData(state),
    allVariants: finalFilteredVariants(state),
    selectedVariantDataset: selectedVariantDataset(state),
  }),
  dispatch => ({
    onGeneClick: geneName => dispatch(activeActions.setCurrentGene(geneName)),
  })
)(RegionViewer)
