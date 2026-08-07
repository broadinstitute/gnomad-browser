import React, { useEffect, useState, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { Badge } from '@gnomad/ui'
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

import HaplotypeTrack, { HaplotypeGroups } from '../Haplotypes'
import HaplotypeVariantTable from '../Haplotypes/HaplotypeVariantTable'
import ZoomOverview from '../Haplotypes/ZoomOverview'
import RecombinationRatePlot from '../Haplotypes/RecombinationRate'
import LRCoverageTrack from './LRCoverageTrack'
import MQTLTrack from '../Haplotypes/MQTLTrack'
import { parseMinimumAlleleFrequency } from '../Haplotypes/minimumAlleleFrequency'

import { Region } from '../RegionPage/RegionPage'

const SAMPLE_METADATA_QUERY = `
  query RegionSampleMetadata {
    sample_metadata { sample_id subpopulation superpopulation }
  }
`

export type SampleMetadataMap = Map<string, { subpopulation: string; superpopulation: string }>

const MQTL_QUERY = `
  query RegionMQTL($chrom: String!, $start: Int!, $stop: Int!, $min_af: Float) {
    mqtl_associations(chrom: $chrom, start: $start, stop: $stop, min_af: $min_af) {
      variant_id variant_pos cpg_pos p_value effect_size carrier_count non_carrier_count
    }
  }
`

const HAPLOTYPE_GROUPS_QUERY = `
  query RegionHaploGroups($chrom: String!, $start: Int!, $stop: Int!, $min_allele_freq: Float, $sort_by: String) {
    haplotype_groups(chrom: $chrom, start: $start, stop: $stop, min_allele_freq: $min_allele_freq, sort_by: $sort_by) {
      groups {
        samples { sample_id vcf_strand phase_set }
        variants {
          variants { variant_id chrom pos end ref alt allele_type allele_length freq { af ac an } populations { id af } rsid major_consequence cadd_phred phylop filters sv_consequences tr_id tr_motifs gnomad_str dbsnp_id allele_methylation allele_purity motif_counts in_samples in_haplotypes { sample_id vcf_strand phase_set } gt_phased }
          readable_id
        }
        below_threshold {
          variants { variant_id chrom pos end ref alt allele_type allele_length freq { af ac an } populations { id af } rsid major_consequence cadd_phred phylop filters sv_consequences tr_id tr_motifs gnomad_str dbsnp_id allele_methylation allele_purity motif_counts in_samples in_haplotypes { sample_id vcf_strand phase_set } gt_phased }
          readable_id
        }
        start stop hash
      }
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


type HaplotypeRegionPageProps = {
  datasetId: DatasetId
  region: Region
}


const HaplotypeRegionPage = ({ datasetId, region }: HaplotypeRegionPageProps) => {
  const { chrom, start, stop } = region
  const history = useHistory()
  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900
  const regionViewerWidth = windowWidth - 30

  const queryParams = queryString.parse(location.search)
  const initialThreshold = parseMinimumAlleleFrequency(queryParams.threshold)
  const initialSortBy = queryParams.sortBy ? (queryParams.sortBy as string) : 'similarity_score'
  const initialColorMode = (queryParams.colorMode as string) || 'sv_type'
  const initialShowGenealogy = queryParams.showTree === '1'

  const [haplotypeGroups, setHaplotypeGroups] = useState<HaplotypeGroups>({ groups: [] })
  const [haplotypeLoading, setHaplotypeLoading] = useState(true)
  const [threshold, setThreshold] = useState(initialThreshold)
  const [sortBy, setSortBy] = useState(initialSortBy)
  const [colorMode, setColorMode] = useState(initialColorMode)
  const [showGenealogy, setShowGenealogy] = useState(initialShowGenealogy)

  const [sampleMetadata, setSampleMetadata] = useState<SampleMetadataMap>(new Map())

  const [mqtlData, setMqtlData] = useState<any[]>([])
  const [mqtlLoading, setMqtlLoading] = useState(false)
  const [showMqtl, setShowMqtl] = useState(false)
  const [mqtlMinLogP, setMqtlMinLogP] = useState(0)

  const [hoveredVariantPosition, setHoveredVariantPosition] = useState<number | null>(null)

  // Local zoom state — the URL region is the full data bounds,
  // zoomView is the sub-region currently displayed in the tracks
  const [zoomView, setZoomView] = useState<{ start: number; stop: number } | null>(null)

  // Reset zoom when the URL region changes
  useEffect(() => {
    setZoomView(null)
  }, [chrom, start, stop])

  const viewRegion = useMemo((): Region => {
    if (!zoomView) return region
    return { ...region, start: zoomView.start, stop: zoomView.stop }
  }, [region, zoomView])

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

  // Fetch sample metadata on mount (small static table)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const result = await fetchGraphQL(SAMPLE_METADATA_QUERY, {})
        if (result.data?.sample_metadata) {
          const map: SampleMetadataMap = new Map()
          for (const s of result.data.sample_metadata) {
            map.set(s.sample_id, { subpopulation: s.subpopulation, superpopulation: s.superpopulation })
          }
          setSampleMetadata(map)
        }
      } catch (error) {
        console.error('Error fetching sample metadata:', error)
      }
    }
    fetchMeta()
  }, [])

  useEffect(() => {
    debouncedFetchHaplotypeGroups(threshold)
  }, [chrom, start, stop, threshold, debouncedFetchHaplotypeGroups, sortBy])

  useEffect(() => {
    if (!showMqtl) return
    const fetchMQTLs = async () => {
      setMqtlLoading(true)
      try {
        const result = await fetchGraphQL(MQTL_QUERY, { chrom, start, stop, min_af: threshold })
        if (result.data?.mqtl_associations) {
          setMqtlData(result.data.mqtl_associations)
        }
      } catch (e) {
        console.error('Error fetching mQTLs:', e)
      } finally {
        setMqtlLoading(false)
      }
    }
    fetchMQTLs()
  }, [chrom, start, stop, threshold, showMqtl])

  useEffect(() => {
    const newSearchParams = queryString.stringify({
      ...queryParams,
      threshold: threshold.toString(),
      sortBy,
      plotType: undefined,
      colorMode,
      ...(showGenealogy ? { showTree: '1' } : { showTree: undefined }),
    })
    window.history.pushState({}, '', `${location.pathname}?${newSearchParams}`)
  }, [threshold, sortBy, colorMode, showGenealogy])

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
        </RegionInfoColumnWrapper>
        <ZoomOverview
          overviewRegion={{ start, stop }}
          currentRegion={zoomView || { start, stop }}
          chrom={chrom}
          genes={region.genes}
          onChangeRegion={setZoomView}
          onSetRegion={(newRegion) => {
            history.push({
              pathname: `/haplotype/region/${chrom}-${newRegion.start}-${newRegion.stop}`,
              search: queryString.stringify({ threshold, sortBy, colorMode }),
            })
          }}
          onNavigateRegion={(newRegion) => {
            history.push({
              pathname: `/haplotype/region/${newRegion.chrom}-${newRegion.start}-${newRegion.stop}`,
              search: queryString.stringify({ threshold, sortBy, colorMode }),
            })
          }}
        />
      </TrackPageSection>
      <RegionViewer
        leftPanelWidth={150}
        regions={[viewRegion]}
        rightPanelWidth={isSmallScreen ? 0 : showGenealogy ? 250 : 80}
        width={regionViewerWidth}
      >
        <LRCoverageTrack chrom={viewRegion.chrom} start={viewRegion.start} stop={viewRegion.stop} />

        <RecombinationRatePlot chrom={viewRegion.chrom} start={viewRegion.start} stop={viewRegion.stop} />
        <GenesInRegionTrack genes={region.genes.filter((g: any) => g.stop >= viewRegion.start && g.start <= viewRegion.stop)} region={viewRegion} />
        {/* TODO: Re-enable when mQTL data source is production-ready */}
        {false && showMqtl && (
          <MQTLTrack mqtlData={mqtlData} loading={mqtlLoading} minLogP={mqtlMinLogP} onMinLogPChange={setMqtlMinLogP} />
        )}
        {haplotypeGroups && (
          <HaplotypeTrack
            haplotypeGroups={haplotypeGroups.groups}
            methylationData={[]}
            sampleMetadata={sampleMetadata}
            start={viewRegion.start}
            stop={viewRegion.stop}
            initialMinAf={threshold}
            onMinAfChange={setThreshold}
            initialSortBy={sortBy}
            onSortModeChange={setSortBy}
            haplotypeLoading={haplotypeLoading}
            showMqtl={false}
            onShowMqtlChange={setShowMqtl}
            mqtlLoading={mqtlLoading}
            mqtlData={mqtlData}
            mqtlMinLogP={mqtlMinLogP}
            initialColorMode={colorMode}
            onColorModeChange={setColorMode}
            showGenealogy={showGenealogy}
            onShowGenealogyChange={setShowGenealogy}
            hoveredVariantPosition={hoveredVariantPosition}
          />
        )}
        <PositionAxisTrack />
      </RegionViewer>
      {haplotypeGroups && (
        <TrackPageSection>
          <HaplotypeVariantTable
            haplotypeGroups={haplotypeGroups}
            sampleMetadata={sampleMetadata}
            onHoverVariant={setHoveredVariantPosition}
          />
        </TrackPageSection>
      )}
    </TrackPage>
  )
}

export default HaplotypeRegionPage

