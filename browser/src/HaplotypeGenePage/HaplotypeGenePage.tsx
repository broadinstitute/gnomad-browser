// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { TranscriptPlot } from '@gnomad/track-transcripts'
import { Badge, Button } from '@gnomad/ui'

import {
  DatasetId,
  genesHaveExomeCoverage,
  genesHaveGenomeCoverage,
  labelForDataset,
  hasStructuralVariants,
  hasExons,
  hasCopyNumberVariants,
} from '@gnomad/dataset-metadata/metadata'

import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import RegionCoverageTrack from '../RegionPage/RegionCoverageTrack'
import RegionViewer from '../RegionViewer/ZoomableRegionViewer'
import { TrackPage, TrackPageSection } from '../TrackPage'
import { useWindowSize } from '../windowSize'

import GeneCoverageTrack from '../GenePage/GeneCoverageTrack'
import GeneFlags from '../GenePage/GeneFlags'
import GeneInfo from '../GenePage/GeneInfo'
import GeneTranscriptsTrack from '../GenePage/GeneTranscriptsTrack'
import MitochondrialGeneCoverageTrack from '../GenePage/MitochondrialGeneCoverageTrack'
import MitochondrialVariantsInGene from '../GenePage/MitochondrialVariantsInGene'
import { getPreferredTranscript } from '../GenePage/preferredTranscript'
import StructuralVariantsInGene from '../GenePage/StructuralVariantsInGene'
import VariantsInGene from '../GenePage/VariantsInGene'
import CopyNumberVariantsInGene from '../GenePage/CopyNumberVariantsInGene'

import {
  ControlPanel,
  Legend,
  LegendItemWrapper,
  Label,
  CheckboxInput,
  LegendSwatch,
} from '../ChartStyles'

import HaplotypeTrack, { HaplotypeGroups } from '../Haplotypes'

import { Gene } from '../GenePage/GenePage'

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
  justify-content: flex-end;
  margin-bottom: 1em;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }

  @media (max-width: 600px) {
    align-items: stretch;
  }
`

const GeneInfoColumn = styled.div`
  width: 40%;

  @media (max-width: 1200px) {
    width: 100%;
  }
`

const TrackWrapper = styled.div`
  margin-bottom: 1em;
`

const ToggleTranscriptsPanel = styled.div`
  display: flex;
  flex-direction: row-reverse;
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
  datasetId: DatasetId
  gene: Gene
  geneId: string
}

