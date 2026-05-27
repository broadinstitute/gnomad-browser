import { throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { SegmentedControl } from '@gnomad/ui'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import { debounce } from 'lodash-es'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import Cursor from '../RegionViewerCursor'
import { TrackPageSection } from '../TrackPage'

import HaplotypeTrack, { HaplotypeGroups, HaplotypeTrackHandle, Methylation, MethylationSummaryPoint } from '../Haplotypes'
import HaplotypeVariantTable, { HaplotypeVariantTableHandle } from '../Haplotypes/HaplotypeVariantTable'
import RecombinationRatePlot from '../Haplotypes/RecombinationRate'
import MQTLTrack from '../Haplotypes/MQTLTrack'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import LongReadVariantTrack from './LongReadVariantTrack'
import VariantDensityTrack from './VariantDensityTrack'
import { getLodVisibility } from './variantUtils'
import Variants from '../VariantList/Variants'
import ZoomOverview from '../Haplotypes/ZoomOverview'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'

// --- GraphQL queries (ported from HaplotypeRegionPage) ---

const SAMPLE_METADATA_QUERY = `
  query RegionSampleMetadata {
    sample_metadata { sample_id subpopulation superpopulation }
  }
`

const HAPLOTYPE_GROUPS_QUERY = `
  query RegionHaploGroups($chrom: String!, $start: Int!, $stop: Int!, $min_allele_freq: Float, $sort_by: String, $cluster_threshold: Float) {
    haplotype_groups(chrom: $chrom, start: $start, stop: $stop, min_allele_freq: $min_allele_freq, sort_by: $sort_by, cluster_threshold: $cluster_threshold) {
      groups {
        samples { sample_id }
        variants {
          variants { variant_id chrom pos end ref alt allele_type allele_length freq { af ac an } populations { id af } rsid major_consequence cadd_phred phylop filters sv_consequences tr_id tr_motifs gnomad_str dbgap_id allele_methylation allele_purity motif_counts in_samples gt_phased }
          readable_id
        }
        below_threshold {
          variants { variant_id chrom pos end ref alt allele_type allele_length freq { af ac an } populations { id af } rsid major_consequence cadd_phred phylop filters sv_consequences tr_id tr_motifs gnomad_str dbgap_id allele_methylation allele_purity motif_counts in_samples gt_phased }
          readable_id
        }
        start stop hash
      }
      clusters {
        cluster_id
        sample_count
        member_group_hashes
        consensus_variants {
          cluster_af
          variant { variant_id chrom pos end ref alt allele_type allele_length freq { af ac an } populations { id af } rsid major_consequence cadd_phred phylop filters sv_consequences tr_id tr_motifs gnomad_str dbgap_id allele_methylation allele_purity motif_counts in_samples gt_phased }
        }
      }
      tree_json
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

/**
 * Reconstruct full group objects from variant_ids + variant_dict.
 * This lets downstream components (HaplotypeTrack, HaplotypeVariantTable)
 * work unchanged — they still see groups with full variant objects.
 */
const hydrateGroups = (rawGroups: any) => {
  console.time('[perf] hydrateGroups')
  const variantArray: any[] = rawGroups.variants || []
  console.log(`[perf] variant array size: ${variantArray.length} entries`)

  const groups = (rawGroups.groups || []).map((g: any) => {
    // If the group already has hydrated variants (legacy/GraphQL path), pass through
    if (g.variants?.variants) return g

    const indices: number[] = g.variant_indices || []
    const aboveVariants = indices.map((i: number) => variantArray[i]).filter(Boolean)
    const readableId = aboveVariants
      .map((v: any) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
      .sort()
      .join(';')

    const belowVariants = (g.below_threshold || []).map((bt: any) => {
      const variant = bt.vi != null ? variantArray[bt.vi] : null
      return variant ? { ...variant, in_samples: bt.in_samples } : null
    }).filter(Boolean)

    return {
      ...g,
      variants: { variants: aboveVariants, readable_id: readableId },
      below_threshold: { variants: belowVariants, readable_id: '' },
    }
  })

  console.log(`[perf] hydrated ${groups.length} groups`)
  console.timeEnd('[perf] hydrateGroups')
  return {
    groups,
    clusters: rawGroups.clusters || undefined,
    tree_json: rawGroups.tree_json || undefined,
  }
}

// --- Styled components ---

const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`


// --- Component ---

type ZoomGene = {
  gene_id?: string
  symbol?: string
  start: number
  stop: number
  exons?: { feature_type: string; start: number; stop: number }[]
}

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
  clinvarReleaseDate?: string
  genes?: ZoomGene[]
  zoomRegion?: { start: number; stop: number } | null
  onChangeZoomRegion?: (region: { start: number; stop: number } | null) => void
  onSetRegion?: (region: { start: number; stop: number }) => void
}

