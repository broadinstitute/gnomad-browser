import React, { useCallback, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
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
import { useStableScrollbarGutter } from '../Haplotypes/scrollbarGutter'
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

type LongReadCohort = 'hgsvc_hprc' | 'aou'

type VariantsInRegionRendererProps = {
  datasetId: DatasetId
  region: Region
  zoomRegion: { start: number; stop: number } | null
  onChangeZoomRegion: (region: { start: number; stop: number } | null) => void
  onSetRegion: (region: { start: number; stop: number }) => void
  lrCohort: LongReadCohort
  onChangeLrCohort: (cohort: LongReadCohort) => void
  onGenealogyPanelVisibilityChange: (visible: boolean) => void
}

const variantsInRegion = ({ datasetId, region, zoomRegion, onChangeZoomRegion, onSetRegion, lrCohort, onChangeLrCohort, onGenealogyPanelVisibilityChange }: VariantsInRegionRendererProps) => {
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

  return (
    <RegularVariantsInRegion
      datasetId={datasetId}
      region={region}
      zoomRegion={zoomRegion}
      onChangeZoomRegion={onChangeZoomRegion}
      onSetRegion={onSetRegion}
      lrCohort={lrCohort}
      onChangeLrCohort={onChangeLrCohort}
      onGenealogyPanelVisibilityChange={onGenealogyPanelVisibilityChange}
    />
  )
}

const RegionPage = ({ datasetId, region }: RegionPageProps) => {
  const { chrom, start, stop } = region
  const [zoomRegion, setZoomRegion] = useState<{ start: number; stop: number } | null>(null)

  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900
  const location = useLocation()
  const history = useHistory()
  const haplotypeScrollbarGutter = useStableScrollbarGutter()
  const [genealogyPanelVisible, setGenealogyPanelVisible] = useState(false)
  const [lrCohort, setLrCohort] = useState<LongReadCohort>(
    new URLSearchParams(location.search).get('lr_cohort') === 'aou' ? 'aou' : 'hgsvc_hprc'
  )

  const changeLrCohort = useCallback((cohort: LongReadCohort) => {
    setLrCohort(cohort)
    const params = new URLSearchParams(location.search)
    params.set('lr_cohort', cohort)
    if (cohort === 'aou') params.delete('show_haplotypes')
    history.replace({ ...location, search: params.toString() })
  }, [history, location])

  // Subtract 30px for padding on Page component
  const regionViewerWidth = windowWidth - 30
  let regionViewerRightPanelWidth = isSmallScreen ? 0 : 80
  if (isLongRead(datasetId)) {
    regionViewerRightPanelWidth = haplotypeScrollbarGutter
    if (genealogyPanelVisible) regionViewerRightPanelWidth = isSmallScreen ? 180 : 250
  }

  const nccToRegion = (ncc: NonCodingConstraint) => {
    return {
      start: ncc.start,
      stop: ncc.stop,
      z: ncc.z,
      obs_exp: ncc.oe,
    }
  }

  // "Set as region" navigates to a new URL, triggering full remount + refetch
  const handleSetRegion = useCallback((newRegion: { start: number; stop: number }) => {
    const regionId = `${chrom}-${newRegion.start}-${newRegion.stop}`
    const currentParams = new URLSearchParams(location.search)
    history.push({
      pathname: `/region/${regionId}`,
      search: currentParams.toString(),
    })
  }, [chrom, history, location.search])

  // viewRegion drives RegionViewer's coordinate scaling (client-side only).
  // Data queries always use the full `region` — no refetch on zoom.
  const viewRegion = zoomRegion
    ? { ...region, start: zoomRegion.start, stop: zoomRegion.stop }
    : region

  let coverageTrack = null
  if (isLongRead(datasetId)) {
    coverageTrack = lrCohort === 'hgsvc_hprc'
      ? <LRCoverageTrack chrom={chrom} start={start} stop={stop} lrCohort={lrCohort} />
      : null
  } else if (region.chrom === 'M') {
    coverageTrack = <MitochondrialRegionCoverageTrack datasetId={datasetId} start={start} stop={stop} />
  } else {
    coverageTrack = (
      <RegionCoverageTrack
        datasetId={datasetId}
        chrom={chrom}
        includeExomeCoverage={regionsHaveExomeCoverage(datasetId)}
        includeGenomeCoverage={regionsHaveGenomeCoverage(datasetId)}
        start={start}
        stop={stop}
      />
    )
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
          {!isLongRead(datasetId) && (
            <RegionControlsWrapper>
              <RegionControls region={region} />
            </RegionControlsWrapper>
          )}
        </RegionInfoColumnWrapper>
      </TrackPageSection>
      <RegionViewer
        leftPanelWidth={115}
        regions={[isLongRead(datasetId) ? region : viewRegion]}
        rightPanelWidth={regionViewerRightPanelWidth}
        width={regionViewerWidth}
      >
        {coverageTrack}

        <GenesInRegionTrack genes={region.genes} region={viewRegion} />

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
        {variantsInRegion({
          datasetId,
          region,
          zoomRegion,
          onChangeZoomRegion: setZoomRegion,
          onSetRegion: handleSetRegion,
          lrCohort,
          onChangeLrCohort: changeLrCohort,
          onGenealogyPanelVisibilityChange: setGenealogyPanelVisible,
        })}
      </RegionViewer>
    </TrackPage>
  )
}

export default RegionPage

