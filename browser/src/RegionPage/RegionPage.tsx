import React, { useEffect, useState, useCallback } from 'react'
import styled from 'styled-components'
import { Badge } from '@gnomad/ui'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import queryString from 'query-string'
import {
  DatasetId,
  labelForDataset,
  hasNonCodingConstraints,
  regionsHaveExomeCoverage,
  regionsHaveGenomeCoverage,
  isSVs,
  isV4CNVs,
} from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import RegionalGenomicConstraintTrack from '../RegionalGenomicConstraintTrack'
import HaplotypeTrack, { HaplotypeGroup, HaplotypeGroups, Methylation } from '../Haplotypes'
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
import RegularVariantsInRegion from './VariantsInRegion'
import StructuralVariantsInRegion from './StructuralVariantsInRegion'
import CopyNumberVariantsInRegion from './CopyNumberVariantsInRegion'
import { debounce } from 'lodash'

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

const SliderWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1em;

  input {
    margin-left: 10px;
    flex-grow: 1;
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

const variantsInRegion = (datasetId: DatasetId, region: Region) => {
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

  return <RegularVariantsInRegion datasetId={datasetId} region={region} />
}

const RegionPage = ({ datasetId, region }: RegionPageProps) => {
  const { chrom, start, stop } = region
  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900

  // Subtract 30px for padding on Page component
  const regionViewerWidth = windowWidth - 30

  const queryParams = queryString.parse(location.search)
  const initialThreshold = queryParams.threshold ? parseFloat(queryParams.threshold as string) : 0
  const initialSortBy = queryParams.sortBy ? (queryParams.sortBy as string) : 'similarity_score'

  const [haplotypeGroups, setHaplotypeGroups] = useState<HaplotypeGroups>({ groups: [] })
  const [methylationData, setMethylationData] = useState<Methylation[]>([])
  const [threshold, setThreshold] = useState(initialThreshold)
  const [sortBy, setSortBy] = useState(initialSortBy)

  const nccToRegion = (ncc: NonCodingConstraint) => {
    return {
      start: ncc.start,
      stop: ncc.stop,
      z: ncc.z,
      obs_exp: ncc.oe,
    }
  }

  const debouncedFetchHaplotypeGroups = useCallback(
    debounce(async (threshold: number) => {
      try {
        const url = `http://localhost:8123/haplo?start=${start}&stop=${stop}&min_allele_freq=${threshold}&sort_by=${sortBy}`
        const response = await fetch(url)
        const data = await response.json()
        setHaplotypeGroups(data)
      } catch (error) {
        console.error('Error fetching haplotype groups:', error)
      }
    }, 300),
    [start, stop, sortBy]
  )
  const fetchMethylationData = async (start: number, stop: number, sample: string) => {
    try {
      const response = await fetch(
        `http://localhost:8123/methylation?start=${start}&stop=${stop}&sample=${sample}`
      )
      const data = await response.json()
      setMethylationData(data)
      console.log('Methylation Data:', data)
    } catch (error) {
      console.error('Error fetching methylation data:', error)
    }
  }

  useEffect(() => {
    fetchMethylationData(start, stop, 'sample1')
  }, [start, stop])

  useEffect(() => {
    debouncedFetchHaplotypeGroups(threshold)
  }, [start, stop, threshold, debouncedFetchHaplotypeGroups, sortBy])

  useEffect(() => {
    const newSearchParams = queryString.stringify({
      ...queryParams,
      threshold: threshold.toString(),
      sortBy,
    })
    window.history.pushState({}, '', `${location.pathname}?${newSearchParams}`)
  }, [threshold, queryParams, sortBy])

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
                <Badge level='info'>Note</Badge> Data is available for a{' '}
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
      <RegionViewer
        leftPanelWidth={115}
        regions={[region]}
        rightPanelWidth={isSmallScreen ? 0 : 80}
        width={regionViewerWidth}
      >
        {region.chrom === 'M' ? (
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
        {haplotypeGroups && (
          <HaplotypeTrack
            haplotypeGroups={haplotypeGroups.groups}
            methylationData={methylationData}
            start={start}
            stop={stop}
            initialMinAf={threshold}
            onMinAfChange={setThreshold}
            initialSortBy={sortBy}
            onSortModeChange={setSortBy}
          />
        )}
        <PositionAxisTrack />
        {/* {variantsInRegion(datasetId, region)} */}
      </RegionViewer>
    </TrackPage>
  )
}

export default RegionPage
