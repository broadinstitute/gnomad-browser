import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled from 'styled-components'

import { Badge } from '@gnomad/ui'

import {
  DatasetId,
  labelForDataset,
  hasNonCodingConstraints,
  regionsHaveExomeCoverage,
  regionsHaveGenomeCoverage,
  isSVs,
  isV4CNVs,
  isLongRead,
} from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import RegionalGenomicConstraintTrack from '../RegionalGenomicConstraintTrack'
import RegionViewer from '../RegionViewer/RegionViewer'
import { TrackPage, TrackPageSection } from '../TrackPage'
import { useWindowSize } from '../windowSize'

import LRCoverageTrack from '../HaplotypeRegionPage/LRCoverageTrack'
import ZoomOverview from '../Haplotypes/ZoomOverview'
import EditRegion from './EditRegion'
import GenesInRegionTrack from './GenesInRegionTrack'
import MitochondrialRegionCoverageTrack from './MitochondrialRegionCoverageTrack'
import MitochondrialVariantsInRegion from './MitochondrialVariantsInRegion'
import RegionControls from './RegionControls'
import RegionCoverageTrack from './RegionCoverageTrack'
import RegionInfo from './RegionInfo'
import RegularVariantsInRegion from './VariantsInRegion'
import StructuralVariantsInRegion from './StructuralVariantsInRegion'
import CopyNumberVariantsInRegion from './CopyNumberVariantsInRegion'

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

type NonCodingConstraint = {
  start: number
  stop: number
  oe: number
  z: number
}

export type Region = {
  reference_genome: 'GRCh37' | 'GRCh38'
  chrom: string
  start: number
  stop: number
  genes: any[]
  short_tandem_repeats?: {
    id: string
  }[]
  non_coding_constraints: NonCodingConstraint[] | null
}

type RegionPageProps = {
  datasetId: DatasetId
  region: Region
}

const variantsInRegion = (datasetId: DatasetId, region: Region, zoomRegion?: { start: number; stop: number } | null) => {
  if (isSVs(datasetId)) {
    return <StructuralVariantsInRegion datasetId={datasetId} region={region} zoomRegion={region} />
  }

  if (isV4CNVs(datasetId)) {
    return <CopyNumberVariantsInRegion datasetId={datasetId} region={region} zoomRegion={region} />
  }

  if (region.chrom === 'M') {
    return (
      <MitochondrialVariantsInRegion datasetId={datasetId} region={region} zoomRegion={region} />
    )
  }

  return <RegularVariantsInRegion datasetId={datasetId} region={region} zoomRegion={zoomRegion} />
}

const RegionPage = ({ datasetId, region }: RegionPageProps) => {
  const { chrom, start, stop } = region
  const [zoomRegion, setZoomRegion] = useState<{ start: number; stop: number } | null>(null)

  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900
  const location = useLocation()
  const showTree = isLongRead(datasetId) && new URLSearchParams(location.search).get('show_tree') === 'true'

  // Subtract 30px for padding on Page component
  const regionViewerWidth = windowWidth - 30

  const nccToRegion = (ncc: NonCodingConstraint) => {
    return {
      start: ncc.start,
      stop: ncc.stop,
      z: ncc.z,
      obs_exp: ncc.oe,
    }
  }

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
            includeCopyNumberVariants: true,
            includeExac: region.reference_genome === 'GRCh37' && chrom !== 'M',
            includeGnomad2: region.reference_genome === 'GRCh37' && chrom !== 'M',
            includeGnomad3: region.reference_genome === 'GRCh38' || chrom === 'M',
            includeGnomad3Subsets: chrom !== 'M',
            includeGnomad4Subsets: true,
          }}
        >
          {`${region.chrom}-${region.start}-${region.stop}`}
        </GnomadPageHeading>
        <RegionInfoColumnWrapper>
          <div>
            <RegionInfo region={region} />
            {region.short_tandem_repeats && region.short_tandem_repeats.length > 0 && (
              <p>
                <Badge level="info">Note</Badge> Data is available for a{' '}
                <Link to={`/short-tandem-repeat/${region.short_tandem_repeats[0].id}`}>
                  tandem repeat locus
                </Link>{' '}
                within this region.
              </p>
            )}
          </div>
          <RegionControlsWrapper>
            <RegionControls region={region} />
          </RegionControlsWrapper>
        </RegionInfoColumnWrapper>
      </TrackPageSection>
      {isLongRead(datasetId) && (
        <TrackPageSection>
          <ZoomOverview
            overviewRegion={{ start, stop }}
            currentRegion={zoomRegion || { start, stop }}
            chrom={chrom}
            genes={region.genes}
            onChangeRegion={setZoomRegion}
            onSetRegion={setZoomRegion}
          />
        </TrackPageSection>
      )}
      <RegionViewer
        leftPanelWidth={115}
        regions={[region]}
        rightPanelWidth={isSmallScreen ? 0 : showTree ? 250 : 80}
        width={regionViewerWidth}
      >
        {/* eslint-disable-next-line no-nested-ternary */}
        {isLongRead(datasetId) ? (
          <LRCoverageTrack chrom={chrom} start={start} stop={stop} />
        ) : region.chrom === 'M' ? (
          <MitochondrialRegionCoverageTrack datasetId={datasetId} start={start} stop={stop} />
        ) : (
          <RegionCoverageTrack
            datasetId={datasetId}
            chrom={chrom}
            includeExomeCoverage={regionsHaveExomeCoverage(datasetId)}
            includeGenomeCoverage={regionsHaveGenomeCoverage(datasetId)}
            start={start}
            stop={stop}
          />
        )}

        <GenesInRegionTrack genes={region.genes} region={region} />

        {hasNonCodingConstraints(datasetId) && (
          <>
            <RegionalGenomicConstraintTrack
              start={region.start}
              stop={region.stop}
              regions={
                region.non_coding_constraints !== null
                  ? region.non_coding_constraints.map(nccToRegion)
                  : null
              }
            />
          </>
        )}
        {variantsInRegion(datasetId, region, zoomRegion)}
      </RegionViewer>
    </TrackPage>
  )
}

export default RegionPage