const fetchGraphQL = async (query: string, variables: any) => {
  const response = await fetch('/api/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const queryName = query.match(/query\s+(\w+)/)?.[1] || 'unknown'
  console.time(`[perf] JSON parse (${queryName})`)
  const text = await response.text()
  console.log(`[perf] response size (${queryName}): ${(text.length / 1024 / 1024).toFixed(2)} MB`)
  const parsed = JSON.parse(text)
  console.timeEnd(`[perf] JSON parse (${queryName})`)
  return parsed
}

const fetchHaplotypeGroupsREST = async (
  chrom: string, start: number, stop: number, minAf: number, sortBy: string,
  clusterThreshold?: number
) => {
  const params = new URLSearchParams({
    chrom, start: String(start), stop: String(stop),
    min_af: String(minAf), sort_by: sortBy,
  })
  if (clusterThreshold != null) {
    params.set('cluster_threshold', String(clusterThreshold))
  }
  const response = await fetch(`/api/lr/haplotype-groups?${params}`)
  return response.json()
}

// Toggle via ?api=graphql in URL — defaults to rest (deduplicated, ~30x smaller)
const useRestApi = () => {
  try {
    return new URLSearchParams(window.location.search).get('api') !== 'graphql'
  } catch { return true }
}

/** Auto-calculate a reasonable cluster threshold based on region size */
function getAutoClusterThreshold(regionSize: number): number {
  if (regionSize < 50_000) return 0.0
  if (regionSize > 1_000_000) return 0.70
  // Linear interpolation between 0.35 and 0.65 for 50k-1M
  const t = (regionSize - 50_000) / (1_000_000 - 50_000)
  return 0.35 + t * 0.30
}

const MAX_HAPLOTYPE_REGION_SIZE = 5_000_000

const LongReadUnifiedView = ({
  datasetId,
  gene,
  variants,
  clinvarReleaseDate,
  genes = [],
  zoomRegion = null,
  onChangeZoomRegion,
  onSetRegion,
}: LongReadUnifiedViewProps) => {
  const { chrom, start, stop } = gene
  const regionSize = stop - start
  const regionTooLarge = regionSize > MAX_HAPLOTYPE_REGION_SIZE

  // Bug 1: Read lr_view and show_tree from URL params
  const location = useLocation()
  const history = useHistory()
  const searchParams = new URLSearchParams(location.search)
  const urlViewMode = searchParams.get('lr_view')

  // If region is too large and URL requests haplotype, show warning and fall back
  const [showRegionWarning, setShowRegionWarning] = useState(
    regionTooLarge && urlViewMode === 'haplotype'
  )
  const viewMode = (
    !regionTooLarge && urlViewMode === 'haplotype' ? 'haplotype' : 'summary'
  ) as 'summary' | 'haplotype'

  const setViewMode = useCallback((mode: string) => {
    const params = new URLSearchParams(location.search)
    params.set('lr_view', mode)
    if (mode === 'summary') {
      params.delete('show_tree')
    }
    history.replace({ ...location, search: params.toString() })
  }, [history, location])

  const showGenealogyFromUrl = searchParams.get('show_tree') === 'true'
  const setShowGenealogyUrl = useCallback((show: boolean) => {
    const params = new URLSearchParams(location.search)
    if (show) {
      params.set('show_tree', 'true')
    } else {
      params.delete('show_tree')
    }
    history.replace({ ...location, search: params.toString() })
  }, [history, location])

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
  const showGenealogy = showGenealogyFromUrl

  const [mqtlData, setMqtlData] = useState<any[]>([])
  const [mqtlLoading, setMqtlLoading] = useState(false)
  const [showMqtl, setShowMqtl] = useState(false)
  const [mqtlMinLogP, setMqtlMinLogP] = useState(0)

  const [hoveredVariantPosition, setHoveredVariantPosition] = useState<number | null>(null)

  // Cluster state
  const [clusterThreshold, setClusterThreshold] = useState(() => getAutoClusterThreshold(regionSize))
  const [isClusteredView, setIsClusteredView] = useState(() => getAutoClusterThreshold(regionSize) > 0)
  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<string>>(new Set())

  // Clear expanded clusters when threshold/region changes
  const prevClusterKey = useRef(`${clusterThreshold}-${threshold}-${start}-${stop}`)
  useEffect(() => {
    const key = `${clusterThreshold}-${threshold}-${start}-${stop}`
    if (key !== prevClusterKey.current) {
      prevClusterKey.current = key
      setExpandedClusterIds(new Set())
    }
  }, [clusterThreshold, threshold, start, stop])

  const toggleClusterExpansion = useCallback((clusterId: string) => {
    setExpandedClusterIds(prev => {
      const next = new Set(prev)
      if (next.has(clusterId)) {
        next.delete(clusterId)
      } else {
        next.add(clusterId)
      }
      return next
    })
  }, [])

  // Scroll sync refs and lock
  const trackRef = useRef<HaplotypeTrackHandle>(null)
  const tableRef = useRef<HaplotypeVariantTableHandle>(null)
  const isSyncing = useRef<'track' | 'table' | null>(null)
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSyncLock = useCallback(() => {
    if (syncTimeout.current) clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => {
      isSyncing.current = null
    }, 200)
  }, [])

  const handleVisibleGroupChange = useCallback((group: any) => {
    if (isSyncing.current === 'table') return
    isSyncing.current = 'track'
    const firstVariantPos = group.variants?.variants?.[0]?.position
    if (firstVariantPos != null && tableRef.current) {
      tableRef.current.scrollToPosition(firstVariantPos)
    }
    clearSyncLock()
  }, [clearSyncLock])

  const handleVisibleVariantChange = useCallback((pos: number) => {
    if (isSyncing.current === 'track') return
    isSyncing.current = 'table'
    if (trackRef.current) {
      trackRef.current.scrollToPosition(pos)
    }
    clearSyncLock()
  }, [clearSyncLock])

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

  // Debounced haplotype group fetch — supports both GraphQL and REST paths
  const isRest = useRestApi()
  const debouncedFetchHaplotypeGroups = useCallback(
    debounce(async (currentThreshold: number) => {
      setHaplotypeLoading(true)
      const t0 = performance.now()
      try {
        if (isRest) {
          const result = await fetchHaplotypeGroupsREST(chrom, start, stop, currentThreshold, sortBy, isClusteredView ? clusterThreshold : undefined)
          if (result.error) {
            console.error('REST error fetching haplotype groups:', result.error)
          } else {
            console.log(`[REST] haplotype groups: ${result.groups?.length} groups in ${Math.round(performance.now() - t0)}ms (server: ${result._timing?.total_ms}ms)`)
            setHaplotypeGroups(hydrateGroups(result))
          }
        } else {
          console.time('[perf] GraphQL fetch + JSON parse')
          const result = await fetchGraphQL(HAPLOTYPE_GROUPS_QUERY, {
            chrom,
            start: start,
            stop: stop,
            min_allele_freq: currentThreshold,
            sort_by: sortBy,
            cluster_threshold: isClusteredView ? clusterThreshold : undefined,
          })
          console.timeEnd('[perf] GraphQL fetch + JSON parse')
          if (result.errors) {
            console.error('GraphQL errors fetching haplotype groups:', result.errors)
          }
          if (result.data?.haplotype_groups) {
            const hydrated = hydrateGroups(result.data.haplotype_groups)
            console.log(`[GraphQL] haplotype groups: ${hydrated.groups?.length} groups in ${Math.round(performance.now() - t0)}ms`)
            setHaplotypeGroups(hydrated)
          }
        }
      } catch (error) {
        console.error('Error fetching haplotype groups:', error)
      } finally {
        setHaplotypeLoading(false)
      }
    }, 300),
    [chrom, start, stop, sortBy, isRest, isClusteredView, clusterThreshold]
  )

  // Fetch haplotype groups when in haplotype mode
  useEffect(() => {
    if (viewMode !== 'haplotype') return
    debouncedFetchHaplotypeGroups(threshold)
  }, [viewMode, chrom, start, stop, threshold, debouncedFetchHaplotypeGroups, sortBy, isClusteredView, clusterThreshold])

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

  const withFrequency = (variant: any) => variant.freq !== null

  const displayVariants = useMemo(
    () => variants.filter(withFrequency),
    [variants]
  )

  // LOD visibility — determines what to show based on region size
  const lod = useMemo(() => {
    const regionSize = zoomRegion
      ? zoomRegion.stop - zoomRegion.start
      : stop - start
    return getLodVisibility(regionSize)
  }, [zoomRegion, start, stop])

  // Client-side zoom filtering — does NOT trigger refetches
  const zoomedVariants = useMemo(
    () => filterVariantsInZoomRegion(displayVariants, zoomRegion),
    [displayVariants, zoomRegion]
  )

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
      {showRegionWarning && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowRegionWarning(false)}
        >
          <div
            style={{
              background: 'white', borderRadius: 8, padding: '24px 32px',
              maxWidth: 460, boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px' }}>Region too large for haplotype view</h3>
            <p style={{ margin: '0 0 16px', color: '#555', fontSize: 14, lineHeight: 1.5 }}>
              The haplotype view is limited to regions under {(MAX_HAPLOTYPE_REGION_SIZE / 1000).toFixed(0)} kb
              for performance reasons. The current region is {(regionSize / 1000).toFixed(1)} kb.
              Use the zoom controls to narrow the region, then click &ldquo;Set as region&rdquo; to
              commit a smaller region.
            </p>
            <button
              onClick={() => setShowRegionWarning(false)}
              style={{
                padding: '6px 20px', background: '#1976d2', color: 'white',
                border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <TrackPageSection>
        <ToggleWrapper>
          <SegmentedControl
            id="lr-view-mode"
            options={[
              { label: 'Summary', value: 'summary' },
              { label: 'Haplotype', value: 'haplotype', disabled: regionTooLarge },
            ]}
            value={viewMode}
            onChange={(value: string) => {
              if (value === 'haplotype' && regionTooLarge) return
              setViewMode(value as 'summary' | 'haplotype')
            }}
          />
          {regionTooLarge && (
            <span style={{ fontSize: 12, color: '#999' }}>
              Haplotype view requires region &le; {(MAX_HAPLOTYPE_REGION_SIZE / 1000).toFixed(0)} kb
            </span>
          )}
        </ToggleWrapper>

        {viewMode === 'haplotype' && (
          <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px 0' }}>
            Viewing phased haplotypes for a subset of 292 samples.
          </p>
        )}
      </TrackPageSection>

      {viewMode === 'summary' && (
        <>
          {lod.showDensityTrack && <VariantDensityTrack variants={displayVariants} />}
          <LongReadVariantTrack variants={displayVariants} />
          <PositionAxisTrack />
        </>
      )}

      {viewMode === 'haplotype' && (
        <>
          {lod.showDensityTrack && <VariantDensityTrack variants={displayVariants} />}
          <RecombinationRatePlot chrom={chrom} start={start} stop={stop} />
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
              ref={trackRef}
              haplotypeGroups={haplotypeGroups.groups}
              clusters={haplotypeGroups.clusters}
              methylationData={methylationData}
              methylationSummary={methylationSummary}
              sampleMetadata={sampleMetadata}
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
              onShowGenealogyChange={setShowGenealogyUrl}
              hoveredVariantPosition={hoveredVariantPosition}
              onVisibleGroupChange={handleVisibleGroupChange}
              isClusteredView={isClusteredView}
              onIsClusteredViewChange={setIsClusteredView}
              clusterThreshold={clusterThreshold}
              onClusterThresholdChange={setClusterThreshold}
              expandedClusterIds={expandedClusterIds}
              toggleClusterExpansion={toggleClusterExpansion}
              treeJson={haplotypeGroups.tree_json}
            />
          )}
          <PositionAxisTrack />
        </>
      )}

      {onChangeZoomRegion && (
        <TrackPageSection>
          <ZoomOverview
            overviewRegion={{ start, stop }}
            currentRegion={zoomRegion || { start, stop }}
            chrom={chrom}
            genes={genes}
            variants={displayVariants}
            onChangeRegion={onChangeZoomRegion}
            onSetRegion={onSetRegion}
          />
        </TrackPageSection>
      )}

      {viewMode === 'summary' ? (
        <TrackPageSection>
          <HaplotypeVariantTable
            mode="summary"
            summaryVariants={zoomedVariants}
            onHoverVariant={setHoveredVariantPosition}
          />
        </TrackPageSection>
      ) : (
        <TrackPageSection>
          {haplotypeGroups && (
            <HaplotypeVariantTable
              ref={tableRef}
              mode="haplotype"
              haplotypeGroups={haplotypeGroups}
              sampleMetadata={sampleMetadata}
              onHoverVariant={setHoveredVariantPosition}
              onVisibleVariantChange={handleVisibleVariantChange}
            />
          )}
        </TrackPageSection>
      )}
    </>
  )
}

export default LongReadUnifiedView
