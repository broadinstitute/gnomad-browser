import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
// import styled from 'styled-components'

import RegionViewerComponent from '@broad/region'
import CoverageTrack from '@broad/track-coverage'
import VariantTrack from '@broad/track-variant'
import StackedBarTrack from '@broad/track-stacked-bar'

import { GenesTrack } from '@broad/track-genes'

import { screenSize, actions as activeActions } from '@broad/gene-page/src/resources/active'
import { regionData } from '@broad/gene-page/src/resources/regions'
import NavigatorConnected from '@broad/gene-page/src/containers/NavigatorConnected'

import {
  markerExacClassic,
  attributeConfig,
} from '@broad/gene-page/src/presentation/RegionViewerStyles'

import {
  finalFilteredVariants,
  selectedVariantDataset,
} from '@broad/gene-page/src/resources/variants'

import { getCoverageConfig } from '../GenePage/RegionViewer'

const RegionViewer = ({
  regionData,
  allVariants,
  selectedVariantDataset,
  onGeneClick,
  screenSize,
}) => {
  const {
    chrom,
    start,
    stop,
    exome_coverage,
    genome_coverage,
    exacv1_coverage,
    genes,
    gnomad_consequence_buckets: { buckets },
  } = regionData.toJS()

  const variantsReversed = allVariants.reverse()

  const coverageConfig = getCoverageConfig(
    selectedVariantDataset,
    exacv1_coverage,
    exome_coverage,
    genome_coverage
  )

  const featuresToDisplay = ['default']

  const regions = [{
    chrom,
    start,
    stop,
    feature_type: 'default',
    strand: '+',
  }]

  const totalBp = stop - start

  const smallScreen = screenSize.width < 900
  const regionViewerWidth = smallScreen ? screenSize.width - 150 : screenSize.width - 330

  const largeRegion = totalBp > 50000
  // const showVariants = !largeRegion
  const showVariants = true
  const showStacked = largeRegion

  return (
    <div>
      <RegionViewerComponent
        width={regionViewerWidth}
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
          totalBp={totalBp}
        />
        <GenesTrack onGeneClick={onGeneClick} genes={genes} />
        {showVariants &&
          <VariantTrack
            key={'All-variants'}
            title={`Variants (${allVariants.size})`}
            height={60}
            color={'#75757'}
            markerConfig={markerExacClassic}
            variants={variantsReversed}
          />}
        {showStacked &&
          <StackedBarTrack height={150} data={buckets} />
        }
        <NavigatorConnected title={'Viewing in table'} />
      </RegionViewerComponent>
    </div>
  )
}
RegionViewer.propTypes = {
  regionData: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  onGeneClick: PropTypes.func,
  selectedVariantDataset: PropTypes.string.isRequired,
  screenSize: PropTypes.object.isRequired,
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
    screenSize: screenSize(state),
  }),
  dispatch => ({
    onGeneClick: geneName => dispatch(activeActions.setCurrentGene(geneName)),
  })
)(RegionViewer)
