import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData, regionalConstraint } from '@broad/redux-genes'
import { finalFilteredVariants, isLoadingVariants } from '@broad/redux-variants'
import { RegionViewer } from '@broad/region-viewer'
import { NavigatorTrackConnected } from '@broad/track-navigator'
import { ConnectedTranscriptsTrack } from '@broad/track-transcript'
import { VariantAlleleFrequencyTrack } from '@broad/track-variant'
import { screenSize } from '@broad/ui'

import datasetLabels from '../datasetLabels'
import StatusMessage from '../StatusMessage'
import CoverageTrack from './CoverageTrack'
import ClinVarTrack from './ClinVarTrack'
import RegionalConstraintTrack from './RegionalConstraintTrack'
import TissueExpressionTrack from './TissueExpressionTrack'
import TranscriptLink from './TranscriptLink'

const ControlPanel = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  width: ${props => props.width}px;
  margin-left: ${props => props.leftPanelWidth}px;
`

const Legend = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0;
  list-style-type: none;
`

const LegendItemWrapper = styled.li`
  display: flex;
  align-items: stretch;
  height: 20px;
  margin-left: 1em;
`

const Label = styled.label`
  user-select: none;
  display: flex;
  flex-direction: row;
  align-items: center;
`

const CheckboxInput = styled.input.attrs({ type: 'checkbox' })`
  margin-right: 0.5em;
`

const LegendSwatch = styled.span`
  display: flex;
  align-items: center;
  width: 16px;
  margin-left: 0.5em;

  &::before {
    content: '';
    display: inline-block;
    width: 16px;
    height: ${props => props.height}px;
    background: ${props => props.color};
  }
`

const transcriptFeatureAttributes = {
  exon: {
    fill: '#bdbdbd',
    height: 4,
  },
  CDS: {
    fill: '#424242',
    height: 10,
  },
  UTR: {
    fill: '#424242',
    height: 4,
  },
}

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

  constructor(props) {
    super(props)

    const exons = props.gene.get('composite_transcript').get('exons')
    const hasCDS = exons.some(exon => exon.get('feature_type') === 'CDS')

    this.state = {
      includeNonCodingTranscripts: !hasCDS,
      includeUTRs: false,
    }
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
    const { includeUTRs, includeNonCodingTranscripts } = this.state

    // Margins have to be kept in sync with styles in ui/Page.js
    const smallScreen = screenSize.width < 900
    const regionViewerWidth = smallScreen ? screenSize.width - 130 : screenSize.width - 290

    const geneJS = gene.toJS()
    const { transcript } = geneJS
    const variantsReversed = allVariants.reverse()

    const { exons } = transcript
    const hasCodingExons = exons.some(exon => exon.feature_type === 'CDS')

    const hasNonCodingTranscripts = geneJS.transcripts.some(
      tx => !tx.exons.some(exon => exon.feature_type === 'CDS')
    )

    const cdsCompositeExons = geneJS.composite_transcript.exons.filter(
      exon => exon.feature_type === 'CDS'
    )

    const regionViewerRegions = geneJS.composite_transcript.exons.filter(
      exon =>
        exon.feature_type === 'CDS' ||
        (exon.feature_type === 'UTR' && includeUTRs) ||
        (exon.feature_type === 'exon' && includeNonCodingTranscripts)
    )

    return (
      <RegionViewer
        width={regionViewerWidth}
        padding={75}
        regions={regionViewerRegions}
        rightPanelWidth={smallScreen ? 0 : 160}
      >
        {hasCodingExons && <CoverageTrack datasetId={datasetId} geneId={geneId} />}

        <ControlPanel>
          Include:
          <Legend>
            <LegendItemWrapper>
              <Label htmlFor="include-cds-regions">
                <CheckboxInput
                  checked={hasCodingExons}
                  disabled
                  id="include-cds-regions"
                  onChange={() => {}}
                />
                CDS
                <LegendSwatch
                  color={transcriptFeatureAttributes.CDS.fill}
                  height={transcriptFeatureAttributes.CDS.height}
                />
              </Label>
            </LegendItemWrapper>

            <LegendItemWrapper>
              <Label htmlFor="include-utr-regions">
                <CheckboxInput
                  checked={includeUTRs}
                  disabled={
                    !geneJS.composite_transcript.exons.some(exon => exon.feature_type === 'UTR')
                  }
                  id="include-utr-regions"
                  onChange={e => {
                    this.setState({ includeUTRs: e.target.checked })
                  }}
                />
                UTR
                <LegendSwatch
                  color={transcriptFeatureAttributes.UTR.fill}
                  height={transcriptFeatureAttributes.UTR.height}
                />
              </Label>
            </LegendItemWrapper>

            <LegendItemWrapper>
              <Label htmlFor="include-nc-transcripts">
                <CheckboxInput
                  checked={includeNonCodingTranscripts}
                  disabled={!hasNonCodingTranscripts}
                  id="include-nc-transcripts"
                  onChange={e => {
                    this.setState({ includeNonCodingTranscripts: e.target.checked })
                  }}
                />
                Non-coding transcript
                <LegendSwatch
                  color={transcriptFeatureAttributes.exon.fill}
                  height={transcriptFeatureAttributes.exon.height}
                />
              </Label>
            </LegendItemWrapper>
          </Legend>
        </ControlPanel>

        {hasCodingExons && (
          <ConnectedTranscriptsTrack
            showUTRs={includeUTRs}
            showNonCodingTranscripts={includeNonCodingTranscripts}
            compositeExons={regionViewerRegions}
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

        {hasCodingExons && (
          <TissueExpressionTrack exons={cdsCompositeExons} expressionRegions={geneJS.pext} />
        )}

        {!isLoadingVariants && <ClinVarTrack variants={gene.get('clinvar_variants').toJS()} />}

        {!isLoadingVariants &&
          regionalConstraint.length > 0 &&
          datasetId === 'exac' && (
            <RegionalConstraintTrack height={15} regions={regionalConstraint} />
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
