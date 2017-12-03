import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import CoverageTrack from '@broad/track-coverage'
import VariantTrack from '@broad/track-variant'
import StackedBarTrack from '@broad/track-stacked-bar'
import { GenesTrack } from '@broad/track-genes'

import { actions as geneActions } from '@broad/redux-genes'
import { screenSize } from '@broad/ui'
import { RegionViewer, regionData, markerExacClassic, attributeConfig } from '@broad/region'
import { NavigatorConnected } from '@broad/track-navigator'

import {
  finalFilteredVariants,
  selectedVariantDataset,
  variantFilter,
} from '@broad/redux-variants'

import { getCoverageConfig } from '../GenePage/RegionViewer'

const RegionViewerConnected = ({
  regionData,
  allVariants,
  selectedVariantDataset,
  onGeneClick,
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

  let partialFetcho
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
  const regionViewerWidth = smallScreen ? screenSize.width - 150 : screenSize.width - 330

  const largeRegion = totalBp > 50000
  // const showVariants = !largeRegion
  const showVariants = true
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
            title={`${datasetTranslations[selectedVariantDataset]}|${consequenceTranslations[variantFilter]}|variants|(${allVariants.size})`}
            height={60}
            color={'#75757'}
            markerConfig={markerExacClassic}
            variants={variantsReversed}
          />}
        {showStacked &&
          <StackedBarTrack height={150} data={buckets} />
        }
        <NavigatorConnected title={'Viewing in table'} />
      </RegionViewer>
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
    variantFilter: variantFilter(state),
  }),
  dispatch => ({
    onGeneClick: geneName => dispatch(geneActions.setCurrentGene(geneName)),
  })
)(RegionViewerConnected)
