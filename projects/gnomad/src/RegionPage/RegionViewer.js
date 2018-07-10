import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { compose } from 'redux'

import CoverageTrack from '@broad/track-coverage'
import { VariantAlleleFrequencyTrack } from '@broad/track-variant'
import StackedBarTrack from '@broad/track-stacked-bar'
import { GenesTrack } from '@broad/track-genes'

import { screenSize } from '@broad/ui'
import { RegionViewer, regionData, attributeConfig } from '@broad/region'
import { NavigatorTrackConnected } from '@broad/track-navigator'

import {
  finalFilteredVariants,
  selectedVariantDataset,
  variantFilter,
} from '@broad/redux-variants'

import { getCoverageConfig } from '../GenePage/RegionViewer'

const RegionViewerConnected = ({
  regionData,
  allVariants,
  history,
  selectedVariantDataset,
  screenSize,
  variantFilter,
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

  let partialFetch
  if ((regionData.get('stop') - regionData.get('start')) > 50000) {
    partialFetch = 'lof'
    variantFilter = variantFilter === 'all' ? partialFetch : variantFilter  // eslint-disable-line
  }

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
  const regionViewerWidth = smallScreen ? screenSize.width - 150 : screenSize.width - 300

  const largeRegion = totalBp > 50000
  const showStacked = largeRegion

  const datasetTranslations = {
    gnomadExomeVariants: 'gnomAD exomes',
    gnomadGenomeVariants: 'gnomAD genomes',
    gnomadCombinedVariants: 'gnomAD',
    exacVariants: 'ExAC',
  }
  const consequenceTranslations = {
    all: 'All variants',
    gnomadGenomeVariants: 'gnomAD genomes',
    missenseOrLoF: 'Missense/LoF',
    lof: 'LoF',
  }

  return (
    <div>
      <RegionViewer
        width={regionViewerWidth}
        padding={0}
        regions={regions}
        regionAttributes={attributeConfig}
        featuresToDisplay={featuresToDisplay}
        leftPanelWidth={100}
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

        <VariantAlleleFrequencyTrack
          title={`${datasetTranslations[selectedVariantDataset]}\n${consequenceTranslations[variantFilter]}\n(${allVariants.size})`}
          variants={variantsReversed.toJS()}
        />

        {showStacked &&
          <StackedBarTrack height={150} data={buckets} />
        }
        <NavigatorTrackConnected title={'Viewing in table'} />
      </RegionViewer>
    </div>
  )
}
RegionViewerConnected.propTypes = {
  regionData: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  history: PropTypes.object.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  screenSize: PropTypes.object.isRequired,
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
      variantFilter: variantFilter(state),
    })
  )
)(RegionViewerConnected)
