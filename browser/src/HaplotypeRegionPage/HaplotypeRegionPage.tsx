import React, { useEffect, useState, useCallback } from 'react'
import styled from 'styled-components'
import { Badge } from '@gnomad/ui'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import queryString from 'query-string'
import { debounce } from 'lodash-es'

import {
  DatasetId,
  labelForDataset,
  regionsHaveExomeCoverage,
  regionsHaveGenomeCoverage,
} from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import RegionViewer from '../RegionViewer/RegionViewer'
import { TrackPage, TrackPageSection } from '../TrackPage'
import { useWindowSize } from '../windowSize'

import EditRegion from '../RegionPage/EditRegion'
import GenesInRegionTrack from '../RegionPage/GenesInRegionTrack'
import MitochondrialRegionCoverageTrack from '../RegionPage/MitochondrialRegionCoverageTrack'
import RegionControls from '../RegionPage/RegionControls'
import RegionCoverageTrack from '../RegionPage/RegionCoverageTrack'
import RegionInfo from '../RegionPage/RegionInfo'

import HaplotypeTrack, { HaplotypeGroups, Methylation } from '../Haplotypes'
import RecombinationRatePlot from '../Haplotypes/RecombinationRate'

import { Region } from '../RegionPage/RegionPage'

const RegionInfoColumnWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }

  @media (max-width: 600px) {
    align-items: stretch;
  }
`

const RegionControlsWrapper = styled.div`
  @media (min-width: 1201px) {
    margin-top: 1em;
  }
`

type HaplotypeRegionPageProps = {
  datasetId: DatasetId
  region: Region
}

const HaplotypeRegionPage = ({ datasetId, region }: HaplotypeRegionPageProps) => {
  const { chrom, start, stop } = region
  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900
  const regionViewerWidth = windowWidth - 30

  const queryParams = queryString.parse(location.search)
  const initialThreshold = queryParams.threshold ? parseFloat(queryParams.threshold as string) : 0
  const initialSortBy = queryParams.sortBy ? (queryParams.sortBy as string) : 'similarity_score'

  const [haplotypeGroups, setHaplotypeGroups] = useState<HaplotypeGroups>({ groups: [] })
  const [methylationData, setMethylationData] = useState<Methylation[]>([])
  const [threshold, setThreshold] = useState(initialThreshold)
  const [sortBy, setSortBy] = useState(initialSortBy)

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
        `http://localhost:8123/methylation?start=${start}&stop=${stop}`
      )
      const data = await response.json()
      setMethylationData(data)
    } catch (error) {
      console.error('Error fetching methylation data:', error)
    }
  }

  useEffect(() => {
    fetchMethylationData(start, stop, 'sample_9_high')
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
  }, [threshold, sortBy])

  return (
    <TrackPage>
      <TrackPageSection>
        <DocumentTitle
          title={`${region.chrom}-${region.start}-${region.stop} (Haplotype) | ${labelForDataset(datasetId)}`}
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
          {`${region.chrom}-${region.start}-${region.stop}`} (Haplotype View)
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

        <RecombinationRatePlot chrom={region.chrom} start={region.start} stop={region.stop} />
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
      </RegionViewer>
    </TrackPage>
  )
}

export default HaplotypeRegionPage
