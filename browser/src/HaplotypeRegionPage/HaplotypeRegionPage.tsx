import React, { useEffect, useState, useCallback } from 'react'
import styled from 'styled-components'
import { Badge, Button } from '@gnomad/ui'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import queryString from 'query-string'
import { debounce } from 'lodash-es'
import { useHistory } from 'react-router-dom'

import {
  DatasetId,
  labelForDataset,
} from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import RegionViewer from '../RegionViewer/RegionViewer'
import { TrackPage, TrackPageSection } from '../TrackPage'
import { useWindowSize } from '../windowSize'

import EditRegion from '../RegionPage/EditRegion'
import GenesInRegionTrack from '../RegionPage/GenesInRegionTrack'
import RegionInfo from '../RegionPage/RegionInfo'

import HaplotypeTrack, { HaplotypeGroups, Methylation, MethylationSummaryPoint } from '../Haplotypes'
import RecombinationRatePlot from '../Haplotypes/RecombinationRate'
import LRCoverageTrack from './LRCoverageTrack'

import { Region } from '../RegionPage/RegionPage'

const HAPLOTYPE_GROUPS_QUERY = `
  query RegionHaploGroups($chrom: String!, $start: Int!, $stop: Int!, $min_allele_freq: Float, $sort_by: String) {
    haplotype_groups(chrom: $chrom, start: $start, stop: $stop, min_allele_freq: $min_allele_freq, sort_by: $sort_by) {
      groups {
        samples { sample_id }
        variants {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased }
          readable_id
        }
        below_threshold {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased }
          readable_id
        }
        start stop hash
      }
    }
  }
`

const METHYLATION_SUMMARY_QUERY = `
  query RegionMethylationSummary($chrom: String!, $start: Int!, $stop: Int!) {
    methylation_summary(chrom: $chrom, start: $start, stop: $stop) {
      chrom pos1 pos2 mean_methylation mean_coverage num_samples std_methylation min_methylation max_methylation
    }
  }
`

const METHYLATION_OUTLIERS_QUERY = `
  query RegionMethylationOutliers($chrom: String!, $start: Int!, $stop: Int!) {
    methylation_outliers(chrom: $chrom, start: $start, stop: $stop) {
      total_cpg_sites total_samples
      samples { sample_id outlier_count outlier_fraction direction }
    }
  }
`

const METHYLATION_QUERY = `
  query RegionMethylation($chrom: String!, $start: Int!, $stop: Int!, $samples: [String!]) {
    methylation(chrom: $chrom, start: $start, stop: $stop, samples: $samples) {
      chr pos1 pos2 methylation sample coverage
    }
  }
`

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

const zoomRegion = (region: { chrom: string; start: number; stop: number }, factor: number) => {
  const center = (region.start + region.stop) / 2
  const newSize = (region.stop - region.start + 1) / factor
  return {
    chrom: region.chrom,
    start: Math.max(1, Math.floor(center - newSize / 2)),
    stop: Math.floor(center + newSize / 2),
  }
}

