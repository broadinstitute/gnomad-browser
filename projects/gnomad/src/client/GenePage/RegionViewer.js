import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { geneData, regionalConstraint } from '@broad/redux-genes'
import { finalFilteredVariants, isLoadingVariants } from '@broad/redux-variants'
import { RegionViewer } from '@broad/region-viewer'
import { NavigatorTrackConnected } from '@broad/track-navigator'
import RegionalConstraintTrack from '@broad/track-regional-constraint'
import { ConnectedTranscriptsTrack } from '@broad/track-transcript'
import { VariantAlleleFrequencyTrack } from '@broad/track-variant'
import { screenSize } from '@broad/ui'

import datasetLabels from '../datasetLabels'
import StatusMessage from '../StatusMessage'
import CoverageTrack from './CoverageTrack'
import ClinVarTrack from './ClinVarTrack'
import TranscriptLink from './TranscriptLink'

// eslint-disable-next-line react/prefer-stateless-function
class GeneViewer extends Component {
  static propTypes = {
    allVariants: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    datasetId: PropTypes.string.isRequired,
    gene: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    geneId: PropTypes.string.isRequired,
    isLoadingVariants: PropTypes.bool.isRequired,
    regionalConstraint: PropTypes.arrayOf(
      PropTypes.shape({
        genomic_end: PropTypes.number.isRequired,
        genomic_start: PropTypes.number.isRequired,
        region_name: PropTypes.string.isRequired,
      })
    ).isRequired,
    screenSize: PropTypes.shape({ width: PropTypes.number.isRequired }).isRequired,
  }

  render() {
    const {
      allVariants,
      datasetId,
      gene,
      geneId,
      isLoadingVariants, // eslint-disable-line no-shadow
      regionalConstraint, // eslint-disable-line no-shadow
      screenSize, // eslint-disable-line no-shadow
    } = this.props

    // Margins have to be kept in sync with styles in ui/Page.js
    const smallScreen = screenSize.width < 900
    const regionViewerWidth = smallScreen ? screenSize.width - 130 : screenSize.width - 290

    const geneJS = gene.toJS()
    const { transcript, strand } = geneJS
    const variantsReversed = allVariants.reverse()

    const { exons } = transcript
    const hasCodingExons = exons.some(exon => exon.feature_type === 'CDS')

    return (
      <RegionViewer
        width={regionViewerWidth}
        padding={75}
        regions={geneJS.composite_transcript.exons}
        rightPanelWidth={smallScreen ? 0 : 160}
      >
        {hasCodingExons && <CoverageTrack datasetId={datasetId} geneId={geneId} />}

        {hasCodingExons && (
          <ConnectedTranscriptsTrack
            compositeExons={geneJS.composite_transcript.exons}
            filenameForExport={`${geneId}_transcripts`}
            renderTranscriptId={(transcriptId, { isCanonical, isSelected }) => (
              <TranscriptLink
                to={`/gene/${gene.get('gene_name')}/transcript/${transcriptId}`}
                isCanonical={isCanonical}
                isSelected={isSelected}
              >
                {transcriptId}
              </TranscriptLink>
            )}
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
          datasetId === 'exac' && (
            <RegionalConstraintTrack
              height={15}
              regionalConstraintData={regionalConstraint}
              strand={strand}
            />
          )}

        {!isLoadingVariants && (
          <VariantAlleleFrequencyTrack
            title={`${datasetLabels[datasetId]}\n(${allVariants.size})`}
            variants={variantsReversed.toJS()}
          />
        )}
        {!isLoadingVariants && <NavigatorTrackConnected title="Viewing in table" />}
      </RegionViewer>
    )
  }
}

export default connect(state => ({
  allVariants: finalFilteredVariants(state),
  gene: geneData(state),
  isLoadingVariants: isLoadingVariants(state),
  regionalConstraint: regionalConstraint(state),
  screenSize: screenSize(state),
}))(GeneViewer)
