import { mean } from 'd3-array'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { RegionViewer } from '@gnomad/region-viewer'
import TranscriptsTrack, { TranscriptsTrackWithTissueExpression } from '@gnomad/track-transcripts'
import { ExternalLink } from '@gnomad/ui'

import ConstraintTable from '../ConstraintTable/ConstraintTable'
import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import RegionalConstraintTrack from '../RegionalConstraintTrack'
import RegionCoverageTrack from '../RegionPage/RegionCoverageTrack'
import TissueExpressionTrack from '../TissueExpressionTrack'
import { TrackPage, TrackPageSection } from '../TrackPage'

import GeneCoverageTrack from './GeneCoverageTrack'
import GeneFlags from './GeneFlags'
import GeneInfo from './GeneInfo'
import MitochondrialGeneCoverageTrack from './MitochondrialGeneCoverageTrack'
import MitochondrialVariantsInGene from './MitochondrialVariantsInGene'
import { getPreferredTranscript } from './preferredTranscript'
import StructuralVariantsInGene from './StructuralVariantsInGene'
import VariantsInGene from './VariantsInGene'

const GeneName = styled.span`
  overflow: hidden;
  font-size: 0.75em;
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
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

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    margin-left: 0;
  }
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

class GenePage extends Component {
  static propTypes = {
    datasetId: PropTypes.string.isRequired,
    gene: PropTypes.shape({
      gene_id: PropTypes.string.isRequired,
      gene_version: PropTypes.string.isRequired,
      reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
      symbol: PropTypes.string.isRequired,
      name: PropTypes.string,
      chrom: PropTypes.string.isRequired,
      strand: PropTypes.oneOf(['+', '-']).isRequired,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
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

    const cdsCompositeExons = gene.exons.filter(exon => exon.feature_type === 'CDS')
    const hasCodingExons = cdsCompositeExons.length > 0
    const hasUTRs = gene.exons.some(exon => exon.feature_type === 'UTR')
    const hasNonCodingTranscripts = gene.transcripts.some(
      tx => !tx.exons.some(exon => exon.feature_type === 'CDS')
    )

    const regionViewerRegions = datasetId.startsWith('gnomad_sv')
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

    // In the transcripts track, mark the preferred transcript with an asterisk.
    const { preferredTranscriptId, preferredTranscriptDescription } = getPreferredTranscript(gene)

    return (
      <TrackPage>
        <TrackPageSection>
          <DocumentTitle title={`${gene.symbol} | ${labelForDataset(datasetId)}`} />
          <GnomadPageHeading
            selectedDataset={datasetId}
            datasetOptions={{
              includeShortVariants: true,
              includeStructuralVariants: gene.chrom !== 'M',
              includeExac: gene.chrom !== 'M',
              includeGnomad2: gene.chrom !== 'M',
              includeGnomad3: true,
              includeGnomad3Subsets: gene.chrom !== 'M',
            }}
          >
            {gene.symbol} <GeneName>{gene.name}</GeneName>
          </GnomadPageHeading>
          <GeneInfoColumnWrapper>
            <div style={{ maxWidth: '50%' }}>
              <GeneInfo gene={gene} />
              <GeneFlags gene={gene} />
            </div>
            <div>
              <h2>Constraint {gene.chrom !== 'M' && <InfoButton topic="constraint" />}</h2>
              <ConstraintTable datasetId={datasetId} geneOrTranscript={gene} />
            </div>
          </GeneInfoColumnWrapper>
        </TrackPageSection>
        <RegionViewer
          leftPanelWidth={115}
          width={regionViewerWidth}
          padding={75}
          regions={regionViewerRegions}
          rightPanelWidth={smallScreen ? 0 : 160}
        >
          {/* eslint-disable-next-line no-nested-ternary */}
          {datasetId.startsWith('gnomad_sv') ? (
            <RegionCoverageTrack
              chrom={gene.chrom}
              datasetId={datasetId}
              includeExomeCoverage={false}
              start={gene.start}
              stop={gene.stop}
            />
          ) : gene.chrom === 'M' ? (
            <MitochondrialGeneCoverageTrack datasetId={datasetId} geneId={geneId} />
          ) : (
            <GeneCoverageTrack
              datasetId={datasetId}
              geneId={geneId}
              includeExomeCoverage={!datasetId.startsWith('gnomad_r3')}
            />
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
                  Coding regions (CDS)
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
                  Untranslated regions (UTRs)
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
                  Non-coding transcripts
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
            renderTranscriptLeftPanel={
              datasetId.startsWith('gnomad_sv')
                ? ({ transcript }) => (
                    <span>
                      {transcript.transcript_id}.{transcript.transcript_version}
                      {transcript.transcript_id === preferredTranscriptId && '*'}
                    </span>
                  )
                : ({ transcript }) => (
                    <Link to={`/transcript/${transcript.transcript_id}`}>
                      {transcript.transcript_id}.{transcript.transcript_version}
                      {transcript.transcript_id === preferredTranscriptId && '*'}
                    </Link>
                  )
            }
            showNonCodingTranscripts={includeNonCodingTranscripts}
            showUTRs={includeUTRs}
            transcripts={sortTranscripts(gene.transcripts, preferredTranscriptId)}
          >
            {preferredTranscriptDescription && <span>* {preferredTranscriptDescription}</span>}
          </TranscriptsTrackComponent>

          {hasCodingExons && gene.chrom !== 'M' && gene.pext && (
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

          {/* eslint-disable-next-line no-nested-ternary */}
          {datasetId.startsWith('gnomad_sv') ? (
            <StructuralVariantsInGene datasetId={datasetId} gene={gene} />
          ) : gene.chrom === 'M' ? (
            <MitochondrialVariantsInGene datasetId={datasetId} gene={gene} />
          ) : (
            <VariantsInGene
              datasetId={datasetId}
              gene={gene}
              includeNonCodingTranscripts={includeNonCodingTranscripts}
              includeUTRs={includeUTRs}
            />
          )}
        </RegionViewer>
      </TrackPage>
    )
  }
}

export default GenePage
