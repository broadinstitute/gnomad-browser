import { mean } from 'd3-array'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { RegionViewer } from '@broad/region-viewer'
import TranscriptsTrack, { TranscriptsTrackWithTissueExpression } from '@broad/track-transcripts'
import { ExternalLink } from '@broad/ui'

import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import RegionalConstraintTrack from '../RegionalConstraintTrack'
import RegionCoverageTrack from '../RegionPage/RegionCoverageTrack'
import StatusMessage from '../StatusMessage'
import TissueExpressionTrack from '../TissueExpressionTrack'
import { TrackPage, TrackPageSection } from '../TrackPage'
import TranscriptLink from '../TranscriptLink'

import Constraint from './constraint/Constraint'
import GeneCoverageTrack from './GeneCoverageTrack'
import GeneInfo from './GeneInfo'
import StructuralVariantsInGene from './StructuralVariantsInGene'
import VariantsInGene from './VariantsInGene'

const GeneName = styled.span`
  font-size: 0.75em;
  font-weight: 400;
`

const GeneInfoColumnWrapper = styled.div`
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

const sortTranscripts = (transcripts, canonicalTranscriptId) =>
  transcripts.sort((t1, t2) => {
    // Sort transcripts by isCanonical, mean expression, transcript ID
    if (t1.transcript_id === canonicalTranscriptId) {
      return -1
    }
    if (t2.transcript_id === canonicalTranscriptId) {
      return 1
    }

    const t1Mean = mean(Object.values(t1.gtex_tissue_expression || {}))
    const t2Mean = mean(Object.values(t2.gtex_tissue_expression || {}))

    if (t1Mean === t2Mean) {
      return t1.transcript_id.localeCompare(t2.transcript_id)
    }

    return t2Mean - t1Mean
  })

class GenePage extends Component {
  static propTypes = {
    datasetId: PropTypes.string.isRequired,
    gene: PropTypes.shape({
      gene_id: PropTypes.string.isRequired,
      reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
      symbol: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      exons: PropTypes.arrayOf(
        PropTypes.shape({
          feature_type: PropTypes.string.isRequired,
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
        })
      ).isRequired,
    }).isRequired,
    geneId: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
  }

  constructor(props) {
    super(props)

    const { gene } = props
    const hasCDS = gene.exons.some(exon => exon.feature_type === 'CDS')

    this.state = {
      includeNonCodingTranscripts: !hasCDS,
      includeUTRs: false,
    }
  }

  render() {
    const { datasetId, gene, geneId, width } = this.props
    const { includeUTRs, includeNonCodingTranscripts } = this.state

    const smallScreen = width < 900

    // Subtract 30px for padding on Page component
    const regionViewerWidth = width - 30

    const TranscriptsTrackComponent =
      gene.reference_genome === 'GRCh37' ? TranscriptsTrackWithTissueExpression : TranscriptsTrack

    const hasNonCodingTranscripts = gene.transcripts.some(
      tx => !tx.exons.some(exon => exon.feature_type === 'CDS')
    )

    const cdsCompositeExons = gene.exons.filter(exon => exon.feature_type === 'CDS')
    const hasCodingExons = cdsCompositeExons.length > 0

    const regionViewerRegions =
      datasetId === 'gnomad_sv_r2'
        ? [
            {
              feature_type: 'region',
              chrom: gene.chrom,
              start: gene.start,
              stop: gene.stop,
            },
          ]
        : gene.exons.filter(
            exon =>
              exon.feature_type === 'CDS' ||
              (exon.feature_type === 'UTR' && includeUTRs) ||
              (exon.feature_type === 'exon' && includeNonCodingTranscripts)
          )

    return (
      <TrackPage>
        <TrackPageSection>
          <DocumentTitle title={gene.symbol} />
          <GnomadPageHeading selectedDataset={datasetId}>
            {gene.symbol} <GeneName>{gene.name}</GeneName>
          </GnomadPageHeading>
          <GeneInfoColumnWrapper>
            <GeneInfo gene={gene} />
            <div>
              <h2>
                Constraint <QuestionMark topic="constraint" />
              </h2>
              <Constraint
                datasetId={datasetId}
                gene={gene}
                transcriptId={gene.canonical_transcript_id}
              />
            </div>
          </GeneInfoColumnWrapper>
        </TrackPageSection>
        <RegionViewer
          leftPanelWidth={100}
          width={regionViewerWidth}
          padding={75}
          regions={regionViewerRegions}
          rightPanelWidth={smallScreen ? 0 : 160}
        >
          {datasetId === 'gnomad_sv_r2' ? (
            <RegionCoverageTrack
              chrom={gene.chrom}
              datasetId={datasetId}
              showExomeCoverage={false}
              start={gene.start}
              stop={gene.stop}
            />
          ) : (
            hasCodingExons && <GeneCoverageTrack datasetId={datasetId} geneId={geneId} />
          )}

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
                    disabled={!gene.exons.some(exon => exon.feature_type === 'UTR')}
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
            <TranscriptsTrackComponent
              activeTranscript={{
                exons: gene.exons,
                strand: gene.strand,
              }}
              exportFilename={`${gene.gene_id}_transcripts`}
              expressionLabel={
                <span>
                  <ExternalLink href={`http://www.gtexportal.org/home/gene/${gene.symbol}`}>
                    Isoform expression
                  </ExternalLink>
                  <QuestionMark topic="gtex" />
                </span>
              }
              renderTranscriptLeftPanel={
                datasetId === 'gnomad_sv_r2'
                  ? ({ transcript }) => <span>{transcript.transcript_id}</span>
                  : ({ transcript }) => (
                      <TranscriptLink
                        to={`/transcript/${transcript.transcript_id}`}
                        isCanonical={transcript.transcript_id === gene.canonical_transcript_id}
                      >
                        {transcript.transcript_id}
                      </TranscriptLink>
                    )
              }
              showNonCodingTranscripts={includeNonCodingTranscripts}
              showUTRs={includeUTRs}
              transcripts={sortTranscripts(
                gene.transcripts.map(transcript => ({
                  ...transcript,
                  exons: transcript.exons.some(exon => exon.feature_type !== 'exon')
                    ? transcript.exons.filter(exon => exon.feature_type !== 'exon')
                    : transcript.exons,
                })),
                gene.canonical_transcript_id
              )}
            />
          )}

          {!hasCodingExons && (
            <StatusMessage>
              Coverage &amp; transcripts not shown for genes with no coding exons
            </StatusMessage>
          )}

          {hasCodingExons && gene.pext && (
            <TissueExpressionTrack exons={cdsCompositeExons} expressionRegions={gene.pext} />
          )}

          {datasetId === 'exac' && gene.exac_regional_missense_constraint_regions && (
            <RegionalConstraintTrack
              height={15}
              regions={gene.exac_regional_missense_constraint_regions}
            />
          )}

          {datasetId === 'gnomad_sv_r2' ? (
            <StructuralVariantsInGene gene={gene} width={regionViewerWidth} />
          ) : (
            <VariantsInGene datasetId={datasetId} gene={gene} width={regionViewerWidth} />
          )}
        </RegionViewer>
      </TrackPage>
    )
  }
}

export default GenePage
