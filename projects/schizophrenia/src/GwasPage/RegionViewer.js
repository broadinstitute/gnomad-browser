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
import R from 'ramda'

import RegionViewer from '@broad/region'
import VariantTrack from '@broad/track-variant'
import { GenesTrack } from '@broad/track-genes'
import NavigatorConnected from '@broad/gene-page/src/containers/NavigatorConnected'

import {
  attributeConfig,
} from '@broad/gene-page/src/presentation/RegionViewerStyles'


import {
  screenSize,
  actions as activeActions,
} from '@broad/gene-page/src/resources/active'

import { regionData } from '@broad/gene-page/src/resources/regions'

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
        <NavigatorConnected noVariants />
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
    onGeneClick: geneName => dispatch(activeActions.setCurrentGene(geneName)),
  })
)(Viewer)
