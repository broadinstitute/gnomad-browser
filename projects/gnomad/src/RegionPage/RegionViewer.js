import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'redux'

import CoverageTrack from '@broad/track-coverage'
import { VariantAlleleFrequencyTrack } from '@broad/track-variant'
import { GenesTrack } from '@broad/track-genes'

import { screenSize } from '@broad/ui'
import { regionData } from '@broad/region'
import { RegionViewer, attributeConfig } from '@broad/region-viewer'
import { NavigatorTrackConnected } from '@broad/track-navigator'

import {
  finalFilteredVariants,
  selectedVariantDataset,
} from '@broad/redux-variants'

import { getCoverageConfig } from '../GenePage/RegionViewer'

const RegionViewerConnected = ({
  regionData,
  allVariants,
  history,
  selectedVariantDataset,
  screenSize,
  showVariants,
}) => {
  const {
    chrom,
    start,
    stop,
    exome_coverage,
    genome_coverage,
    exacv1_coverage,
    genes,
  } = regionData.toJS()

  const variantsReversed = allVariants.reverse()

  const coverageConfig = getCoverageConfig(
    selectedVariantDataset,
    exacv1_coverage,
    exome_coverage,
    genome_coverage
  )

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

  const totalBp = stop - start

  // Margins have to be kept in sync with styles in ui/Page.js
  const smallScreen = screenSize.width < 900
  const regionViewerWidth = smallScreen ? screenSize.width - 130 : screenSize.width - 290

  const datasetTranslations = {
    gnomadExomeVariants: 'gnomAD exomes',
    gnomadGenomeVariants: 'gnomAD genomes',
    gnomadCombinedVariants: 'gnomAD',
    exacVariants: 'ExAC',
  }

  return (
    <RegionViewer
      width={regionViewerWidth}
      padding={0}
      regions={regions}
      regionAttributes={attributeConfig}
      featuresToDisplay={featuresToDisplay}
      rightPanelWidth={smallScreen ? 0 : 160}
    >
      <CoverageTrack
        title={'Coverage'}
        height={200}
        dataConfig={coverageConfig}
        yTickNumber={11}
        yMax={110}
        totalBp={totalBp}
      />

      <GenesTrack
        genes={genes}
        onGeneClick={geneName => history.push(`/gene/${geneName}`)}
      />

      {showVariants && (
        <VariantAlleleFrequencyTrack
          title={`${datasetTranslations[selectedVariantDataset]}\n(${allVariants.size})`}
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
RegionViewerConnected.defaultProps = {
  coverageStyle: null,
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
