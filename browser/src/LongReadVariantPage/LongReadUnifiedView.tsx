import { debounce, throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import { SegmentedControl } from '@gnomad/ui'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import Cursor from '../RegionViewerCursor'
import { TrackPageSection } from '../TrackPage'

import HaplotypeTrack, { HaplotypeGroup, HaplotypeGroups, HaplotypeCluster, HaplotypeTrackHandle, Methylation, MethylationSummaryPoint, LRVariant, Legend } from '../Haplotypes'
import {
  computeHaplotypeView,
  filterDisplayVariants,
  rehydrateVariants,
  getAutoClusterThreshold,
  type RawPayload,
  type ComputedHaplotypeData,
  type AutoDefaults,
} from '../Haplotypes/haplotypeCompute'
import HaplotypeVariantTable, { HaplotypeVariantTableHandle, type VariantTypeFilters } from '../Haplotypes/HaplotypeVariantTable'
import RecombinationRatePlot from '../Haplotypes/RecombinationRate'
import MQTLTrack from '../Haplotypes/MQTLTrack'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import LongReadVariantTrack from './LongReadVariantTrack'
import VariantDensityTrack from './VariantDensityTrack'
import { getLodVisibility } from './variantUtils'
import Variants from '../VariantList/Variants'
import ZoomOverview from '../Haplotypes/ZoomOverview'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { AccordionCoordinateMapper } from '../Haplotypes/AccordionCoordinateMapper'
import AccordionRegionViewer from '../Haplotypes/AccordionRegionViewer'
import { AccordionPositionAxisTrack } from '../Haplotypes/AccordionPositionAxis'

// --- GraphQL queries (ported from HaplotypeRegionPage) ---

const SAMPLE_METADATA_QUERY = `
  query RegionSampleMetadata {
    sample_metadata { sample_id subpopulation superpopulation }
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

/** Fetch raw variant + carrier data from the REST endpoint (no grouping/tree on server) */
const fetchHaplotypeDataREST = async (
  chrom: string, start: number, stop: number,
  signal?: AbortSignal
): Promise<RawPayload> => {
  const params = new URLSearchParams({
    chrom, start: String(start), stop: String(stop),
  })
  const t0 = performance.now()
  const response = await fetch(`/api/lr/haplotype-groups?${params}`, { signal })
  const tNetwork = Math.round(performance.now() - t0)
  const t1 = performance.now()
  const text = await response.text()
  const tDownload = Math.round(performance.now() - t1)
  const t2 = performance.now()
  const data = JSON.parse(text)
  const tParse = Math.round(performance.now() - t2)
  const sizeMB = (text.length / 1024 / 1024).toFixed(2)
  console.log(`[perf] REST fetch: network=${tNetwork}ms, download=${tDownload}ms, JSON.parse=${tParse}ms, size=${sizeMB}MB`)
  return data
}

// --- Styled components ---

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 0 8px;
`

const SearchInline = styled.div`
  position: relative;
  flex: 0 1 320px;
  min-width: 180px;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 6px 10px 6px 30px;
  font-size: 13px;
  border: 1px solid #aaa;
  border-radius: 4px;
  background: #fff;
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

  // Read show_haplotypes and show_tree from URL params
  const location = useLocation()
  const history = useHistory()
  const searchParams = new URLSearchParams(location.search)
  const urlShowHaplotypes = searchParams.get('show_haplotypes') === 'true'

  // If region is too large and URL requests haplotype, show warning and fall back
  const [showRegionWarning, setShowRegionWarning] = useState(
    regionTooLarge && urlShowHaplotypes
  )
  const showHaplotypes = !regionTooLarge && urlShowHaplotypes

  const setShowHaplotypes = useCallback((show: boolean) => {
    const params = new URLSearchParams(location.search)
    if (show) {
      params.set('show_haplotypes', 'true')
    } else {
      params.delete('show_haplotypes')
      params.delete('show_tree')
    }
    history.replace({ ...location, search: params.toString() })
  }, [history, location])

  const setShowGenealogyUrl = useCallback((show: boolean) => {
    const params = new URLSearchParams(location.search)
    if (show) {
      params.delete('show_tree') // default is on, so remove param
    } else {
      params.set('show_tree', 'false')
    }
    history.replace({ ...location, search: params.toString() })
  }, [history, location])

  // Haplotype mode state — Web Worker computation with main-thread fallback
  const [haplotypeData, setHaplotypeData] = useState<ComputedHaplotypeData | null>(null)
  const [autoDefaults, setAutoDefaults] = useState<AutoDefaults>({ floor: 0, ceiling: 1, defaultAf: 0, defaultClusterThreshold: 0, isClusteredView: false })
  const workerRef = useRef<Worker | null>(null)
  const rawDataRef = useRef<{ variants: import('../Haplotypes/index').LRVariant[]; carrierIndices: Record<string, number[]>; trvAlts?: Record<string, Record<number, string>> } | null>(null)
  const [haplotypeLoading, setHaplotypeLoading] = useState(false)
  const [workerComputing, setWorkerComputing] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [sampleMetadata, setSampleMetadata] = useState<SampleMetadataMap>(new Map())

  const [methylationData, setMethylationData] = useState<Methylation[]>([])
  const [methylationSummary, setMethylationSummary] = useState<MethylationSummaryPoint[]>([])
  const [methylationOutliers, setMethylationOutliers] = useState<any>(null)
  const [methylationLoading, setMethylationLoading] = useState(false)
  const [methylationSampleCount, setMethylationSampleCount] = useState(0)
  const [methylationTotalSamples, setMethylationTotalSamples] = useState(0)

  const [threshold, setThreshold] = useState(0)
  const [sortBy, setSortBy] = useState('similarity_score')
  const [groupingMode, setGroupingMode] = useState<'similarity' | 'exact' | 'diploid'>('similarity')
  const [distanceMetric, setDistanceMetric] = useState<import('../Haplotypes/haplotypeCompute').DistanceMetric>(regionSize < 50_000 ? 'all' : 'sv_only')
  const [plotType, setPlotType] = useState('lollipop')
  const [colorMode, setColorMode] = useState('sv_type')

  const showGenealogy = searchParams.get('show_tree') !== 'false'

  const [mqtlData, setMqtlData] = useState<any[]>([])
  const [mqtlLoading, setMqtlLoading] = useState(false)
  const [showMqtl, setShowMqtl] = useState(false)
  const [mqtlMinLogP, setMqtlMinLogP] = useState(0)

  const [hoveredVariantPosition, setHoveredVariantPosition] = useState<number | null>(null)
  const [typeFilters, setTypeFilters] = useState<VariantTypeFilters>({
    snv: true, deletion: true, insertion: true, sv: true, tr: true,
  })
  const [showPhantomRegions, setShowPhantomRegions] = useState(true)
  const [showRecombination, setShowRecombination] = useState(false)
  const [showMethylation, setShowMethylation] = useState(false)
  const [filterToOutliers, setFilterToOutliers] = useState(true)
  const [showPopBackground, setShowPopBackground] = useState(true)
  const [isAutoTuned, setIsAutoTuned] = useState(true)
  const [searchText, setSearchText] = useState('')

  // Cluster state — two thresholds: visual (immediate) and deferred (debounced).
  // Visual drives the drag line + slider display; deferred drives the expensive recomputation.
  const [clusterThreshold, setClusterThreshold] = useState(() => getAutoClusterThreshold(regionSize))
  const [deferredClusterThreshold, setDeferredClusterThreshold] = useState(() => getAutoClusterThreshold(regionSize))
  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<string>>(new Set())

  const debouncedCommitThreshold = useMemo(
    () => debounce((value: number) => setDeferredClusterThreshold(value), 200, { leading: false, trailing: true }),
    []
  )
  const handleClusterThresholdChange = useCallback((value: number) => {
    setClusterThreshold(value)
    debouncedCommitThreshold(value)
  }, [debouncedCommitThreshold])

  // Wrappers that track manual user changes for the controls panel
  const handleManualAfChange = useCallback((value: number) => {
    setIsAutoTuned(false)
    setThreshold(value)
  }, [])

  const handleManualClusterThresholdChange = useCallback((value: number) => {
    setIsAutoTuned(false)
    handleClusterThresholdChange(value)
  }, [handleClusterThresholdChange])

  const handleGroupingModeChange = useCallback((mode: 'similarity' | 'exact' | 'diploid') => {
    setGroupingMode(mode)
    if (mode === 'diploid' && !['diplotype_frequency', 'roh_fraction', 'compound_het'].includes(sortBy)) {
      setSortBy('diplotype_frequency')
    } else if (mode !== 'diploid' && !['similarity_score', 'sample_count'].includes(sortBy)) {
      setSortBy('similarity_score')
    }
  }, [sortBy])

  // Clear expanded clusters when threshold/region changes
  const prevClusterKey = useRef(`${deferredClusterThreshold}-${threshold}-${start}-${stop}`)
  useEffect(() => {
    const key = `${deferredClusterThreshold}-${threshold}-${start}-${stop}`
    if (key !== prevClusterKey.current) {
      prevClusterKey.current = key
      setExpandedClusterIds(new Set())
    }
  }, [deferredClusterThreshold, threshold, start, stop])

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

  // Bidirectional linking state
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null)
  const [highlightedVariantIds, setHighlightedVariantIds] = useState<Set<string> | null>(null)
  const [selectedVariantPos, setSelectedVariantPos] = useState<number | null>(null)

  const handleVariantClickInTrack = useCallback((pos: number) => {
    // Scroll table to variant and bring it into view
    tableRef.current?.scrollToPosition(pos)
    document.getElementById('lr-variant-table-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const handleClusterSelect = useCallback((clusterId: string) => {
    setSelectedClusterId(prev => prev === clusterId ? null : clusterId)
  }, [])

  const handleClearClusterFilter = useCallback(() => {
    setSelectedClusterId(null)
  }, [])

  const handleRowClick = useCallback((pos: number) => {
    setSelectedVariantPos(pos)
    setHoveredVariantPosition(pos)
  }, [])

  const handleFilteredVariantsChange = useCallback((variantIds: Set<string>) => {
    setHighlightedVariantIds(variantIds.size > 0 ? variantIds : null)
  }, [])

  // Clear cluster filter when threshold changes
  const prevClusterThresholdRef = useRef(deferredClusterThreshold)
  if (deferredClusterThreshold !== prevClusterThresholdRef.current) {
    prevClusterThresholdRef.current = deferredClusterThreshold
    setSelectedClusterId(null)
  }

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
    if (!showHaplotypes) return
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
  }, [showHaplotypes, sampleMetadata.size])

  // Initialize Web Worker (with main-thread fallback)
  useEffect(() => {
    try {
      const w = new Worker(new URL('../Haplotypes/haplotypeWorker.ts', import.meta.url))
      let workerStartTime = 0
      w.onmessage = (e: MessageEvent) => {
        const elapsed = workerStartTime ? Date.now() - workerStartTime : 0
        if (e.data.type === 'PROGRESS') {
          setLoadingStatus(e.data.status)
        } else if (e.data.type === 'READY') {
          console.log(`[perf] worker READY in ${elapsed}ms, groups=${e.data.data?.groups?.length || 0}`)
          setLoadingStatus('')
          setHaplotypeData(e.data.data)
          setWorkerComputing(false)
        } else if (e.data.type === 'UPDATED') {
          console.log(`[perf] worker UPDATED in ${elapsed}ms, groups=${e.data.data?.groups?.length || 0}`)
          setLoadingStatus('')
          setHaplotypeData(e.data.data)
          setWorkerComputing(false)
        }
      }
      // Expose start time setter for postMessage callers
      const origPostMessage = w.postMessage.bind(w)
      w.postMessage = (msg: any, ...args: any[]) => {
        workerStartTime = Date.now()
        return origPostMessage(msg, ...args)
      }
      w.onerror = () => {
        console.warn('[worker] haplotype worker failed, using main thread')
        w.terminate()
        workerRef.current = null
      }
      workerRef.current = w
      console.log('[worker] haplotype worker initialized')
    } catch {
      console.warn('[worker] haplotype worker unavailable, using main thread')
    }
    return () => { workerRef.current?.terminate() }
  }, [])

  // Fetch raw haplotype data once per region
  const abortControllerRef = useRef<AbortController | null>(null)
  useEffect(() => {
    if (!showHaplotypes) return

    if (abortControllerRef.current) abortControllerRef.current.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setHaplotypeLoading(true)
    setLoadingStatus('Fetching variant data…')
    const t0 = performance.now()

    fetchHaplotypeDataREST(chrom, start, stop, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const variantCount = result.variants?.variant_id?.length ?? 0
        const carrierCount = Object.keys(result.carrier_variant_indices || {}).length
        const fetchTime = Math.round(performance.now() - t0)
        console.log(`[REST] raw payload: ${variantCount} variants, ${carrierCount} carriers in ${fetchTime}ms (server: ${result._timing?.total_ms}ms)`)
        setLoadingStatus(`Received ${variantCount.toLocaleString()} variants, ${carrierCount} samples`)

        // Use server-computed auto_defaults
        const defaults = result.auto_defaults || { floor: 0, ceiling: 1, defaultAf: 0, defaultClusterThreshold: 0, isClusteredView: false }
        setAutoDefaults(defaults)
        setThreshold(defaults.defaultAf)
        setClusterThreshold(defaults.defaultClusterThreshold)
        setDeferredClusterThreshold(defaults.defaultClusterThreshold)
        if (defaults.isClusteredView) {
          setGroupingMode('similarity')
        }

        setHaplotypeLoading(false)
        if (workerRef.current) {
          setWorkerComputing(true)
          setLoadingStatus(`Grouping ${variantCount.toLocaleString()} variants into haplotypes…`)
          workerRef.current.postMessage({ type: 'INIT', rawData: result, sortBy, distanceMetric, regionSize })
        } else {
          // Main-thread fallback: rehydrate SoA variants and compute directly
          const variants: import('../Haplotypes/index').LRVariant[] = result.variants?.variant_id
            ? rehydrateVariants(result.variants as any)
            : (result.variants as any) || []
          const carrierIndices = result.carrier_variant_indices || {}
          rawDataRef.current = { variants, carrierIndices, trvAlts: result.trv_alts }
          const baseData = computeHaplotypeView(
            variants, carrierIndices,
            defaults.defaultAf, sortBy, defaults.isClusteredView, defaults.defaultClusterThreshold,
            result.trv_alts, false, distanceMetric, regionSize
          )
          setHaplotypeData(baseData)
          setHaplotypeLoading(false)
        }
      })
      .catch((error: any) => {
        if (error?.name === 'AbortError') return
        console.error('Error fetching haplotype data:', error)
        setHaplotypeLoading(false)
      })
  }, [showHaplotypes, chrom, start, stop])

  // Derive booleans from groupingMode for worker/compute compatibility
  const isClusteredView = groupingMode === 'similarity'
  const isDiploidView = groupingMode === 'diploid'

  // Recompute when AF/sort/clustering/diploid changes
  const hasData = haplotypeData !== null
  useEffect(() => {
    if (!hasData) return
    if (workerRef.current) {
      setWorkerComputing(true)
      workerRef.current.postMessage({
        type: 'UPDATE_AF',
        minAf: threshold,
        isClusteredView,
        clusterThreshold: deferredClusterThreshold,
        sortBy,
        isDiploidView,
        distanceMetric,
      })
    } else if (rawDataRef.current) {
      const { variants, carrierIndices, trvAlts } = rawDataRef.current
      let result: ComputedHaplotypeData
      if (isDiploidView) {
        result = computeHaplotypeView(variants, carrierIndices, threshold, sortBy, false, deferredClusterThreshold, trvAlts, true, 'auto', regionSize)
      } else if (isClusteredView) {
        const baseData = computeHaplotypeView(variants, carrierIndices, autoDefaults.floor, sortBy, true, deferredClusterThreshold, trvAlts, false, distanceMetric, regionSize)
        result = threshold > autoDefaults.floor ? filterDisplayVariants(baseData, threshold) : baseData
      } else {
        result = computeHaplotypeView(variants, carrierIndices, threshold, sortBy, false, deferredClusterThreshold, trvAlts, false, distanceMetric, regionSize)
      }
      setHaplotypeData(result)
    }
  }, [threshold, sortBy, isClusteredView, deferredClusterThreshold, isDiploidView, distanceMetric, hasData])

  const haplotypeGroups: HaplotypeGroups = (haplotypeData as HaplotypeGroups | null) || { groups: [] }

  // Fetch methylation summary + outliers when entering haplotype mode
  // Skip for large regions (>200kb) — methylation data is huge and blocks the main thread.
  // Users can still enable methylation via the checkbox, which triggers the load-all-samples path.
  useEffect(() => {
    if (!showHaplotypes) return
    if (regionSize > 200_000) return

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
  }, [showHaplotypes, chrom, start, stop])

  // Auto-fetch per-sample methylation for top outlier samples
  const MAX_AUTO_FETCH_OUTLIERS = 10
  useEffect(() => {
    if (!showHaplotypes) return
    if (regionSize > 200_000) return

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
  }, [showHaplotypes, chrom, start, stop, methylationOutliers])

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
    if (!showHaplotypes || !showMqtl) return
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
  }, [showHaplotypes, chrom, start, stop, threshold, showMqtl])

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

  // Unfiltered zoom variants for accordion mapper (not AF-filtered)
  const unfilteredZoomedVariants: LRVariant[] = useMemo(
    () => filterVariantsInZoomRegion(variants, zoomRegion),
    [variants, zoomRegion]
  )

  // Accordion coordinate mapper — creates phantom gaps at insertion/TR loci
  const accordionViewRegion = useMemo(
    () => zoomRegion || { start, stop },
    [zoomRegion, start, stop]
  )
  const accordionMapper = useMemo(
    () => new AccordionCoordinateMapper(accordionViewRegion, unfilteredZoomedVariants, showPhantomRegions),
    [accordionViewRegion, unfilteredZoomedVariants, showPhantomRegions]
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

      <AccordionRegionViewer mapper={accordionMapper} originalRegion={accordionViewRegion}>

      {/* Base layer — always rendered */}
      {lod.showDensityTrack && <VariantDensityTrack variants={zoomedVariants} />}
      <LongReadVariantTrack variants={zoomedVariants} lod={showHaplotypes ? lod : undefined} showGenealogy={showHaplotypes && showGenealogy} isDiploidView={isDiploidView} hoveredVariantPosition={hoveredVariantPosition} onHoverVariantPosition={setHoveredVariantPosition} typeFilters={typeFilters} />

      {/* Haplotype layer — opt-in */}
      {showHaplotypes && (
        <>
          {showRecombination && <RecombinationRatePlot chrom={chrom} start={start} stop={stop} />}
          {/* TODO: Re-enable when mQTL data source is production-ready */}
          {false && showMqtl && (
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
              haplotypeGroups={haplotypeGroups.groups as HaplotypeGroup[]}
              clusters={haplotypeGroups.clusters}
              methylationData={methylationData}
              methylationSummary={methylationSummary}
              sampleMetadata={sampleMetadata}
              start={start}
              stop={stop}
              initialMinAf={threshold}
              initialSortBy={sortBy}
              onLoadAllSamples={handleLoadAllSamples}
              methylationLoading={methylationLoading}
              methylationSampleCount={methylationSampleCount}
              methylationTotalSamples={methylationTotalSamples}
              haplotypeLoading={haplotypeLoading}
              workerComputing={workerComputing}
              loadingStatus={loadingStatus}
              showMqtl={false}
              mqtlLoading={mqtlLoading}
              mqtlData={mqtlData}
              mqtlMinLogP={mqtlMinLogP}
              plotType={plotType}
              initialColorMode={colorMode}
              showGenealogy={showGenealogy}
              hoveredVariantPosition={hoveredVariantPosition}
              onVisibleGroupChange={handleVisibleGroupChange}
              groupingMode={groupingMode}
              clusterThreshold={clusterThreshold}
              onClusterThresholdChange={handleClusterThresholdChange}
              expandedClusterIds={expandedClusterIds}
              toggleClusterExpansion={toggleClusterExpansion}
              treeJson={haplotypeGroups.tree_json}
              minAfFloor={autoDefaults.floor}
              minAfCeiling={autoDefaults.ceiling}
              distanceMetric={distanceMetric}
              regionSize={regionSize}
              showPhantomRegions={showPhantomRegions}
              onVariantClick={handleVariantClickInTrack}
              onClusterSelect={handleClusterSelect}
              selectedClusterId={selectedClusterId}
              highlightedVariantIds={highlightedVariantIds}
              selectedVariantPos={selectedVariantPos}
              showMethylation={showMethylation}
              filterToOutliers={filterToOutliers}
              showPopBackground={showPopBackground}
              isAutoTuned={isAutoTuned}
              typeFilters={typeFilters}
            />
          )}
        </>
      )}

      {/* Axis — accordion when haplotypes active, standard otherwise */}
      {showHaplotypes ? <AccordionPositionAxisTrack /> : <PositionAxisTrack />}

      {/* Zoom overview — below position axis, still inside AccordionRegionViewer */}
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
            onNavigateRegion={onSetRegion ? (region) => onSetRegion({ start: region.start, stop: region.stop }) : undefined}
          />
        </TrackPageSection>
      )}

      </AccordionRegionViewer>

      {/* Top bar: view mode toggle + search */}
      <TrackPageSection>
        <TopBar>
          <SegmentedControl
            id="lr-view-mode"
            options={[
              { label: 'Summary View', value: 'summary' },
              { label: 'Haplotype View', value: 'haplotype', disabled: regionTooLarge },
            ]}
            value={showHaplotypes ? 'haplotype' : 'summary'}
            onChange={(val: string) => setShowHaplotypes(val === 'haplotype')}
          />
          <HaplotypeHelpButton title="Long Read Data Views">
            <h4 style={{ margin: '0 0 8px' }}>Summary View</h4>
            <p>Shows aggregate variant-level statistics across the long-read callset. Each row in the table is a single variant with its allele frequency, type, consequence, and annotations. Use this view to browse what variants exist in the region, filter by type or consequence, and compare long-read frequencies with short-read data. This is the default view and works at any region size.</p>

            <h4 style={{ margin: '16px 0 8px' }}>Haplotype View</h4>
            <p>Shows phased haplotype data from 292 long-read sequenced samples. Where Summary View treats each variant independently, Haplotype View reveals how variants are physically linked on the same chromosome &mdash; which variants co-occur, which are mutually exclusive, and how haplotype diversity is structured across populations.</p>

            <h4 style={{ margin: '16px 0 8px', fontSize: '13px', color: '#555' }}>Reading the visualization</h4>
            <p>Each row in the lollipop track represents a haplotype group &mdash; a set of samples that share the same (or very similar) variant composition. Dots along a row mark the variants carried by that group. The colored bars on the left show the ancestry composition of each group&rsquo;s carriers. Groups are arranged by similarity clustering, so structurally related haplotypes appear near each other.</p>

            <h4 style={{ margin: '16px 0 8px', fontSize: '13px', color: '#555' }}>Key elements</h4>
            <ul style={{ margin: '0 0 0 20px', lineHeight: 1.8 }}>
              <li><strong>Lollipop dots</strong> &mdash; each dot is a variant on that haplotype. Shape encodes type (circle = SNV, triangle = insertion, dashed line = deletion, diamond = SV, rectangle = tandem repeat). Color is configurable (variant type, allele fingerprint, frequency, etc.).</li>
              <li><strong>Ancestry bars</strong> &mdash; the colored sidebar shows the superpopulation breakdown (AFR, AMR, EAS, EUR, SAS) of samples carrying each haplotype group.</li>
              <li><strong>Clustering &amp; genealogy tree</strong> &mdash; similarity clustering groups haplotypes by shared variant structure. The optional genealogy tree shows hierarchical relationships between clusters. Adjusting the resolution slider controls how finely clusters are split.</li>
              <li><strong>Accordion regions</strong> &mdash; insertions and tandem repeats can be expanded into &ldquo;phantom&rdquo; coordinate space so their internal structure is visible rather than collapsed to a single point.</li>
            </ul>

            <h4 style={{ margin: '16px 0 8px', fontSize: '13px', color: '#555' }}>How the views complement each other</h4>
            <p>Summary View answers &ldquo;what variants are here and how common are they?&rdquo; Haplotype View answers &ldquo;how do these variants travel together, and which population-specific haplotype structures exist?&rdquo; Clicking a variant in the table scrolls the haplotype track to that position, and clicking a haplotype cluster filters the table to its variants &mdash; the two views are cross-linked.</p>

            <p style={{ marginTop: 12, color: '#666' }}>Haplotype view is limited to regions under {(MAX_HAPLOTYPE_REGION_SIZE / 1000).toFixed(0)} kb for performance. Use the zoom controls to narrow the region if needed.</p>
          </HaplotypeHelpButton>
          <SearchInline>
            <svg
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14 }}
              viewBox="0 0 24 24"
              fill="#888"
            >
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <SearchInput
              type="text"
              placeholder="Search position, rsID, allele…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </SearchInline>
        </TopBar>
        {regionTooLarge && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#999', marginBottom: 8 }}>
            Haplotype view disabled: region too large (&gt; {(MAX_HAPLOTYPE_REGION_SIZE / 1000).toFixed(0)} kb)
          </div>
        )}
      </TrackPageSection>

      {/* Controls panel — only visible in Haplotype View */}
      {showHaplotypes && (
        <TrackPageSection>
          <Legend
            initialMinAf={threshold}
            onMinAfChange={handleManualAfChange}
            colorMode={colorMode}
            onColorModeChange={setColorMode}
            initialSortBy={sortBy}
            onSortModeChange={setSortBy}
            showMethylation={showMethylation}
            onShowMethylationChange={setShowMethylation}
            filterToOutliers={filterToOutliers}
            onFilterToOutliersChange={setFilterToOutliers}
            onLoadAllSamples={handleLoadAllSamples}
            methylationLoading={methylationLoading}
            methylationSampleCount={methylationSampleCount}
            methylationTotalSamples={methylationTotalSamples}
            plotType={plotType}
            onPlotTypeChange={setPlotType}
            showGenealogy={showGenealogy}
            onShowGenealogyChange={setShowGenealogyUrl}
            groupingMode={groupingMode}
            onGroupingModeChange={handleGroupingModeChange}
            clusterThreshold={clusterThreshold}
            onClusterThresholdChange={handleManualClusterThresholdChange}
            clusterCount={haplotypeGroups?.clusters?.length || 0}
            minAfFloor={autoDefaults.floor}
            minAfCeiling={autoDefaults.ceiling}
            distanceMetric={distanceMetric}
            onDistanceMetricChange={setDistanceMetric}
            regionSize={regionSize}
            showPhantomRegions={showPhantomRegions}
            onShowPhantomRegionsChange={setShowPhantomRegions}
            showPopBackground={showPopBackground}
            onShowPopBackgroundChange={setShowPopBackground}
            showRecombination={showRecombination}
            onShowRecombinationChange={setShowRecombination}
          />
        </TrackPageSection>
      )}

      {/* Table with loading overlay during haplotype computation */}
      <TrackPageSection>
        <div
          id="lr-variant-table-container"
          style={{
            opacity: (showHaplotypes && (haplotypeLoading || workerComputing)) ? 0.5 : 1,
            pointerEvents: (showHaplotypes && (haplotypeLoading || workerComputing)) ? 'none' : 'auto',
            transition: 'opacity 0.2s',
          }}
        >
          {showHaplotypes && haplotypeGroups?.groups.length > 0 ? (
            <>
              <HaplotypeVariantTable
                  ref={tableRef}
                  mode="haplotype"
                  summaryVariants={zoomedVariants}
                  haplotypeGroups={haplotypeGroups as { groups: HaplotypeGroup[]; clusters?: HaplotypeCluster[] }}
                  sampleMetadata={sampleMetadata}
                  onHoverVariant={setHoveredVariantPosition}
                  onVisibleVariantChange={handleVisibleVariantChange}
                  onFilteredVariantsChange={handleFilteredVariantsChange}
                  onRowClick={handleRowClick}
                  isClusteredView={isClusteredView}
                  selectedClusterId={selectedClusterId}
                  onClearClusterFilter={handleClearClusterFilter}
                  searchText={searchText}
                  typeFilters={typeFilters}
                  onTypeFiltersChange={setTypeFilters}
                />
            </>
          ) : (
            <HaplotypeVariantTable
              mode="summary"
              summaryVariants={zoomedVariants}
              onHoverVariant={setHoveredVariantPosition}
              searchText={searchText}
              typeFilters={typeFilters}
              onTypeFiltersChange={setTypeFilters}
            />
          )}
        </div>
      </TrackPageSection>
    </>
  )
}

export default LongReadUnifiedView



