import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import VariantTrack from '@broad/track-variant'
import { GenesTrack } from '@broad/track-genes'
import { NavigatorTrackConnected } from '@broad/track-navigator'

import {
  regionData,
  RegionViewer,
  attributeConfig,
} from '@broad/region'

import {
  actions as geneActions,
} from '@broad/redux-genes'


import { screenSize } from '@broad/ui'

import {
  finalFilteredVariants,
  createVariantDatasetSelector,
} from '@broad/redux-variants'

const exomeVariantsSelector = createVariantDatasetSelector('schizophreniaExomeVariants')

const Viewer = ({
  regionData,
  exomeVariants,
  gwasVariants,
  screenSize,
  onGeneClick,
}) => {
  const smallScreen = screenSize.width < 900
  const regionViewerWidth = smallScreen ? screenSize.width - 150 : screenSize.width - 330

  const {
    chrom,
    start,
    stop,
    genes,
  } = regionData.toJS()

  const featuresToDisplay = ['default']

  const regions = [{
    chrom,
    start,
    stop,
    feature_type: 'default',
    strand: '+',
  }]

  const variantsArray = gwasVariants
    .filter(v => v.get('p_value') !== 0)
    .map((v) => {
      return v.set('-log10p', -Math.log10(v.get('p_value')))
    }).toJS()

  const markerConfig = {
    markerType: 'circle',
    circleRadius: 3,
    circleStroke: 'black',
    circleStrokeWidth: 1,
    yPositionSetting: 'attribute',
    yPositionAttribute: '-log10p',
    fillColor: '#757575',
  }

  const markerConfigP = { ...markerConfig, yPositionAttribute: '-log10p' }
  const markerConfigOdds = { ...markerConfig, yPositionAttribute: 'odds_ratio' }
  const markerConfigSczAF = { ...markerConfig, yPositionAttribute: 'scz_af' }
  const markerConfigHCAF = { ...markerConfig, yPositionAttribute: 'hc_af' }

  const markerConfigOther = {
    circleRadius: 3,
    circleStroke: 'black',
    circleStrokeWidth: 1,
    yPositionSetting: 'random',
    fillColor: '#757575',
  }

  return (
    <div>
      <RegionViewer
        width={regionViewerWidth}
        regions={regions}
        regionAttributes={attributeConfig}
        leftPanelWidth={100}
        padding={0}
        featuresToDisplay={featuresToDisplay}
      >
        <GenesTrack onGeneClick={onGeneClick} genes={genes} />
        <VariantTrack
          title={'|Exome variants'}
          height={100}
          color={'#75757'}
          markerConfig={markerConfigOther}
          variants={exomeVariants}
        />
        <VariantTrack
          title={'|||'}
          height={200}
          color={'#75757'}
          markerConfig={markerConfigP}
          variants={variantsArray}
        />
        <NavigatorTrackConnected noVariants />
      </RegionViewer>
    </div>
  )
}
Viewer.propTypes = {
  regionData: PropTypes.object.isRequired,
  onGeneClick: PropTypes.func.isRequired,
  visibleVariants: PropTypes.any.isRequired,
  screenSize: PropTypes.object.isRequired,
}

const mapsStateToProps = (state) => {
  return ({
    exomeVariants: exomeVariantsSelector(state),
    gwasVariants: finalFilteredVariants(state),
    screenSize: screenSize(state),
    regionData: regionData(state),
  })
}

export default connect(
  mapsStateToProps,
  dispatch => ({
    onGeneClick: geneName => dispatch(geneActions.setCurrentGene(geneName)),
  })
)(Viewer)
