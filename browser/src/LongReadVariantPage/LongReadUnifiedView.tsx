import { throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { SegmentedControl } from '@gnomad/ui'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import { debounce } from 'lodash-es'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import Cursor from '../RegionViewerCursor'
import { TrackPageSection } from '../TrackPage'

import HaplotypeTrack, { HaplotypeGroups, Methylation, MethylationSummaryPoint } from '../Haplotypes'
import HaplotypeVariantTable from '../Haplotypes/HaplotypeVariantTable'
import RecombinationRatePlot from '../Haplotypes/RecombinationRate'
import MQTLTrack from '../Haplotypes/MQTLTrack'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import LongReadVariantTrack from './LongReadVariantTrack'
import Variants from '../VariantList/Variants'

// --- GraphQL queries (ported from HaplotypeRegionPage) ---

const SAMPLE_METADATA_QUERY = `
  query RegionSampleMetadata {
    sample_metadata { sample_id subpopulation superpopulation }
  }
`

const HAPLOTYPE_GROUPS_QUERY = `
  query RegionHaploGroups($chrom: String!, $start: Int!, $stop: Int!, $min_allele_freq: Float, $sort_by: String) {
    haplotype_groups(chrom: $chrom, start: $start, stop: $stop, min_allele_freq: $min_allele_freq, sort_by: $sort_by) {
      groups {
        samples { sample_id }
        variants {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased allele_type allele_length gnomad_v4_match_type info_AF_afr info_AF_amr info_AF_eas info_AF_nfe info_AF_sas cadd_phred phylop sv_consequences dbgap_id tr_id tr_motifs tr_struc allele_methylation motif_counts allele_purity }
          readable_id
        }
        below_threshold {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased allele_type allele_length gnomad_v4_match_type info_AF_afr info_AF_amr info_AF_eas info_AF_nfe info_AF_sas cadd_phred phylop sv_consequences dbgap_id tr_id tr_motifs tr_struc allele_methylation motif_counts allele_purity }
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

const MQTL_QUERY = `
  query RegionMQTL($chrom: String!, $start: Int!, $stop: Int!, $min_af: Float) {
    mqtl_associations(chrom: $chrom, start: $start, stop: $stop, min_af: $min_af) {
      variant_id variant_pos cpg_pos p_value effect_size carrier_count non_carrier_count
    }
  }
`

// --- Styled components ---

const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`

const InfoBanner = styled.div`
  background: #fff3e0;
  border: 1px solid #ffe0b2;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  color: #e65100;
  margin-bottom: 12px;
`

// --- Component ---

type LongReadUnifiedViewProps = {
  datasetId: DatasetId
  gene: {
    gene_id?: string
    symbol?: string
    chrom: string
    start: number
    stop: number
  }
  variants: any[]
  zoomRegion?: { start: number; stop: number } | null
  clinvarReleaseDate?: string
}

const fetchGraphQL = async (query: string, variables: any) => {
  const response = await fetch('/api/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  return response.json()
}

const LongReadUnifiedView = ({
  datasetId,
  gene,
  variants,
  zoomRegion,
  clinvarReleaseDate,
}: LongReadUnifiedViewProps) => {
  const { chrom, start, stop } = gene

  const [viewMode, setViewMode] = useState<'summary' | 'haplotype'>('summary')

  // Haplotype mode state
  const [haplotypeGroups, setHaplotypeGroups] = useState<HaplotypeGroups>({ groups: [] })
  const [haplotypeLoading, setHaplotypeLoading] = useState(false)
  const [sampleMetadata, setSampleMetadata] = useState<SampleMetadataMap>(new Map())

  const [methylationData, setMethylationData] = useState<Methylation[]>([])
  const [methylationSummary, setMethylationSummary] = useState<MethylationSummaryPoint[]>([])
  const [methylationOutliers, setMethylationOutliers] = useState<any>(null)
  const [methylationLoading, setMethylationLoading] = useState(false)
  const [methylationSampleCount, setMethylationSampleCount] = useState(0)
  const [methylationTotalSamples, setMethylationTotalSamples] = useState(0)

  const [threshold, setThreshold] = useState(0)
  const [sortBy, setSortBy] = useState('similarity_score')
  const [plotType, setPlotType] = useState('lollipop')
  const [colorMode, setColorMode] = useState('allele')
  const [showGenealogy, setShowGenealogy] = useState(false)

  const [mqtlData, setMqtlData] = useState<any[]>([])
  const [mqtlLoading, setMqtlLoading] = useState(false)
  const [showMqtl, setShowMqtl] = useState(false)
  const [mqtlMinLogP, setMqtlMinLogP] = useState(0)

  const [hoveredVariantPosition, setHoveredVariantPosition] = useState<number | null>(null)

  // Track state for VariantTrack / Cursor integration
  const [variantHoveredInTable, setVariantHoveredInTable] = useState<string | null>(null)
  const [variantHoveredInTrack, setVariantHoveredInTrack] = useState<string | null>(null)
  const [visibleVariantWindow, setVisibleVariantWindow] = useState([0, 19])

  const onHoverVariantsInTrack = useMemo(
    () =>
      throttle((hoveredVariants: any) => {
        setVariantHoveredInTrack(hoveredVariants.length > 0 ? hoveredVariants[0].variant_id : null)
      }, 100),
    []
  )

  const onVisibleRowsChange = useMemo(
    () =>
      throttle(({ startIndex, stopIndex }: any) => {
        setVisibleVariantWindow([startIndex, stopIndex])
      }, 100),
    []
  )

  // Use zoom region or gene bounds for haplotype queries
  const queryRegion = useMemo(
    () => ({
      start: zoomRegion?.start ?? start,
      stop: zoomRegion?.stop ?? stop,
    }),
    [zoomRegion, start, stop]
  )

  // Fetch sample metadata once when entering haplotype mode
  useEffect(() => {
    if (viewMode !== 'haplotype') return
    if (sampleMetadata.size > 0) return

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
  }, [viewMode, sampleMetadata.size])

  // Debounced haplotype group fetch
  const debouncedFetchHaplotypeGroups = useCallback(
    debounce(async (currentThreshold: number) => {
      setHaplotypeLoading(true)
      try {
        const result = await fetchGraphQL(HAPLOTYPE_GROUPS_QUERY, {
          chrom,
          start: queryRegion.start,
          stop: queryRegion.stop,
          min_allele_freq: currentThreshold,
          sort_by: sortBy,
        })
        if (result.errors) {
          console.error('GraphQL errors fetching haplotype groups:', result.errors)
        }
        if (result.data?.haplotype_groups) {
          setHaplotypeGroups(result.data.haplotype_groups)
        }
      } catch (error) {
        console.error('Error fetching haplotype groups:', error)
      } finally {
        setHaplotypeLoading(false)
      }
    }, 300),
    [chrom, queryRegion.start, queryRegion.stop, sortBy]
  )

  // Fetch haplotype groups when in haplotype mode
  useEffect(() => {
    if (viewMode !== 'haplotype') return
    debouncedFetchHaplotypeGroups(threshold)
  }, [viewMode, chrom, queryRegion.start, queryRegion.stop, threshold, debouncedFetchHaplotypeGroups, sortBy])

  // Fetch methylation summary + outliers when entering haplotype mode
  useEffect(() => {
    if (viewMode !== 'haplotype') return

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
  }, [viewMode, chrom, start, stop])

  // Auto-fetch per-sample methylation for top outlier samples
  const MAX_AUTO_FETCH_OUTLIERS = 10
  useEffect(() => {
    if (viewMode !== 'haplotype') return

    const fetchOutlierMethylation = async () => {
      if (!methylationOutliers?.samples?.length) return

      const topOutliers = methylationOutliers.samples
        .slice(0, MAX_AUTO_FETCH_OUTLIERS)
        .filter((s: any) => s.outlier_count > 0)
        .map((s: any) => s.sample_id)

      if (topOutliers.length === 0) return

      setMethylationLoading(true)
      try {
        const result = await fetchGraphQL(METHYLATION_QUERY, {
          chrom, start, stop, samples: topOutliers,
        })
        if (result.data?.methylation) {
          setMethylationData(result.data.methylation)
          setMethylationSampleCount(0)
        }
      } catch (error) {
        console.error('Error fetching outlier methylation:', error)
      } finally {
        setMethylationLoading(false)
      }
    }
    fetchOutlierMethylation()
  }, [viewMode, chrom, start, stop, methylationOutliers])

  // Load all sample methylation (triggered from HaplotypeTrack)
  const handleLoadAllSamples = useCallback(async () => {
    if (!haplotypeGroups || haplotypeGroups.groups.length === 0) return

    const allSampleIds = Array.from(new Set(
      haplotypeGroups.groups.flatMap(g => g.samples.map(s => s.sample_id))
    ))
    if (allSampleIds.length === 0) return

    setMethylationLoading(true)
    setMethylationSampleCount(0)
    setMethylationTotalSamples(allSampleIds.length)

    const BATCH_SIZE = 5
    let accumulated: Methylation[] = [...methylationData]
    let completed = 0

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

  // Fetch mQTLs when enabled
  useEffect(() => {
    if (viewMode !== 'haplotype' || !showMqtl) return
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
  }, [viewMode, chrom, start, stop, threshold, showMqtl])

  // Filter variants for display based on zoom
  const withFrequency = (variant: any) => variant.freq !== null

  const displayVariants = useMemo(() => {
    let filtered = variants.filter(withFrequency)
    if (zoomRegion) {
      filtered = filtered.filter(
        (v: any) => v.pos >= zoomRegion.start && v.pos <= zoomRegion.stop
      )
    }
    return filtered
  }, [variants, zoomRegion])

  // Map LR variants into the standard shape expected by Variants/VariantTable
  const mappedVariants = useMemo(
    () =>
      displayVariants.map((v: any) => {
        const freq = v.freq?.all || {}
        const tc = v.transcript_consequences?.[0]
        return {
          ...v,
          consequence: v.major_consequence,
          ac: freq.ac ?? 0,
          an: freq.an ?? 0,
          af: freq.af ?? 0,
          ac_hom: freq.homozygote_alt_count ?? 0,
          ac_hemi: 0,
          hgvs: tc?.hgvs || '',
          hgvsc: tc?.hgvsc || '',
          hgvsp: tc?.hgvsp || '',
          rsids: v.rsids || [],
          flags: [],
          filters: v.filters || [],
          populations: [],
          is_long_read: true,
        }
      }),
    [displayVariants]
  )

  const onNavigatorClick = useCallback(() => {}, [])

  return (
    <>
      {viewMode === 'summary' && (
        <LongReadVariantTrack variants={displayVariants} />
      )}

      {viewMode === 'haplotype' && (
        <>
          <RecombinationRatePlot chrom={chrom} start={queryRegion.start} stop={queryRegion.stop} />
          {showMqtl && (
            <MQTLTrack
              mqtlData={mqtlData}
              loading={mqtlLoading}
              minLogP={mqtlMinLogP}
              onMinLogPChange={setMqtlMinLogP}
            />
          )}
          {haplotypeGroups && (
            <HaplotypeTrack
              haplotypeGroups={haplotypeGroups.groups}
              methylationData={methylationData}
              methylationSummary={methylationSummary}
              sampleMetadata={sampleMetadata}
              start={queryRegion.start}
              stop={queryRegion.stop}
              initialMinAf={threshold}
              onMinAfChange={setThreshold}
              initialSortBy={sortBy}
              onSortModeChange={setSortBy}
              onLoadAllSamples={handleLoadAllSamples}
              methylationLoading={methylationLoading}
              methylationSampleCount={methylationSampleCount}
              methylationTotalSamples={methylationTotalSamples}
              haplotypeLoading={haplotypeLoading}
              showMqtl={showMqtl}
              onShowMqtlChange={setShowMqtl}
              mqtlLoading={mqtlLoading}
              mqtlData={mqtlData}
              mqtlMinLogP={mqtlMinLogP}
              plotType={plotType}
              onPlotTypeChange={setPlotType}
              initialColorMode={colorMode}
              onColorModeChange={setColorMode}
              showGenealogy={showGenealogy}
              onShowGenealogyChange={setShowGenealogy}
              hoveredVariantPosition={hoveredVariantPosition}
            />
          )}
          <PositionAxisTrack />
        </>
      )}

      <TrackPageSection>
        <ToggleWrapper>
          <SegmentedControl
            id="lr-view-mode"
            options={[
              { label: 'Summary', value: 'summary' },
              { label: 'Haplotype', value: 'haplotype' },
            ]}
            value={viewMode}
            onChange={(value: string) => setViewMode(value as 'summary' | 'haplotype')}
          />
        </ToggleWrapper>

        {viewMode === 'haplotype' && (
          <InfoBanner>
            Viewing phased haplotypes for a deeply-sequenced subset of 292 samples.
            Some rare variants from the full summary callset may not appear in this mode.
          </InfoBanner>
        )}
      </TrackPageSection>

      {viewMode === 'summary' ? (
        <TrackPageSection>
          <HaplotypeVariantTable
            mode="summary"
            summaryVariants={displayVariants}
            onHoverVariant={setHoveredVariantPosition}
          />
        </TrackPageSection>
      ) : (
        <TrackPageSection>
          {haplotypeGroups && (
            <HaplotypeVariantTable
              mode="haplotype"
              haplotypeGroups={haplotypeGroups}
              sampleMetadata={sampleMetadata}
              onHoverVariant={setHoveredVariantPosition}
            />
          )}
        </TrackPageSection>
      )}
    </>
  )
}

export default LongReadUnifiedView
