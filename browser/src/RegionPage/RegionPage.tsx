import React from 'react'
import styled from 'styled-components'

import { Badge } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import RegionViewer from '../RegionViewer/RegionViewer'
import { TrackPage, TrackPageSection } from '../TrackPage'
import { useWindowSize } from '../windowSize'

import EditRegion from './EditRegion'
import GenesInRegionTrack from './GenesInRegionTrack'
import MitochondrialRegionCoverageTrack from './MitochondrialRegionCoverageTrack'
import MitochondrialVariantsInRegion from './MitochondrialVariantsInRegion'
import RegionControls from './RegionControls'
import RegionCoverageTrack from './RegionCoverageTrack'
import RegionInfo from './RegionInfo'
import VariantsInRegion from './VariantsInRegion'
import StructuralVariantsInRegion from './StructuralVariantsInRegion'

const RegionInfoColumnWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }

  /* Matches responsive styles in AttributeList */
  @media (max-width: 600px) {
    align-items: stretch;
  }
`

const RegionControlsWrapper = styled.div`
  @media (min-width: 1201px) {
    margin-top: 1em;
  }
`

type Props = {
  datasetId: string
  region: {
    reference_genome: 'GRCh37' | 'GRCh38'
    chrom: string
    start: number
    stop: number
    genes: any[]
    short_tandem_repeats?: {
      id: string
    }[]
  }
}

// eslint-disable-next-line no-shadow
const RegionPage = ({ datasetId, region }: Props) => {
  const { chrom, start, stop } = region

  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900

  // Subtract 30px for padding on Page component
  const regionViewerWidth = windowWidth - 30

  return (
    <TrackPage>
      <TrackPageSection>
        <DocumentTitle
          title={`${region.chrom}-${region.start}-${region.stop} | ${labelForDataset(datasetId)}`}
        />
        <GnomadPageHeading
          extra={<EditRegion initialRegion={region} style={{ marginLeft: '1em' }} />}
          selectedDataset={datasetId}
          datasetOptions={{
            includeShortVariants: true,
            includeStructuralVariants: chrom !== 'M',
            includeExac: region.reference_genome === 'GRCh37' && chrom !== 'M',
            includeGnomad2: region.reference_genome === 'GRCh37' && chrom !== 'M',
            includeGnomad3: region.reference_genome === 'GRCh38' || chrom === 'M',
            includeGnomad3Subsets: chrom !== 'M',
          }}
        >
          {`${region.chrom}-${region.start}-${region.stop}`}
        </GnomadPageHeading>
        <RegionInfoColumnWrapper>
          <div>
            <RegionInfo region={region} />
            {region.short_tandem_repeats && region.short_tandem_repeats.length > 0 && (
              <p>
                <Badge level="info">Note</Badge> This region contains a pathogenic{' '}
                <Link to={`/short-tandem-repeat/${region.short_tandem_repeats[0].id}`}>
                  short tandem repeat
                </Link>
                .
              </p>
            )}
          </div>
          <RegionControlsWrapper>
            <RegionControls region={region} />
          </RegionControlsWrapper>
        </RegionInfoColumnWrapper>
      </TrackPageSection>
      <RegionViewer
        leftPanelWidth={115}
        regions={[region]}
        rightPanelWidth={isSmallScreen ? 0 : 80}
        width={regionViewerWidth}
      >
        {region.chrom === 'M' ? (
          <MitochondrialRegionCoverageTrack
            datasetId={datasetId}
            // @ts-expect-error TS(2322) FIXME: Type '{ datasetId: string; chrom: string; start: n... Remove this comment to see the full error message
            chrom={chrom}
            start={start}
            stop={stop}
          />
        ) : (
          <RegionCoverageTrack
            datasetId={datasetId}
            chrom={chrom}
            includeExomeCoverage={
              !datasetId.startsWith('gnomad_sv') && !datasetId.startsWith('gnomad_r3')
            }
            start={start}
            stop={stop}
          />
        )}

        <GenesInRegionTrack genes={region.genes} region={region} />

        {/* eslint-disable-next-line no-nested-ternary */}
        {datasetId.startsWith('gnomad_sv') ? (
          <StructuralVariantsInRegion datasetId={datasetId} region={region} zoomRegion={region} />
        ) : region.chrom === 'M' ? (
          <MitochondrialVariantsInRegion
            datasetId={datasetId}
            region={region}
            zoomRegion={region}
          />
        ) : (
          // @ts-expect-error TS(2322) FIXME: Type '{ datasetId: string; region: { reference_gen... Remove this comment to see the full error message
          <VariantsInRegion datasetId={datasetId} region={region} zoomRegion={region} />
        )}
      </RegionViewer>
    </TrackPage>
  )
}

export default RegionPage
