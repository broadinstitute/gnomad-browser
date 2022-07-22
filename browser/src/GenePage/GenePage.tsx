// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import React, { useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { TranscriptPlot } from '@gnomad/track-transcripts'
import { Badge, Button } from '@gnomad/ui'

import ConstraintTable from '../ConstraintTable/ConstraintTable'
import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import RegionalConstraintTrack from '../RegionalConstraintTrack'
import RegionCoverageTrack from '../RegionPage/RegionCoverageTrack'
import RegionViewer from '../RegionViewer/ZoomableRegionViewer'
import { TrackPage, TrackPageSection } from '../TrackPage'
import { useWindowSize } from '../windowSize'

import GeneCoverageTrack from './GeneCoverageTrack'
import GeneFlags from './GeneFlags'
import GeneInfo from './GeneInfo'
import GeneTranscriptsTrack from './GeneTranscriptsTrack'
import MitochondrialGeneCoverageTrack from './MitochondrialGeneCoverageTrack'
import MitochondrialVariantsInGene from './MitochondrialVariantsInGene'
import { getPreferredTranscript } from './preferredTranscript'
import StructuralVariantsInGene from './StructuralVariantsInGene'
import TissueExpressionTrack from './TissueExpressionTrack'
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
  margin-bottom: 1em;

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
  width: ${(props: any) => props.width}px;
  margin-left: ${(props: any) => props.marginLeft}px;

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
    height: ${(props: any) => props.height}px;
    background: ${(props: any) => props.color};
  }
`

const TrackWrapper = styled.div`
  margin-bottom: 1em;
`

const ToggleTranscriptsPanel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  height: 50px;
  padding-right: 5px;

  button {
    width: 70px;
    height: auto;
    padding-right: 0.25em;
    padding-left: 0.25em;
  }

  svg {
    fill: #424242;
  }
`