const HaplotypeGenePage = ({ datasetId, gene, geneId }: Props) => {
  const hasCDS = gene.exons.some((exon) => exon.feature_type === 'CDS')

  const [includeNonCodingTranscripts, setIncludeNonCodingTranscripts] = useState(!hasCDS)
  const [includeUTRs, setIncludeUTRs] = useState(false)
  const [showTranscripts, setShowTranscripts] = useState(false)
  const [haplotypeGroups, setHaplotypeGroups] = useState<HaplotypeGroups | null>(null)

  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900

  const regionViewerWidth = windowWidth - 30

  const cdsCompositeExons = gene.exons.filter((exon) => exon.feature_type === 'CDS')
  const hasCodingExons = cdsCompositeExons.length > 0
  const hasUTRs = gene.exons.some((exon) => exon.feature_type === 'UTR')
  const hasNonCodingTranscripts = gene.transcripts.some(
    (tx) => !tx.exons.some((exon) => exon.feature_type === 'CDS')
  )

  const regionViewerRegions = !hasExons(datasetId)
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

  useEffect(() => {
    const fetchHaplotypeGroups = async () => {
      try {
        const response = await fetch(
          `http://localhost:8123/haplo?start=${gene.start}&stop=${gene.stop}`
        )
        const data = await response.json()
        setHaplotypeGroups(data)
      } catch (error) {
        console.error('Error fetching haplotype groups:', error)
      }
    }

    fetchHaplotypeGroups()
  }, [gene.start, gene.stop])

  return (
    <TrackPage>
      <TrackPageSection>
        <DocumentTitle title={`${gene.symbol} (Haplotype) | ${labelForDataset(datasetId)}`} />
        <GnomadPageHeading
          selectedDataset={datasetId}
          datasetOptions={{
            includeShortVariants: true,
            includeStructuralVariants: gene.chrom !== 'M',
            includeCopyNumberVariants: true,
            includeExac: gene.chrom !== 'M',
            includeGnomad2: gene.chrom !== 'M',
            includeGnomad3: true,
            includeGnomad3Subsets: gene.chrom !== 'M',
            includeGnomad4Subsets: true,
          }}
        >
          {gene.symbol} <GeneName>{gene.name} (Haplotype View)</GeneName>
        </GnomadPageHeading>
        <GeneInfoColumnWrapper>
          <GeneInfoColumn>
            {/* @ts-expect-error TS(2741) FIXME: Property 'gencode_symbol' is missing in type '{ ge... Remove this comment to see the full error message */}
            <GeneInfo gene={gene} />
            <GeneFlags gene={gene} />
            {gene.short_tandem_repeats && gene.short_tandem_repeats.length > 0 && (
              <p>
                <Badge level="info">Note</Badge> Data is available for a{' '}
                <Link to={`/short-tandem-repeat/${gene.short_tandem_repeats[0].id}`}>
                  tandem repeat locus
                </Link>{' '}
                in this gene.
              </p>
            )}
          </GeneInfoColumn>
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
        zoomDisabled={!hasExons(datasetId)}
        zoomRegion={zoomRegion}
        onChangeZoomRegion={setZoomRegion}
      >
        {/* eslint-disable-next-line no-nested-ternary */}
        {!hasExons(datasetId) ? (
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
            includeExomeCoverage={genesHaveExomeCoverage(datasetId)}
            includeGenomeCoverage={genesHaveGenomeCoverage(datasetId)}
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
                  <img
                    alt={`${gene.strand === '-' ? 'Negative' : 'Positive'} strand`}
                    src={gene.strand === '-' ? LeftArrow : RightArrow}
                    height={20}
                    width={20}
                  />
                  {gene.chrom === 'M' ? (
                    'Transcript'
                  ) : (
                    <Button
                      onClick={() => {
                        setShowTranscripts((prevShowTranscripts) => !prevShowTranscripts)
                      }}
                    >
                      {showTranscripts ? 'Hide' : 'Show'} transcripts
                    </Button>
                  )}
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
              isTissueExpressionAvailable={!!gene.pext}
              gene={gene}
              includeNonCodingTranscripts={includeNonCodingTranscripts}
              includeUTRs={includeUTRs}
              preferredTranscriptId={preferredTranscriptId}
              preferredTranscriptDescription={preferredTranscriptDescription}
            />
          </TrackWrapper>
        )}

        {haplotypeGroups && (
          <HaplotypeTrack
            haplotypeGroups={haplotypeGroups.groups}
            methylationData={[]}
            start={gene.start}
            stop={gene.stop}
          />
        )}

        {/* eslint-disable-next-line no-nested-ternary */}
        {hasStructuralVariants(datasetId) ? (
          <StructuralVariantsInGene datasetId={datasetId} gene={gene} zoomRegion={zoomRegion} />
        ) : // eslint-disable-next-line no-nested-ternary
        hasCopyNumberVariants(datasetId) ? (
          <CopyNumberVariantsInGene datasetId={datasetId} gene={gene} zoomRegion={zoomRegion} />
        ) : gene.chrom === 'M' ? (
          <MitochondrialVariantsInGene datasetId={datasetId} gene={gene} zoomRegion={zoomRegion} />
        ) : (
          <VariantsInGene
            datasetId={datasetId}
            gene={gene}
            includeNonCodingTranscripts={includeNonCodingTranscripts}
            includeUTRs={includeUTRs}
            zoomRegion={zoomRegion}
            hasOnlyNonCodingTranscripts={!hasCodingExons && hasNonCodingTranscripts}
          />
        )}
      </RegionViewer>
    </TrackPage>
  )
}

export default HaplotypeGenePage
