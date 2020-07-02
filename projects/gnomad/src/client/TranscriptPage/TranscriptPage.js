import { mean } from 'd3-array'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { Redirect } from 'react-router-dom'
import styled from 'styled-components'

import { RegionViewer } from '@gnomad/region-viewer'
import TranscriptsTrack, { TranscriptsTrackWithTissueExpression } from '@gnomad/track-transcripts'
import { ExternalLink } from '@gnomad/ui'

import ConstraintTable from '../ConstraintTable/ConstraintTable'
import DocumentTitle from '../DocumentTitle'
import GeneCoverageTrack from '../GenePage/GeneCoverageTrack'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import RegionalConstraintTrack from '../RegionalConstraintTrack'
import TissueExpressionTrack from '../TissueExpressionTrack'
import { TrackPage, TrackPageSection } from '../TrackPage'
import TranscriptLink from '../TranscriptLink'

import TranscriptInfo from './TranscriptInfo'
import VariantsInTranscript from './VariantsInTranscript'

const TranscriptInfoColumnWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }

  /* Matches responsive styles in AttributeList */
  @media (max-width: 600px) {
    align-items: stretch;
  }
`

const ControlPanel = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  width: ${props => props.width}px;
  margin-left: ${props => props.marginLeft}px;
`

const Legend = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0.5em 0;
  list-style-type: none;
`

const LegendItemWrapper = styled.li`
  display: flex;
  align-items: stretch;
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

const sortTranscripts = (transcripts, firstTranscriptId) =>
  transcripts.sort((t1, t2) => {
    // Sort specific transcript (MANE Select or canonical) first
    // Then sort transcripts by mean expression and transcript ID
    if (t1.transcript_id === firstTranscriptId) {
      return -1
    }
    if (t2.transcript_id === firstTranscriptId) {
      return 1
    }

    const t1Mean = mean(Object.values(t1.gtex_tissue_expression || {}))
    const t2Mean = mean(Object.values(t2.gtex_tissue_expression || {}))

    if (t1Mean === t2Mean) {
      return t1.transcript_id.localeCompare(t2.transcript_id)
    }

    return t2Mean - t1Mean
  })

class TranscriptPage extends Component {
  static propTypes = {
    datasetId: PropTypes.string.isRequired,
    transcript: PropTypes.shape({
      transcript_id: PropTypes.string.isRequired,
      transcript_version: PropTypes.string.isRequired,
      reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
      chrom: PropTypes.string.isRequired,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      strand: PropTypes.oneOf(['+', '-']).isRequired,
      exons: PropTypes.arrayOf(
        PropTypes.shape({
          feature_type: PropTypes.string.isRequired,
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
        })
      ).isRequired,
      gene: PropTypes.shape({
        gene_id: PropTypes.string.isRequired,
        gene_version: PropTypes.string.isRequired,
        reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
        symbol: PropTypes.string.isRequired,
        name: PropTypes.string,
        strand: PropTypes.oneOf(['+', '-']).isRequired,
        exons: PropTypes.arrayOf(
          PropTypes.shape({
            feature_type: PropTypes.string.isRequired,
            start: PropTypes.number.isRequired,
            stop: PropTypes.number.isRequired,
          })
        ).isRequired,
        transcripts: PropTypes.arrayOf(
          PropTypes.shape({
            transcript_id: PropTypes.string.isRequired,
            transcript_version: PropTypes.string.isRequired,
            exons: PropTypes.arrayOf(
              PropTypes.shape({
                feature_type: PropTypes.string.isRequired,
                start: PropTypes.number.isRequired,
                stop: PropTypes.number.isRequired,
              })
            ).isRequired,
          })
        ).isRequired,
        canonical_transcript_id: PropTypes.string,
        mane_select_transcript: PropTypes.shape({
          ensembl_id: PropTypes.string.isRequired,
          ensembl_version: PropTypes.string.isRequired,
          refseq_id: PropTypes.string.isRequired,
          refseq_version: PropTypes.string.isRequired,
        }),
        pext: PropTypes.shape({
          regions: PropTypes.arrayOf(
            PropTypes.shape({
              start: PropTypes.number.isRequired,
              stop: PropTypes.number.isRequired,
              mean: PropTypes.number.isRequired,
              tissues: PropTypes.objectOf(PropTypes.number).isRequired,
            })
          ).isRequired,
          flags: PropTypes.arrayOf(PropTypes.string).isRequired,
        }),
        // eslint-disable-next-line react/forbid-prop-types
        exac_regional_missense_constraint_regions: PropTypes.any,
      }).isRequired,
    }).isRequired,
    width: PropTypes.number.isRequired,
  }