const CompositeTranscriptPlotWrapper = styled.div`
  display: flex;
  align-items: center;
  height: 50px;
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

type Props = {
  datasetId: string
  gene: {
    gene_id: string
    gene_version: string
    reference_genome: 'GRCh37' | 'GRCh38'
    symbol: string
    name?: string
    chrom: string
    strand: '+' | '-'
    start: number
    stop: number
    exons: {
      feature_type: string
      start: number
      stop: number
    }[]
    transcripts: {
      transcript_id: string
      transcript_version: string
      exons: {
        feature_type: string
        start: number
        stop: number
      }[]
    }[]
    canonical_transcript_id?: string
    mane_select_transcript?: {
      ensembl_id: string
      ensembl_version: string
      refseq_id: string
      refseq_version: string
    }
    pext?: {
      regions: {
        start: number
        stop: number
        mean: number
        tissues: {
          [key: string]: number
        }
      }[]
      flags: string[]
    }
    short_tandem_repeats?: {
      id: string
    }[]
    exac_regional_missense_constraint_regions?: any
  }
  geneId: string
}

const GenePage = ({ datasetId, gene, geneId }: Props) => {
  const hasCDS = gene.exons.some((exon) => exon.feature_type === 'CDS')

  const [includeNonCodingTranscripts, setIncludeNonCodingTranscripts] = useState(!hasCDS)
  const [includeUTRs, setIncludeUTRs] = useState(false)
  const [showTranscripts, setShowTranscripts] = useState(false)

  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900

  // Subtract 30px for padding on Page component
  const regionViewerWidth = windowWidth - 30

  const cdsCompositeExons = gene.exons.filter((exon) => exon.feature_type === 'CDS')
  const hasCodingExons = cdsCompositeExons.length > 0
  const hasUTRs = gene.exons.some((exon) => exon.feature_type === 'UTR')
  const hasNonCodingTranscripts = gene.transcripts.some(
    (tx) => !tx.exons.some((exon) => exon.feature_type === 'CDS')
  )

  const regionViewerRegions = datasetId.startsWith('gnomad_sv')
    ? [
        {
          start: Math.max(1, gene.start - 75),
          stop: gene.stop + 75,
        },
      ]
    : gene.exons
        .filter(
          (exon) =>
            exon.feature_type === 'CDS' ||
            (exon.feature_type === 'UTR' && includeUTRs) ||
            (exon.feature_type === 'exon' && includeNonCodingTranscripts)
        )
        .map((exon) => ({
          start: Math.max(1, exon.start - 75),
          stop: exon.stop + 75,
        }))

  const [zoomRegion, setZoomRegion] = useState(null)

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
            {/* @ts-expect-error TS(2741) FIXME: Property 'gencode_symbol' is missing in type '{ ge... Remove this comment to see the full error message */}
            <GeneInfo gene={gene} />
            {/* @ts-expect-error TS(2741) FIXME: Property 'flags' is missing in type '{ gene_id: st... Remove this comment to see the full error message */}
            <GeneFlags gene={gene} />
            {gene.short_tandem_repeats && gene.short_tandem_repeats.length > 0 && (
              <p>
                <Badge level="info">Note</Badge> This gene contains a pathogenic{' '}
                <Link to={`/short-tandem-repeat/${gene.short_tandem_repeats[0].id}`}>
                  short tandem repeat
                </Link>
                .
              </p>
            )}
          </div>
          <div>
            <h2>Constraint {gene.chrom !== 'M' && <InfoButton topic="constraint" />}</h2>
            <ConstraintTable datasetId={datasetId} geneOrTranscript={gene} />
          </div>
        </GeneInfoColumnWrapper>
      </TrackPageSection>
      <RegionViewer
        contextType="gene"
        leftPanelWidth={115}
        width={regionViewerWidth}
        regions={regionViewerRegions}
        rightPanelWidth={isSmallScreen ? 0 : 80}
        renderOverview={({ scalePosition, width: overviewWidth }: any) => (
          <TranscriptPlot
            height={10}
            scalePosition={scalePosition}
            showNonCodingExons={includeNonCodingTranscripts}
            showUTRs={includeUTRs}
            transcript={{ exons: gene.exons }}
            width={overviewWidth}
          />
        )}
        zoomDisabled={datasetId.startsWith('gnomad_sv')}
        zoomRegion={zoomRegion}
        onChangeZoomRegion={setZoomRegion}
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

        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ControlPanel marginLeft={100} width={regionViewerWidth - 100 - (isSmallScreen ? 0 : 80)}>
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
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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
                  onChange={(e: any) => {
                    setIncludeUTRs(e.target.checked)
                  }}
                />
                Untranslated regions (UTRs)
                <LegendSwatch
                  color={transcriptFeatureAttributes.UTR.fill}
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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
                  onChange={(e: any) => {
                    setIncludeNonCodingTranscripts(e.target.checked)
                  }}
                />
                Non-coding transcripts
                <LegendSwatch
                  color={transcriptFeatureAttributes.exon.fill}
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                  height={transcriptFeatureAttributes.exon.height}
                />
              </Label>
            </LegendItemWrapper>
          </Legend>
        </ControlPanel>

        <TrackWrapper>
          <Track
            renderLeftPanel={() => {
              return (
                <ToggleTranscriptsPanel>
                  <Button
                    onClick={() => {
                      setShowTranscripts((prevShowTranscripts) => !prevShowTranscripts)
                    }}
                  >
                    {showTranscripts ? 'Hide' : 'Show'} transcripts
                  </Button>
                  <img
                    alt={`${gene.strand === '-' ? 'Negative' : 'Positive'} strand`}
                    src={gene.strand === '-' ? LeftArrow : RightArrow}
                    height={20}
                    width={20}
                  />
                </ToggleTranscriptsPanel>
              )
            }}
          >
            {({ scalePosition, width: trackWidth }: any) => (
              <CompositeTranscriptPlotWrapper>
                <TranscriptPlot
                  height={20}
                  scalePosition={scalePosition}
                  showNonCodingExons={includeNonCodingTranscripts}
                  showUTRs={includeUTRs}
                  transcript={{ exons: gene.exons }}
                  width={trackWidth}
                />
              </CompositeTranscriptPlotWrapper>
            )}
          </Track>
        </TrackWrapper>

        {showTranscripts && (
          <TrackWrapper>
            <GeneTranscriptsTrack
              datasetId={datasetId}
              gene={gene}
              includeNonCodingTranscripts={includeNonCodingTranscripts}
              includeUTRs={includeUTRs}
              preferredTranscriptId={preferredTranscriptId}
              preferredTranscriptDescription={preferredTranscriptDescription}
            />
          </TrackWrapper>
        )}

        {hasCodingExons && gene.chrom !== 'M' && gene.pext && (
          <TissueExpressionTrack
            exons={cdsCompositeExons}
            expressionRegions={gene.pext.regions}
            flags={gene.pext.flags}
            transcripts={gene.transcripts}
            preferredTranscriptId={preferredTranscriptId}
            preferredTranscriptDescription={preferredTranscriptDescription}
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
          <StructuralVariantsInGene datasetId={datasetId} gene={gene} zoomRegion={zoomRegion} />
        ) : gene.chrom === 'M' ? (
          <MitochondrialVariantsInGene datasetId={datasetId} gene={gene} zoomRegion={zoomRegion} />
        ) : (
          <VariantsInGene
            datasetId={datasetId}
            gene={gene}
            // @ts-expect-error TS(2322) FIXME: Type '{ datasetId: string; gene: { gene_id: string... Remove this comment to see the full error message
            includeNonCodingTranscripts={includeNonCodingTranscripts}
            includeUTRs={includeUTRs}
            zoomRegion={zoomRegion}
          />
        )}
      </RegionViewer>
    </TrackPage>
  )
}

export default GenePage