const HaplotypeRegionPage = ({ datasetId, region }: HaplotypeRegionPageProps) => {
  const { chrom, start, stop } = region
  const history = useHistory()
  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900
  const regionViewerWidth = windowWidth - 30

  const queryParams = queryString.parse(location.search)
  const initialThreshold = queryParams.threshold ? parseFloat(queryParams.threshold as string) : 0
  const initialSortBy = queryParams.sortBy ? (queryParams.sortBy as string) : 'similarity_score'

  const [haplotypeGroups, setHaplotypeGroups] = useState<HaplotypeGroups>({ groups: [] })
  const [haplotypeLoading, setHaplotypeLoading] = useState(true)
  const [methylationData, setMethylationData] = useState<Methylation[]>([])
  const [methylationSummary, setMethylationSummary] = useState<MethylationSummaryPoint[]>([])
  const [methylationOutliers, setMethylationOutliers] = useState<any>(null)
  const [methylationLoading, setMethylationLoading] = useState(false)
  const [methylationSampleCount, setMethylationSampleCount] = useState(0)
  const [methylationTotalSamples, setMethylationTotalSamples] = useState(0)
  const [threshold, setThreshold] = useState(initialThreshold)
  const [sortBy, setSortBy] = useState(initialSortBy)

  const fetchGraphQL = async (query: string, variables: any) => {
    const response = await fetch('/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    return response.json()
  }

  const debouncedFetchHaplotypeGroups = useCallback(
    debounce(async (currentThreshold: number) => {
      setHaplotypeLoading(true)
      try {
        const result = await fetchGraphQL(HAPLOTYPE_GROUPS_QUERY, {
          chrom, start, stop, min_allele_freq: currentThreshold, sort_by: sortBy,
        })
        if (result.data?.haplotype_groups) {
          setHaplotypeGroups(result.data.haplotype_groups)
        }
      } catch (error) {
        console.error('Error fetching haplotype groups:', error)
      } finally {
        setHaplotypeLoading(false)
      }
    }, 300),
    [chrom, start, stop, sortBy]
  )

  // Fetch summary + outlier ranking on mount
  useEffect(() => {
    const fetchSummaryAndOutliers = async () => {
      try {
        const [summaryResult, outlierResult] = await Promise.all([
          fetchGraphQL(METHYLATION_SUMMARY_QUERY, { chrom, start, stop }),
          fetchGraphQL(METHYLATION_OUTLIERS_QUERY, { chrom, start, stop }),
        ])
        if (summaryResult.data?.methylation_summary) {
          setMethylationSummary(summaryResult.data.methylation_summary)
        }
        if (outlierResult.data?.methylation_outliers) {
          setMethylationOutliers(outlierResult.data.methylation_outliers)
        }
      } catch (error) {
        console.error('Error fetching methylation data:', error)
      }
    }
    fetchSummaryAndOutliers()
  }, [chrom, start, stop])

  // Auto-fetch per-sample methylation for top outlier samples
  const MAX_AUTO_FETCH_OUTLIERS = 10
  useEffect(() => {
    const fetchOutlierMethylation = async () => {
      if (!methylationOutliers?.samples?.length) return

      // Take top N outlier samples by outlier_count
      const topOutliers = methylationOutliers.samples
        .slice(0, MAX_AUTO_FETCH_OUTLIERS)
        .filter((s: any) => s.outlier_count > 0)
        .map((s: any) => s.sample_id)

      if (topOutliers.length === 0) return

      console.log(`Fetching methylation for ${topOutliers.length} outlier samples`)
      setMethylationLoading(true)

      try {
        const result = await fetchGraphQL(METHYLATION_QUERY, {
          chrom, start, stop, samples: topOutliers,
        })
        if (result.data?.methylation) {
          setMethylationData(result.data.methylation)
          setMethylationSampleCount(0) // reset — these are just outliers
        }
      } catch (error) {
        console.error('Error fetching outlier methylation:', error)
      } finally {
        setMethylationLoading(false)
      }
    }
    fetchOutlierMethylation()
  }, [chrom, start, stop, methylationOutliers])

  const handleLoadAllSamples = useCallback(async () => {
    if (!haplotypeGroups || haplotypeGroups.groups.length === 0) return

    const allSampleIds = Array.from(new Set(
      haplotypeGroups.groups.flatMap(g => g.samples.map(s => s.sample_id))
    ))

    if (allSampleIds.length === 0) return

    setMethylationLoading(true)
    setMethylationSampleCount(0)
    setMethylationTotalSamples(allSampleIds.length)
    console.log(`Loading methylation for all ${allSampleIds.length} haplotype samples`)

    // Query in small batches, accumulate results progressively
    const BATCH_SIZE = 5
    let accumulated: Methylation[] = [...methylationData]
    let completed = 0
    const total = allSampleIds.length

    for (let i = 0; i < allSampleIds.length; i += BATCH_SIZE) {
      const batch = allSampleIds.slice(i, i + BATCH_SIZE)
      try {
        const result = await fetchGraphQL(METHYLATION_QUERY, {
          chrom, start, stop, samples: batch,
        })
        if (result.data?.methylation) {
          accumulated = [...accumulated, ...result.data.methylation]
          setMethylationData(accumulated)
        }
      } catch (error) {
        console.error(`Error fetching batch ${i / BATCH_SIZE}:`, error)
      }
      completed += batch.length
      setMethylationSampleCount(completed)
    }

    setMethylationLoading(false)
  }, [chrom, start, stop, haplotypeGroups, methylationData])

  useEffect(() => {
    debouncedFetchHaplotypeGroups(threshold)
  }, [chrom, start, stop, threshold, debouncedFetchHaplotypeGroups, sortBy])

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
              <span>Zoom in</span>
              {[1.5, 3, 10].map((z) => (
                <Button key={z} onClick={() => {
                  const r = zoomRegion(region, z)
                  history.push({
                    pathname: `/haplotype/region/${r.chrom}-${r.start}-${r.stop}`,
                    search: queryString.stringify({ threshold, sortBy }),
                  })
                }}>{z}x</Button>
              ))}
              <span style={{ marginLeft: '0.5em' }}>Zoom out</span>
              {[1.5, 3, 10].map((z) => (
                <Button key={z} onClick={() => {
                  const r = zoomRegion(region, 1 / z)
                  history.push({
                    pathname: `/haplotype/region/${r.chrom}-${r.start}-${r.stop}`,
                    search: queryString.stringify({ threshold, sortBy }),
                  })
                }}>{z}x</Button>
              ))}
            </div>
          </RegionControlsWrapper>
        </RegionInfoColumnWrapper>
      </TrackPageSection>
      <RegionViewer
        leftPanelWidth={115}
        regions={[region]}
        rightPanelWidth={isSmallScreen ? 0 : 80}
        width={regionViewerWidth}
      >
        <LRCoverageTrack chrom={region.chrom} start={region.start} stop={region.stop} />

        <RecombinationRatePlot chrom={region.chrom} start={region.start} stop={region.stop} />
        <GenesInRegionTrack genes={region.genes} region={region} />
        {haplotypeGroups && (
          <HaplotypeTrack
            haplotypeGroups={haplotypeGroups.groups}
            methylationData={methylationData}
            methylationSummary={methylationSummary}
            start={start}
            stop={stop}
            initialMinAf={threshold}
            onMinAfChange={setThreshold}
            initialSortBy={sortBy}
            onSortModeChange={setSortBy}
            onLoadAllSamples={handleLoadAllSamples}
            methylationLoading={methylationLoading}
            methylationSampleCount={methylationSampleCount}
            methylationTotalSamples={methylationTotalSamples}
            haplotypeLoading={haplotypeLoading}
          />
        )}
        <PositionAxisTrack />
      </RegionViewer>
    </TrackPage>
  )
}

export default HaplotypeRegionPage
