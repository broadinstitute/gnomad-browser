import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'redux'

import { VariantAlleleFrequencyTrack } from '@broad/track-variant'
import { GenesTrack } from '@broad/track-genes'

import { screenSize } from '@broad/ui'
import { regionData } from '@broad/region'
import { RegionViewer } from '@broad/region-viewer'
import { NavigatorTrackConnected } from '@broad/track-navigator'

import {
  finalFilteredVariants,
  selectedVariantDataset,
} from '@broad/redux-variants'

import datasetLabels from '../datasetLabels'
import CoverageTrack from './CoverageTrack'

const RegionViewerConnected = ({
  datasetId,
  regionData,
  allVariants,
  history,
  selectedVariantDataset,
  screenSize,
  showVariants,
}) => {
  const { chrom, start, stop, genes } = regionData.toJS()

  const variantsReversed = allVariants.reverse()

  const featuresToDisplay = ['default']

  const regions = [
    {
      chrom,
      start,
      stop,
      feature_type: 'default',
      strand: '+',
    },
  ]

  // Margins have to be kept in sync with styles in ui/Page.js
  const smallScreen = screenSize.width < 900
  const regionViewerWidth = smallScreen ? screenSize.width - 130 : screenSize.width - 290

  return (
    <RegionViewer
      width={regionViewerWidth}
      padding={0}
      regions={regions}
      featuresToDisplay={featuresToDisplay}
      rightPanelWidth={smallScreen ? 0 : 160}
    >
      <CoverageTrack datasetId={datasetId} chrom={chrom} start={start} stop={stop} />

      <GenesTrack
        genes={genes}
        onGeneClick={geneName => history.push(`/gene/${geneName}`)}
      />

      {showVariants && (
        <VariantAlleleFrequencyTrack
          title={`${datasetLabels[selectedVariantDataset]}\n(${allVariants.size})`}
          variants={variantsReversed.toJS()}
        />
      )}

      {showVariants && <NavigatorTrackConnected title="Viewing in table" />}
    </RegionViewer>
  )
}
RegionViewerConnected.propTypes = {
  regionData: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  history: PropTypes.object.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  screenSize: PropTypes.object.isRequired,
  showVariants: PropTypes.bool.isRequired,
}

export default compose(
  withRouter,
  connect(
    state => ({
      regionData: regionData(state),
      allVariants: finalFilteredVariants(state),
      selectedVariantDataset: selectedVariantDataset(state),
      screenSize: screenSize(state),
    })
  )
)(RegionViewerConnected)
