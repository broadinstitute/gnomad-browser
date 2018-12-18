import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'

import { NavigatorTrackConnected } from '@broad/track-navigator'
import { TranscriptTrackConnected } from '@broad/track-transcript'
import RegionalConstraintTrack from '@broad/track-regional-constraint'
import { VariantAlleleFrequencyTrack } from '@broad/track-variant'
import { screenSize } from '@broad/ui'

import {
  currentTranscript,
  geneData,
  regionalConstraint,
  exonPadding,
} from '@broad/redux-genes'

import {
  finalFilteredVariants,
  isLoadingVariants,
  selectedVariantDataset,
} from '@broad/redux-variants'

import { RegionViewer, attributeConfig } from '@broad/region-viewer'

import datasetLabels from '../datasetLabels'
import Link from '../Link'
import CoverageTrack from './CoverageTrack'
import ClinVarTrack from './ClinVarTrack'
import StatusMessage from '../StatusMessage'

const COVERAGE_TRACK_HEIGHT = 200
const REGIONAL_CONSTRAINED_TRACK_HEIGHT = 17
const VARIANT_TRACK_HEIGHT = 60

export const TOTAL_REGION_VIEWER_HEIGHT =
  COVERAGE_TRACK_HEIGHT +
  REGIONAL_CONSTRAINED_TRACK_HEIGHT +
  VARIANT_TRACK_HEIGHT

const TranscriptLink = styled(({ isCanonical, isSelected, ...rest }) => <Link {...rest} />)`
  border-bottom: ${({ isSelected, isCanonical }) => {
    if (isSelected) {
      return '1px solid red'
    }
    if (isCanonical) {
      return '1px solid black'
    }
    return 'none'
  }};
  background-color: ${({ isSelected }) => (isSelected ? 'rgba(10, 121, 191, 0.1)' : 'none')};
`

const GeneViewer = ({
  currentTranscript,
  gene,
  allVariants,
  selectedVariantDataset,
  exonPadding,
  isLoadingVariants,
  regionalConstraint,
  screenSize,
  datasetId,
  geneId,
}) => {
  // Margins have to be kept in sync with styles in ui/Page.js
  const smallScreen = screenSize.width < 900
  const regionViewerWidth = smallScreen ? screenSize.width - 130 : screenSize.width - 290

  const geneJS = gene.toJS()
  const currentTranscriptId = currentTranscript || gene.get('canonical_transcript')

  const canonicalExons = geneJS.transcript.exons
  const { transcript, strand } = geneJS
  const variantsReversed = allVariants.reverse()

  const { exons } = transcript
  const hasCodingExons = exons.some(exon => exon.feature_type === 'CDS')

  return (
    <RegionViewer
      width={regionViewerWidth}
      padding={exonPadding}
      regions={canonicalExons}
      regionAttributes={attributeConfig}
      rightPanelWidth={smallScreen ? 0 : 160}
    >
      {hasCodingExons && <CoverageTrack datasetId={datasetId} geneId={geneId} />}

      {hasCodingExons && (
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
      )}

      {!hasCodingExons && (
        <StatusMessage>
          Coverage &amp; transcripts not shown for genes with no coding exons
        </StatusMessage>
      )}

      {!isLoadingVariants && <ClinVarTrack variants={gene.get('clinvar_variants').toJS()} />}

      {!isLoadingVariants &&
        regionalConstraint.length > 0 &&
        selectedVariantDataset === 'exac' && (
          <RegionalConstraintTrack
            height={15}
            regionalConstraintData={regionalConstraint}
            strand={strand}
          />
        )}

      {!isLoadingVariants && (
        <VariantAlleleFrequencyTrack
          title={`${datasetLabels[selectedVariantDataset]}\n(${allVariants.size})`}
          variants={variantsReversed.toJS()}
        />
      )}
      {!isLoadingVariants && <NavigatorTrackConnected title={'Viewing in table'} />}
    </RegionViewer>
  )
}

GeneViewer.propTypes = {
  currentTranscript: PropTypes.string,
  gene: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  exonPadding: PropTypes.number.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  regionalConstraint: PropTypes.array.isRequired,
  screenSize: PropTypes.object.isRequired,
}

GeneViewer.defaultProps = {
  currentTranscript: undefined,
}

export default connect(
  state => ({
    currentTranscript: currentTranscript(state),
    gene: geneData(state),
    exonPadding: exonPadding(state),
    allVariants: finalFilteredVariants(state),
    selectedVariantDataset: selectedVariantDataset(state),
    isLoadingVariants: isLoadingVariants(state),
    regionalConstraint: regionalConstraint(state),
    screenSize: screenSize(state),
  })
)(GeneViewer)