  constructor(props) {
    super(props)

    const { transcript } = props
    const hasCDS = transcript.gene.exons.some(exon => exon.feature_type === 'CDS')

    this.state = {
      includeNonCodingTranscripts: !hasCDS,
      includeUTRs: false,
    }
  }

  render() {
    const { datasetId, transcript, width } = this.props
    const { includeUTRs, includeNonCodingTranscripts } = this.state
    const { gene } = transcript

    // Cannot query structural variants by transcript, redirect to gene page
    if (datasetId.startsWith('gnomad_sv')) {
      return <Redirect to={`/gene/${gene.gene_id}?dataset=${datasetId}`} />
    }

    const smallScreen = width < 900

    // Subtract 30px for padding on Page component
    const regionViewerWidth = width - 30

    const TranscriptsTrackComponent =
      gene.reference_genome === 'GRCh37' ? TranscriptsTrackWithTissueExpression : TranscriptsTrack

    const cdsCompositeExons = gene.exons.filter(exon => exon.feature_type === 'CDS')
    const hasCodingExons = cdsCompositeExons.length > 0
    const hasUTRs = gene.exons.some(exon => exon.feature_type === 'UTR')
    const hasNonCodingTranscripts = gene.transcripts.some(
      tx => !tx.exons.some(exon => exon.feature_type === 'CDS')
    )

    const regionViewerRegions = gene.exons.filter(
      exon =>
        exon.feature_type === 'CDS' ||
        (exon.feature_type === 'UTR' && includeUTRs) ||
        (exon.feature_type === 'exon' && includeNonCodingTranscripts)
    )

    /**
     * In the transcripts track, mark the MANE Select transcript (if the gene has one) or the canonical transcript
     * with an asterisk.
     */
    const hasManeSelectTranscript =
      !!gene.mane_select_transcript &&
      gene.transcripts.some(
        otherTranscript => otherTranscript.transcript_id === gene.mane_select_transcript.ensembl_id
      )

    const starredTranscriptId = hasManeSelectTranscript
      ? gene.mane_select_transcript.ensembl_id
      : gene.canonical_transcript_id

    const hasCanonicalTranscript =
      !!gene.canonical_transcript_id &&
      gene.transcripts.some(
        otherTranscript => otherTranscript.transcript_id === gene.canonical_transcript_id
      )

    /**
     * Describe what the asterisk is referring to.
     */
    let starredTranscriptDescription
    if (hasManeSelectTranscript) {
      const maneSelectTranscriptMatchesVersion =
        !!gene.mane_select_transcript &&
        gene.transcripts.some(
          otherTranscript =>
            otherTranscript.transcript_id === gene.mane_select_transcript.ensembl_id &&
            otherTranscript.transcript_version === gene.mane_select_transcript.ensembl_version
        )
      if (maneSelectTranscriptMatchesVersion) {
        starredTranscriptDescription = (
          <React.Fragment>
            Transcript is the{' '}
            <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">MANE</ExternalLink>{' '}
            Select transcript for this gene
          </React.Fragment>
        )
      } else {
        starredTranscriptDescription = (
          <React.Fragment>
            Transcript is a different version of the{' '}
            <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">MANE</ExternalLink>{' '}
            Select transcript for this gene
          </React.Fragment>
        )
      }
    } else if (hasCanonicalTranscript) {
      starredTranscriptDescription = 'Transcript is the Ensembl canonical transcript for this gene'
    }

    return (
      <TrackPage>
        <TrackPageSection>
          <DocumentTitle title={transcript.transcript_id} />
          <GnomadPageHeading
            datasetOptions={{ includeStructuralVariants: false }}
            selectedDataset={datasetId}
          >
            {transcript.transcript_id}.{transcript.transcript_version}
          </GnomadPageHeading>
          <TranscriptInfoColumnWrapper>
            <TranscriptInfo transcript={transcript} />
            <div>
              <h2>
                Constraint <InfoButton topic="constraint" />
              </h2>
              <ConstraintTable datasetId={datasetId} geneOrTranscript={transcript} />
            </div>
          </TranscriptInfoColumnWrapper>
        </TrackPageSection>
        <RegionViewer
          leftPanelWidth={115}
          width={regionViewerWidth}
          padding={75}
          regions={regionViewerRegions}
          rightPanelWidth={smallScreen ? 0 : 160}
        >
          <GeneCoverageTrack
            datasetId={datasetId}
            geneId={gene.gene_id}
            includeExomeCoverage={!datasetId.startsWith('gnomad_r3')}
          />

          <ControlPanel marginLeft={100} width={regionViewerWidth - 100 - (smallScreen ? 0 : 160)}>
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
                    disabled={!hasUTRs}
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
                    disabled={!hasNonCodingTranscripts || (!hasCodingExons && !hasUTRs)}
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

          <TranscriptsTrackComponent
            activeTranscript={{
              exons: gene.exons,
              strand: gene.strand,
            }}
            exportFilename={`${gene.gene_id}_transcripts`}
            expressionLabel={
              <span>
                <ExternalLink href={`https://www.gtexportal.org/home/gene/${gene.symbol}`}>
                  Isoform expression
                </ExternalLink>
                <InfoButton topic="gtex" />
              </span>
            }
            renderTranscriptLeftPanel={({ transcript: trackTranscript }) => (
              <TranscriptLink
                to={`/gene/${gene.gene_id}/transcript/${trackTranscript.transcript_id}`}
                isSelected={trackTranscript.transcript_id === transcript.transcript_id}
              >
                {trackTranscript.transcript_id}.{trackTranscript.transcript_version}
                {trackTranscript.transcript_id === starredTranscriptId && ' *'}
              </TranscriptLink>
            )}
            showNonCodingTranscripts={includeNonCodingTranscripts}
            showUTRs={includeUTRs}
            transcripts={sortTranscripts(
              gene.transcripts.map(otherTranscript => ({
                ...otherTranscript,
                exons: otherTranscript.exons.some(exon => exon.feature_type !== 'exon')
                  ? otherTranscript.exons.filter(exon => exon.feature_type !== 'exon')
                  : otherTranscript.exons,
              })),
              starredTranscriptId
            )}
          >
            <span>* {starredTranscriptDescription}</span>
          </TranscriptsTrackComponent>

          {hasCodingExons && gene.pext && (
            <TissueExpressionTrack
              exons={cdsCompositeExons}
              expressionRegions={gene.pext.regions}
              flags={gene.pext.flags}
            />
          )}

          {datasetId === 'exac' && gene.exac_regional_missense_constraint_regions && (
            <RegionalConstraintTrack
              height={15}
              regions={gene.exac_regional_missense_constraint_regions}
            />
          )}

          <VariantsInTranscript
            datasetId={datasetId}
            includeNonCodingTranscripts={includeNonCodingTranscripts}
            includeUTRs={includeUTRs}
            transcript={transcript}
            width={regionViewerWidth}
          />
        </RegionViewer>
      </TrackPage>
    )
  }
}

export default TranscriptPage
