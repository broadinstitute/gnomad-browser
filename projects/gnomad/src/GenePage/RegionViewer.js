import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { connect } from 'react-redux'

import { NavigatorTrackConnected } from '@broad/track-navigator'
import { TranscriptTrackConnected } from '@broad/track-transcript'
import CoverageTrack from '@broad/track-coverage'
import RegionalConstraintTrack from '@broad/track-regional-constraint'
import { VariantAlleleFrequencyTrack } from '@broad/track-variant'
// import StackedBarTrack from '@broad/track-stacked-bar'
import { screenSize, SectionTitle } from '@broad/ui'

import {
  geneData,
  regionalConstraint,
  exonPadding,
} from '@broad/redux-genes'

import {
  finalFilteredVariants,
  selectedVariantDataset,
} from '@broad/redux-variants'

import {
  RegionViewer,
  coverageConfigClassic,
  coverageConfigNew,
  attributeConfig,
} from '@broad/region'

const COVERAGE_TRACK_HEIGHT = 200
const REGIONAL_CONSTRAINED_TRACK_HEIGHT = 17
const VARIANT_TRACK_HEIGHT = 60

export const TOTAL_REGION_VIEWER_HEIGHT =
  COVERAGE_TRACK_HEIGHT +
  REGIONAL_CONSTRAINED_TRACK_HEIGHT +
  VARIANT_TRACK_HEIGHT

export const getCoverageConfig = (
  selectedVariantDataset,
  exacv1_coverage,
  exome_coverage,
  genome_coverage
) => {
  switch (selectedVariantDataset) {
    case 'exacVariants':
      return coverageConfigClassic(exacv1_coverage)
    case 'gnomadExomeVariants':
      return coverageConfigNew(exome_coverage)
    case 'gnomadGenomeVariants':
      return coverageConfigNew(null, genome_coverage)
    case 'gnomadCombinedVariants':
      return coverageConfigNew(exome_coverage, genome_coverage)
    default:
      return coverageConfigNew(exome_coverage, genome_coverage)
  }
}

const RegionViewerWrapper = styled.div`
  margin-left: 10px;
  width: 100%;
`


const TranscriptLink = styled(({ isCanonical, isSelected, ...rest }) => <Link {...rest} />)`
  background-color: ${({ isSelected }) => isSelected ? 'rgba(10, 121, 191, 0.1)' : 'none'};
  border-bottom: ${({ isSelected, isCanonical }) => {
    if (isSelected) {
      return '1px solid red'
    }
    if (isCanonical) {
      return '1px solid black'
    }
    return 'none'
  }};
  color: rgb(70, 130, 180);
  cursor: pointer;
  text-decoration: none;
`


const GeneViewer = ({
  gene,
  allVariants,
  selectedVariantDataset,
  exonPadding,
  regionalConstraint,
  screenSize,
}) => {
  const smallScreen = screenSize.width < 900
  const regionViewerWidth = smallScreen ? screenSize.width - 150 : screenSize.width - 330

  const geneJS = gene.toJS()
  const canonicalExons = geneJS.transcript.exons
  const { transcript, strand } = geneJS
  const { exome_coverage, genome_coverage, exacv1_coverage } = transcript
  const variantsReversed = allVariants.reverse()


  const { exons } = transcript
  const padding = 75
  const totalBasePairs = exons.filter(region => region.feature_type === 'CDS')
    .reduce((acc, { start, stop }) => (acc + ((stop - start) + (padding * 2))), 0)

  const coverageConfig = getCoverageConfig(
    selectedVariantDataset,
    exacv1_coverage,
    exome_coverage,
    genome_coverage
  )

  const RegionViewerSectionTitle = SectionTitle.extend`
    margin-left: 80px;
    @media (max-width: 900px) {
      margin-left: 0;
    }
  `

  const datasetTranslations = {
    gnomadExomeVariants: 'gnomAD exomes',
    gnomadGenomeVariants: 'gnomAD genomes',
    gnomadCombinedVariants: 'gnomAD',
    exacVariants: 'ExAC',
  }

  return (
    <RegionViewerWrapper>
      {/* <RegionViewerSectionTitle>Positional data</RegionViewerSectionTitle> */}
      <RegionViewer
        width={regionViewerWidth}
        padding={exonPadding}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
      >
        <CoverageTrack
          title={'Coverage'}
          height={200}
          dataConfig={coverageConfig}
          yTickNumber={11}
          yMax={110}
          totalBp={totalBasePairs}
        />
        <TranscriptTrackConnected
          height={12}
          renderTranscriptId={(transcriptId, { isCanonical, isSelected }) => (
            <TranscriptLink
              to={`/gene/${gene.get('gene_name')}/transcript/${transcriptId}`}
              isCanonical={isCanonical}
              isSelected={isSelected}
            >
              {transcriptId}
            </TranscriptLink>
          )}
          showRightPanel={!smallScreen}
        />
        {regionalConstraint.length > 0 && selectedVariantDataset === 'exacVariants' &&
          <RegionalConstraintTrack
            height={15}
            regionalConstraintData={regionalConstraint}
            strand={strand}
          />}

        <VariantAlleleFrequencyTrack
          title={`${datasetTranslations[selectedVariantDataset]}\n(${allVariants.size})`}
          variants={variantsReversed.toJS()}
        />
        <NavigatorTrackConnected title={'Viewing in table'} />
      </RegionViewer>
    </RegionViewerWrapper>
  )
}
GeneViewer.propTypes = {
  gene: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  exonPadding: PropTypes.number.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  regionalConstraint: PropTypes.array.isRequired,
  screenSize: PropTypes.object.isRequired,
}
export default connect(
  state => ({
    gene: geneData(state),
    exonPadding: exonPadding(state),
    allVariants: finalFilteredVariants(state),
    selectedVariantDataset: selectedVariantDataset(state),
    regionalConstraint: regionalConstraint(state),
    screenSize: screenSize(state),
  })
)(GeneViewer)
