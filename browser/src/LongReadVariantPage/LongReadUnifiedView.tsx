import { debounce, throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import { Select } from '@gnomad/ui'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import Cursor from '../RegionViewerCursor'
import { TrackPageSection } from '../TrackPage'

import HaplotypeTrack, { HaplotypeGroup, HaplotypeGroups, HaplotypeCluster, HaplotypeTrackHandle, Methylation, MethylationSummaryPoint, LRVariant, Legend } from '../Haplotypes'
import type {
  MethylationSampleAvailability,
  PhasedMethylationCapability,
} from '../Haplotypes/MethylationHelp'
import {
  carrierMetadataFromPayload,
  computeHaplotypeView,
  filterDisplayVariants,
  rehydrateVariants,
  getAutoClusterThreshold,
  normalizeHaplotypeWorkerData,
  type RawPayload,
  type ComputedHaplotypeData,
  type AutoDefaults,
  type CarrierMetadata,
} from '../Haplotypes/haplotypeCompute'
import HaplotypeVariantTable, { HaplotypeVariantTableHandle, type VariantTypeFilters } from '../Haplotypes/HaplotypeVariantTable'
import { createHaplotypeWorker } from '../Haplotypes/createHaplotypeWorker'
import RecombinationRatePlot from '../Haplotypes/RecombinationRate'
import HG00097PhasedMethylationComparison, {
  type SourcePhasedMethylationRecord,
} from '../Haplotypes/HG00097PhasedMethylationComparison'
import MQTLTrack from '../Haplotypes/MQTLTrack'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import LongReadViewControls from './LongReadViewControls'
import LongReadViewHelpButton from './LongReadViewHelpButton'
import LongReadVariantTrack from './LongReadVariantTrack'
import VariantDensityTrack from './VariantDensityTrack'
import LRUniqueDensityTrack from './LRUniqueDensityTrack'
import { getLodVisibility } from './variantUtils'
import { allLongReadVariantTypesSelected } from './longReadVariantTypes'
import { COLOR_MODES } from './variantColorUtils'
import Variants from '../VariantList/Variants'
import ZoomOverview from '../Haplotypes/ZoomOverview'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { AccordionCoordinateMapper } from '../Haplotypes/AccordionCoordinateMapper'
import AccordionRegionViewer from '../Haplotypes/AccordionRegionViewer'
import { AccordionPositionAxisTrack } from '../Haplotypes/AccordionPositionAxis'
import {
  LongReadY1Provenance,
  modalityAvailable,
  sourceForModality,
} from './LongReadProvenanceBanner'
import { nullableLongReadFrequency } from './longReadFrequency'
import {
  incompleteMethylationSampleIds,
  mergeMethylationRecords,
  methylationBatchFromGraphQL,
  methylationRequestScope,
  methylationSampleIdentity,
  responseForCurrentMethylationRequest,
  MethylationRequestGate,
} from './methylationState'

// --- GraphQL queries (ported from HaplotypeRegionPage) ---

const SAMPLE_METADATA_QUERY = `
  query RegionSampleMetadata($lr_cohort: LongReadCohort!) {
    sample_metadata(lr_cohort: $lr_cohort) { sample_id subpopulation superpopulation }
  }
`

const METHYLATION_AVAILABILITY_QUERY = `
  query RegionMethylationAvailability($lr_cohort: LongReadCohort!) {
    methylation_sample_availability(lr_cohort: $lr_cohort) {
      sample_id available status reason
    }
  }
`

const PHASED_METHYLATION_CAPABILITY_QUERY = `
  query RegionPhasedMethylationCapability($lr_cohort: LongReadCohort!) {
    phased_methylation_capability(lr_cohort: $lr_cohort) {
      data_layer available joinable_to_vcf status orientation_status reason
    }
  }
`

const SOURCE_PHASED_METHYLATION_QUERY = `
  query RegionSourcePhasedMethylation($chrom: String!, $start: Int!, $stop: Int!, $lr_cohort: LongReadCohort!) {
    source_phased_methylation(chrom: $chrom, start: $start, stop: $stop, lr_cohort: $lr_cohort) {
      chr pos1 pos2 methylation sample coverage data_layer source_haplotype vcf_strand phase_set
    }
  }
`

const METHYLATION_SUMMARY_QUERY = `
  query RegionMethylationSummary($chrom: String!, $start: Int!, $stop: Int!, $lr_cohort: LongReadCohort!) {
    methylation_summary(chrom: $chrom, start: $start, stop: $stop, lr_cohort: $lr_cohort) {
      chrom pos1 pos2 mean_methylation mean_coverage num_samples std_methylation min_methylation max_methylation
    }
  }
`

const METHYLATION_OUTLIERS_QUERY = `
  query RegionMethylationOutliers($chrom: String!, $start: Int!, $stop: Int!, $lr_cohort: LongReadCohort!) {
    methylation_outliers(chrom: $chrom, start: $start, stop: $stop, lr_cohort: $lr_cohort) {
      total_cpg_sites total_samples
      samples { sample_id outlier_count outlier_fraction direction }
    }
  }
`

const METHYLATION_QUERY = `
  query RegionMethylation($chrom: String!, $start: Int!, $stop: Int!, $samples: [String!], $lr_cohort: LongReadCohort!) {
    methylation(chrom: $chrom, start: $start, stop: $stop, samples: $samples, lr_cohort: $lr_cohort) {
      chr pos1 pos2 methylation sample coverage data_layer source_haplotype vcf_strand phase_set
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
  lrCohort: 'hgsvc_hprc' | 'aou',
  signal?: AbortSignal
): Promise<RawPayload> => {
  const params = new URLSearchParams({
    chrom, start: String(start), stop: String(stop), lr_cohort: lrCohort,
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

const ViewModeControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
  lrCohort?: 'hgsvc_hprc' | 'aou'
  onChangeLrCohort?: (cohort: 'hgsvc_hprc' | 'aou') => void
  provenance?: LongReadY1Provenance | null
  clinvarReleaseDate?: string
  genes?: ZoomGene[]
  zoomRegion?: { start: number; stop: number } | null
  onChangeZoomRegion?: (region: { start: number; stop: number } | null) => void
  onSetRegion?: (region: { start: number; stop: number }) => void
  onGenealogyPanelVisibilityChange?: (visible: boolean) => void
}

const fetchGraphQL = async (query: string, variables: any, signal?: AbortSignal) => {
  const response = await fetch('/api/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  })
  const queryName = query.match(/query\s+(\w+)/)?.[1] || 'unknown'
  console.time(`[perf] JSON parse (${queryName})`)
  const text = await response.text()
  console.log(`[perf] response size (${queryName}): ${(text.length / 1024 / 1024).toFixed(2)} MB`)
  const parsed = JSON.parse(text)
  console.timeEnd(`[perf] JSON parse (${queryName})`)
  return parsed
}


const MAX_HAPLOTYPE_REGION_SIZE = process.env.LR_Y1_ENABLED === 'true' ? 100_000 : 5_000_000

type MethylationViewState = {
  scope: string | null
  rowsByIdentity: Map<string, Methylation>
  summary: MethylationSummaryPoint[]
  outliers: any
  loading: boolean
  sampleCount: number
  totalSamples: number
  detailOperationId: number | null
}

type MethylationDetailOperation = {
  kind: 'auto' | 'load-all'
  token: ReturnType<MethylationRequestGate['begin']>
  requestableSampleIds: readonly string[]
  inFlightIdentities: Set<string>
}

const emptyMethylationViewState = (scope: string | null = null): MethylationViewState => ({
  scope,
  rowsByIdentity: new Map(),
  summary: [],
  outliers: null,
  loading: false,
  sampleCount: 0,
  totalSamples: 0,
  detailOperationId: null,
})

const LongReadUnifiedView = ({
  datasetId,
  gene,
  variants,
  lrCohort = 'hgsvc_hprc',
  onChangeLrCohort,
  provenance = null,
  clinvarReleaseDate,
  genes = [],
  zoomRegion = null,
  onChangeZoomRegion,
  onSetRegion,
  onGenealogyPanelVisibilityChange,
}: LongReadUnifiedViewProps) => {
  const { chrom, start, stop } = gene
  const regionSize = stop - start
  const regionTooLarge = regionSize > MAX_HAPLOTYPE_REGION_SIZE

  // Read show_haplotypes and show_tree from URL params
  const location = useLocation()
  const history = useHistory()
  const searchParams = new URLSearchParams(location.search)
  const urlShowHaplotypes = searchParams.get('show_haplotypes') === 'true'
  const urlShowSourcePhasedMethylation =
    searchParams.get('show_source_phased_methylation') === 'true'

  // If region is too large and URL requests haplotype, show warning and fall back
  const [showRegionWarning, setShowRegionWarning] = useState(
    regionTooLarge && urlShowHaplotypes
  )
  const y1Mode = provenance?.enabled === true || process.env.LR_Y1_ENABLED === 'true'
  // Capabilities from the API are authoritative. The build flag only fails closed while
  // provenance is unavailable (for example during an API/frontend version transition).
  const capabilityKnown = (modality: string) => sourceForModality(provenance, modality) !== undefined
  const haplotypesAvailable = capabilityKnown('HAPLOTYPES')
    ? modalityAvailable(provenance, 'HAPLOTYPES')
    : !y1Mode && lrCohort !== 'aou'
  const metadataAvailable = capabilityKnown('SAMPLE_METADATA')
    ? modalityAvailable(provenance, 'SAMPLE_METADATA')
    : !y1Mode && lrCohort !== 'aou'
  const methylationAvailable = capabilityKnown('METHYLATION')
    ? modalityAvailable(provenance, 'METHYLATION')
    : !y1Mode && lrCohort !== 'aou'
  const recombinationAvailable = capabilityKnown('RECOMBINATION')
    ? modalityAvailable(provenance, 'RECOMBINATION')
    : !y1Mode
  const outOfScope = provenance?.enabled === true && provenance.sources.some(
    (source) => source.modality === 'PRIMARY_VARIANTS' && !source.available
  )
  const haplotypesUnavailable = lrCohort === 'aou' || outOfScope || !haplotypesAvailable
  const showHaplotypes = !regionTooLarge && !haplotypesUnavailable && urlShowHaplotypes

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

  const setShowSourcePhasedMethylationUrl = useCallback((show: boolean) => {
    const params = new URLSearchParams(location.search)
    if (show) params.set('show_source_phased_methylation', 'true')
    else params.delete('show_source_phased_methylation')
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
  const rawDataRef = useRef<{
    variants: import('../Haplotypes/index').LRVariant[]
    carrierIndices: Record<string, number[]>
    carrierMetadata: CarrierMetadata
    trvAlts?: Record<string, Record<number, string>>
  } | null>(null)
  const [haplotypeLoading, setHaplotypeLoading] = useState(false)
  const [workerComputing, setWorkerComputing] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [ambiguousUnphasedRows, setAmbiguousUnphasedRows] = useState(0)
  const [sampleMetadata, setSampleMetadata] = useState<SampleMetadataMap>(new Map())

  const [methylationViewState, setMethylationViewState] = useState<MethylationViewState>(
    emptyMethylationViewState
  )
  const requestedMethylationSampleIdentitiesRef = useRef<Set<string>>(new Set())
  const completedMethylationSampleIdentitiesRef = useRef<Set<string>>(new Set())
  const summaryMethylationRequestGateRef = useRef(new MethylationRequestGate())
  const detailMethylationRequestGateRef = useRef(new MethylationRequestGate())
  const activeMethylationDetailOperationRef = useRef<MethylationDetailOperation | null>(null)
  const loadAllClaimedMethylationScopeRef = useRef<string | null>(null)
  const [methylationAvailability, setMethylationAvailability] = useState<MethylationSampleAvailability[] | null>(null)
  const [phasedMethylationCapability, setPhasedMethylationCapability] = useState<PhasedMethylationCapability>({
    data_layer: 'SOURCE_PHASED',
    available: false,
    joinable_to_vcf: false,
    status: 'UNAVAILABLE_ORIENTATION_UNCONFIRMED',
    orientation_status: 'UNCONFIRMED',
    reason: 'Phased methylation orientation has not been confirmed',
  })
  const [sourcePhasedMethylation, setSourcePhasedMethylation] = useState<SourcePhasedMethylationRecord[]>([])
  const [sourcePhasedMethylationLoading, setSourcePhasedMethylationLoading] = useState(false)
  const [sourcePhasedMethylationError, setSourcePhasedMethylationError] = useState<string | null>(null)
  const sourcePhasedEvaluationInScope = lrCohort === 'hgsvc_hprc' &&
    (chrom === 'chr22' || chrom === '22') && start >= 47_040_000 && stop <= 47_050_000
  const showSourcePhasedMethylation = showHaplotypes &&
    phasedMethylationCapability.available && sourcePhasedEvaluationInScope &&
    urlShowSourcePhasedMethylation
  const availableMethylationIds = useMemo(
    () => new Set((methylationAvailability || []).filter((row) => row.available).map((row) => row.sample_id)),
    [methylationAvailability]
  )
  const methylationSource = sourceForModality(provenance, 'METHYLATION')
  const methylationScope = methylationRequestScope({
    cohort: lrCohort,
    chrom,
    start,
    stop,
    dataLayer: 'SAMPLE_TOTAL',
    source: methylationSource,
    enabled: showHaplotypes && methylationAvailable,
  })
  // Never paint rows from the preceding scope while passive-effect cleanup runs.
  const methylationStateIsCurrent = methylationViewState.scope === methylationScope
  const methylationData = useMemo(
    () => methylationStateIsCurrent ? [...methylationViewState.rowsByIdentity.values()] : [],
    [methylationStateIsCurrent, methylationViewState.rowsByIdentity]
  )
  const methylationSummary = methylationStateIsCurrent ? methylationViewState.summary : []
  const methylationOutliers = methylationStateIsCurrent ? methylationViewState.outliers : null
  const methylationLoading = methylationStateIsCurrent && methylationViewState.loading
  const methylationSampleCount = methylationStateIsCurrent ? methylationViewState.sampleCount : 0
  const methylationTotalSamples = methylationStateIsCurrent ? methylationViewState.totalSamples : 0

  const detailOperationIsCurrent = useCallback((operation: MethylationDetailOperation) => (
    activeMethylationDetailOperationRef.current === operation &&
    detailMethylationRequestGateRef.current.isCurrent(operation.token)
  ), [])

  const releaseDetailOperationIdentities = useCallback((operation: MethylationDetailOperation) => {
    if (activeMethylationDetailOperationRef.current !== operation) return
    operation.inFlightIdentities.forEach((identity) => {
      requestedMethylationSampleIdentitiesRef.current.delete(identity)
    })
    operation.inFlightIdentities.clear()
  }, [])

  const cancelDetailOperation = useCallback((operation: MethylationDetailOperation) => {
    if (activeMethylationDetailOperationRef.current !== operation) return
    releaseDetailOperationIdentities(operation)
    detailMethylationRequestGateRef.current.cancel(operation.token)
    activeMethylationDetailOperationRef.current = null
  }, [releaseDetailOperationIdentities])

  const beginDetailOperation = useCallback((
    kind: MethylationDetailOperation['kind'],
    requestableSampleIds: string[]
  ) => {
    const activeOperation = activeMethylationDetailOperationRef.current
    if (activeOperation) cancelDetailOperation(activeOperation)

    const operation: MethylationDetailOperation = {
      kind,
      token: detailMethylationRequestGateRef.current.begin(methylationScope),
      requestableSampleIds: Object.freeze([...requestableSampleIds]),
      inFlightIdentities: new Set(),
    }
    activeMethylationDetailOperationRef.current = operation
    return operation
  }, [cancelDetailOperation, methylationScope])

  const markDetailOperationSamplesInFlight = useCallback((
    operation: MethylationDetailOperation,
    sampleIds: string[]
  ) => {
    if (!detailOperationIsCurrent(operation)) return
    sampleIds.forEach((sampleId) => {
      const identity = methylationSampleIdentity(operation.token.scope, sampleId)
      requestedMethylationSampleIdentitiesRef.current.add(identity)
      operation.inFlightIdentities.add(identity)
    })
  }, [detailOperationIsCurrent])

  const releaseDetailOperationSamples = useCallback((
    operation: MethylationDetailOperation,
    sampleIds: string[]
  ) => {
    if (activeMethylationDetailOperationRef.current !== operation) return
    sampleIds.forEach((sampleId) => {
      const identity = methylationSampleIdentity(operation.token.scope, sampleId)
      requestedMethylationSampleIdentitiesRef.current.delete(identity)
      operation.inFlightIdentities.delete(identity)
    })
  }, [])

  const updateMethylationForDetailOperation = useCallback((
    operation: MethylationDetailOperation,
    update: (previous: MethylationViewState) => MethylationViewState
  ) => {
    if (!detailOperationIsCurrent(operation)) return
    setMethylationViewState((previous) => (
      previous.scope === operation.token.scope &&
      previous.detailOperationId === operation.token.id
        ? update(previous)
        : previous
    ))
  }, [detailOperationIsCurrent])

  const finishDetailOperation = useCallback((operation: MethylationDetailOperation) => {
    if (!detailOperationIsCurrent(operation)) return
    releaseDetailOperationIdentities(operation)
    detailMethylationRequestGateRef.current.cancel(operation.token)
    activeMethylationDetailOperationRef.current = null
  }, [detailOperationIsCurrent, releaseDetailOperationIdentities])

  const [threshold, setThreshold] = useState(0)
  const [sortBy, setSortBy] = useState('sample_id')
  const [groupingMode, setGroupingMode] = useState<'similarity' | 'exact' | 'diploid'>('diploid')
  const [distanceMetric, setDistanceMetric] = useState<import('../Haplotypes/haplotypeCompute').DistanceMetric>(regionSize < 50_000 ? 'all' : 'sv_only')
  const [plotType, setPlotType] = useState('lollipop')
  const [colorMode, setColorMode] = useState('sv_type')

  const showGenealogy = searchParams.get('show_tree') !== 'false'

  const [mqtlData, setMqtlData] = useState<any[]>([])
  const [mqtlLoading, setMqtlLoading] = useState(false)
  const [showMqtl, setShowMqtl] = useState(false)
  const [mqtlMinLogP, setMqtlMinLogP] = useState(0)

  const [hoveredVariantPosition, setHoveredVariantPosition] = useState<number | null>(null)
  const [typeFilters, setTypeFilters] = useState<VariantTypeFilters>(allLongReadVariantTypesSelected)
  const [showPhantomRegions, setShowPhantomRegions] = useState(false)
  const [showRecombination, setShowRecombination] = useState(false)
  const [showMethylation, setShowMethylation] = useState(false)
  const [filterToOutliers, setFilterToOutliers] = useState(true)
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
    if (mode === 'diploid' && !['sample_id', 'roh_fraction', 'compound_het'].includes(sortBy)) {
      setSortBy('sample_id')
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
    if (!showHaplotypes || !metadataAvailable) return
    if (sampleMetadata.size > 0) return

    const fetchMeta = async () => {
      try {
        const result = await fetchGraphQL(SAMPLE_METADATA_QUERY, { lr_cohort: lrCohort })
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
  }, [showHaplotypes, sampleMetadata.size, lrCohort, metadataAvailable])

  // Initialize Web Worker (with main-thread fallback)
  useEffect(() => {
    try {
      const w = createHaplotypeWorker()
      let workerStartTime = 0
      w.onmessage = (e: MessageEvent) => {
        const elapsed = workerStartTime ? Date.now() - workerStartTime : 0
        if (e.data.type === 'PROGRESS') {
          setLoadingStatus(e.data.status)
        } else if (e.data.type === 'READY') {
          console.log(`[perf] worker READY in ${elapsed}ms, groups=${e.data.data?.groups?.length || 0}`)
          setLoadingStatus('')
          setHaplotypeData(normalizeHaplotypeWorkerData(e.data.data))
          setWorkerComputing(false)
        } else if (e.data.type === 'UPDATED') {
          console.log(`[perf] worker UPDATED in ${elapsed}ms, groups=${e.data.data?.groups?.length || 0}`)
          setLoadingStatus('')
          setHaplotypeData(normalizeHaplotypeWorkerData(e.data.data))
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

    fetchHaplotypeDataREST(chrom, start, stop, lrCohort, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const variantCount = result.variants?.variant_id?.length ?? 0
        const carrierCount = Object.keys(result.carrier_variant_indices || {}).length
        const fetchTime = Math.round(performance.now() - t0)
        console.log(`[REST] raw payload: ${variantCount} variants, ${carrierCount} carriers in ${fetchTime}ms (server: ${result._timing?.total_ms}ms)`)
        setLoadingStatus(`Received ${variantCount.toLocaleString()} variants, ${carrierCount} samples`)
        setAmbiguousUnphasedRows(result._phase_summary?.ambiguous_unphased_rows || 0)

        // Use server-computed auto_defaults
        const defaults = result.auto_defaults || { floor: 0, ceiling: 1, defaultAf: 0, defaultClusterThreshold: 0, isClusteredView: false }
        setAutoDefaults(defaults)
        setThreshold(0)
        setClusterThreshold(defaults.defaultClusterThreshold)
        setDeferredClusterThreshold(defaults.defaultClusterThreshold)
        // Diploid is the default haplotype view; server-suggested clustering
        // (defaults.isClusteredView) no longer overrides the initial mode — it's
        // preserved in autoDefaults for when the user switches to Similarity Clusters.

        setHaplotypeLoading(false)
        // Compute the initial view in the current grouping mode (diploid by default)
        // so the first render's data shape matches the mode — no mismatch flash.
        const initDiploid = groupingMode === 'diploid'
        if (workerRef.current) {
          setWorkerComputing(true)
          setLoadingStatus(`Grouping ${variantCount.toLocaleString()} variants into haplotypes…`)
          workerRef.current.postMessage({ type: 'INIT', rawData: result, minAf: 0, sortBy, distanceMetric, regionSize, isDiploidView: initDiploid })
        } else {
          // Main-thread fallback: rehydrate SoA variants and compute directly
          const variants: import('../Haplotypes/index').LRVariant[] = result.variants?.variant_id
            ? rehydrateVariants(result.variants as any)
            : (result.variants as any) || []
          const carrierIndices = result.carrier_variant_indices || {}
          const carrierMetadata = carrierMetadataFromPayload(result.carriers)
          rawDataRef.current = {
            variants, carrierIndices, carrierMetadata, trvAlts: result.trv_alts,
          }
          const baseData = computeHaplotypeView(
            variants, carrierIndices,
            0, sortBy, initDiploid ? false : defaults.isClusteredView, defaults.defaultClusterThreshold,
            result.trv_alts, initDiploid, distanceMetric, regionSize, carrierMetadata
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
  }, [showHaplotypes, chrom, start, stop, lrCohort])

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
      const { variants, carrierIndices, carrierMetadata, trvAlts } = rawDataRef.current
      let result: ComputedHaplotypeData
      if (isDiploidView) {
        result = computeHaplotypeView(variants, carrierIndices, threshold, sortBy, false, deferredClusterThreshold, trvAlts, true, 'auto', regionSize, carrierMetadata)
      } else if (isClusteredView) {
        const baseData = computeHaplotypeView(variants, carrierIndices, autoDefaults.floor, sortBy, true, deferredClusterThreshold, trvAlts, false, distanceMetric, regionSize, carrierMetadata)
        result = threshold > autoDefaults.floor ? filterDisplayVariants(baseData, threshold) : baseData
      } else {
        result = computeHaplotypeView(variants, carrierIndices, threshold, sortBy, false, deferredClusterThreshold, trvAlts, false, distanceMetric, regionSize, carrierMetadata)
      }
      setHaplotypeData(result)
    }
  }, [threshold, sortBy, isClusteredView, deferredClusterThreshold, isDiploidView, distanceMetric, hasData])

  const haplotypeGroups: HaplotypeGroups = (haplotypeData as HaplotypeGroups | null) || { groups: [] }

  // `groupingMode` updates synchronously, but the recomputed `haplotypeData` lags
  // by a render (worker) or an effect tick (main thread). Rendering diplotype-shaped
  // groups under a non-diploid mode (or vice versa) hits track code paths that assume
  // the other shape (e.g. `group.variants.variants`, absent on diplotype groups),
  // which crashes. Suppress the haplotype track until the data shape matches the mode.
  const dataIsDiploid = haplotypeGroups.groups.length > 0 && 'is_diplotype' in haplotypeGroups.groups[0]
  const dataMatchesMode = haplotypeGroups.groups.length === 0 || dataIsDiploid === isDiploidView

  // Match HaplotypeTrack's genealogy eligibility so summary bands reserve tree space
  // only when the tree actually renders. In particular, a missing tree lets both
  // track families expand across RegionViewer's otherwise reserved right panel.
  const genealogyPanelVisible = useMemo(() => {
    if (!showHaplotypes || !showGenealogy || isDiploidView || !dataMatchesMode) return false
    const groups = haplotypeGroups.groups as HaplotypeGroup[]
    if (!filterToOutliers || !showMethylation) return groups.length >= 2
    const outlierSampleIds = new Set(methylationData.map(point => point.sample))
    return groups.filter(group => group.samples.some(sample => outlierSampleIds.has(sample.sample_id))).length >= 2
  }, [showHaplotypes, showGenealogy, isDiploidView, dataMatchesMode, haplotypeGroups.groups, filterToOutliers, showMethylation, methylationData])

  useEffect(() => {
    onGenealogyPanelVisibilityChange?.(genealogyPanelVisible)
    return () => onGenealogyPanelVisibilityChange?.(false)
  }, [genealogyPanelVisible, onGenealogyPanelVisibilityChange])

  useEffect(() => {
    let cancelled = false
    fetchGraphQL(PHASED_METHYLATION_CAPABILITY_QUERY, { lr_cohort: lrCohort })
      .then((result) => {
        const capability = result.data?.phased_methylation_capability
        if (!cancelled && capability) setPhasedMethylationCapability(capability)
      })
      .catch((error) => {
        // Keep the initialized fail-closed state on contract/network failure.
        console.error('Error fetching phased methylation capability:', error)
      })
    return () => { cancelled = true }
  }, [lrCohort])

  useEffect(() => {
    setSourcePhasedMethylation([])
    setSourcePhasedMethylationError(null)
    if (!showSourcePhasedMethylation) {
      setSourcePhasedMethylationLoading(false)
      return undefined
    }
    let cancelled = false
    setSourcePhasedMethylationLoading(true)
    fetchGraphQL(SOURCE_PHASED_METHYLATION_QUERY, { chrom, start, stop, lr_cohort: lrCohort })
      .then((result) => {
        if (cancelled) return
        if (result.errors?.length) throw new Error(result.errors[0].message)
        setSourcePhasedMethylation(result.data?.source_phased_methylation || [])
      })
      .catch((error) => {
        if (!cancelled) setSourcePhasedMethylationError(error.message)
      })
      .finally(() => {
        if (!cancelled) setSourcePhasedMethylationLoading(false)
      })
    return () => { cancelled = true }
  }, [showSourcePhasedMethylation, chrom, start, stop, lrCohort])

  // The canonical 292-sample roster is authoritative for which identities may be requested.
  useEffect(() => {
    setMethylationAvailability(null)
    if (!y1Mode || !methylationAvailable || lrCohort !== 'hgsvc_hprc') return undefined
    let cancelled = false
    fetchGraphQL(METHYLATION_AVAILABILITY_QUERY, { lr_cohort: lrCohort })
      .then((result) => {
        if (!cancelled) setMethylationAvailability(result.data?.methylation_sample_availability || [])
      })
      .catch((error) => console.error('Error fetching methylation availability:', error))
    return () => { cancelled = true }
  }, [y1Mode, methylationAvailable, lrCohort])

  // A source/region/cohort change invalidates both methylation owners and resets
  // detail, summary, outliers, progress, and loading in one state update.
  useEffect(() => {
    const summaryGate = summaryMethylationRequestGateRef.current
    const detailGate = detailMethylationRequestGateRef.current
    const invalidateDetailOperation = () => {
      const activeOperation = activeMethylationDetailOperationRef.current
      activeOperation?.inFlightIdentities.forEach((identity) => {
        requestedMethylationSampleIdentitiesRef.current.delete(identity)
      })
      detailGate.invalidate()
      activeMethylationDetailOperationRef.current = null
    }

    summaryGate.invalidate()
    invalidateDetailOperation()
    loadAllClaimedMethylationScopeRef.current = null
    requestedMethylationSampleIdentitiesRef.current = new Set()
    completedMethylationSampleIdentitiesRef.current = new Set()
    setMethylationViewState(emptyMethylationViewState(methylationScope))

    return () => {
      summaryGate.invalidate()
      invalidateDetailOperation()
    }
  }, [methylationScope])

  // Fetch methylation summary + outliers when entering haplotype mode.
  // Skip for large regions (>200kb) — methylation data is huge and blocks the main thread.
  // Users can still enable methylation via the checkbox, which triggers the load-all-samples path.
  useEffect(() => {
    if (!showHaplotypes || !methylationAvailable || regionSize > 200_000) return undefined

    const gate = summaryMethylationRequestGateRef.current
    const token = gate.begin(methylationScope)
    const fetchSummaryAndOutliers = async () => {
      try {
        const [summaryResult, outlierResult] = await Promise.all([
          responseForCurrentMethylationRequest(gate, token, (signal) => fetchGraphQL(
            METHYLATION_SUMMARY_QUERY,
            { chrom, start, stop, lr_cohort: lrCohort },
            signal
          )),
          responseForCurrentMethylationRequest(gate, token, (signal) => fetchGraphQL(
            METHYLATION_OUTLIERS_QUERY,
            { chrom, start, stop, lr_cohort: lrCohort },
            signal
          )),
        ])
        if (!gate.isCurrent(token) || !summaryResult || !outlierResult) return
        setMethylationViewState((previous) => ({
          ...previous,
          scope: methylationScope,
          summary: summaryResult.data?.methylation_summary || [],
          outliers: outlierResult.data?.methylation_outliers || null,
        }))
      } catch (error: any) {
        if (error?.name !== 'AbortError' && gate.isCurrent(token)) {
          console.error('Error fetching methylation data:', error)
        }
      }
    }
    fetchSummaryAndOutliers()
    return () => gate.cancel(token)
  }, [
    showHaplotypes, chrom, start, stop, lrCohort, methylationAvailable,
    methylationScope, regionSize,
  ])

  // Auto-fetch per-sample methylation for top outlier samples. Once load-all
  // claims a scope, its captured carrier roster remains authoritative and late
  // summary/outlier completion cannot start a non-carrier detail operation.
  const MAX_AUTO_FETCH_OUTLIERS = 10
  useEffect(() => {
    if (!showHaplotypes || !methylationAvailable || regionSize > 200_000) return undefined
    if (methylationViewState.scope !== methylationScope) return undefined
    if (!methylationOutliers?.samples?.length) return undefined

    if (loadAllClaimedMethylationScopeRef.current === methylationScope) return undefined

    const activeOperation = activeMethylationDetailOperationRef.current
    if (activeOperation?.kind === 'load-all' && detailOperationIsCurrent(activeOperation)) {
      return undefined
    }

    const topOutliers = Array.from(new Set<string>(methylationOutliers.samples
      .slice(0, MAX_AUTO_FETCH_OUTLIERS)
      .filter((sample: any) => sample.outlier_count > 0)
      .map((sample: any) => sample.sample_id)
      .filter((sampleId: string) => !y1Mode || availableMethylationIds.has(sampleId))))
    const incompleteOutliers = incompleteMethylationSampleIds(
      topOutliers,
      completedMethylationSampleIdentitiesRef.current,
      methylationScope
    ).filter((sampleId) => !requestedMethylationSampleIdentitiesRef.current.has(
      methylationSampleIdentity(methylationScope, sampleId)
    ))
    if (incompleteOutliers.length === 0) return undefined

    const operation = beginDetailOperation('auto', topOutliers)
    markDetailOperationSamplesInFlight(operation, incompleteOutliers)
    const completedOutlierCount = operation.requestableSampleIds.filter((sampleId) =>
      completedMethylationSampleIdentitiesRef.current.has(
        methylationSampleIdentity(methylationScope, sampleId)
      )
    ).length
    if (detailOperationIsCurrent(operation)) {
      setMethylationViewState((previous) => previous.scope === operation.token.scope ? ({
        ...previous,
        loading: true,
        sampleCount: completedOutlierCount,
        totalSamples: operation.requestableSampleIds.length,
        detailOperationId: operation.token.id,
      }) : previous)
    }

    const fetchOutlierMethylation = async () => {
      try {
        const result = await responseForCurrentMethylationRequest(
          detailMethylationRequestGateRef.current,
          operation.token,
          (signal) => fetchGraphQL(METHYLATION_QUERY, {
            chrom, start, stop, samples: incompleteOutliers, lr_cohort: lrCohort,
          }, signal)
        )
        if (!detailOperationIsCurrent(operation) || !result) return
        const batch = methylationBatchFromGraphQL(result, incompleteOutliers)
        if (!batch) return

        batch.completedSampleIds.forEach((sampleId) => {
          completedMethylationSampleIdentitiesRef.current.add(
            methylationSampleIdentity(methylationScope, sampleId)
          )
        })
        const completedCount = operation.requestableSampleIds.filter((sampleId) =>
          completedMethylationSampleIdentitiesRef.current.has(
            methylationSampleIdentity(methylationScope, sampleId)
          )
        ).length
        updateMethylationForDetailOperation(operation, (previous) => ({
          ...previous,
          rowsByIdentity: mergeMethylationRecords(
            previous.rowsByIdentity,
            batch.records,
            methylationScope
          ),
          sampleCount: completedCount,
        }))
      } catch (error: any) {
        if (error?.name !== 'AbortError' && detailOperationIsCurrent(operation)) {
          console.error('Error fetching outlier methylation:', error)
        }
      } finally {
        releaseDetailOperationSamples(operation, incompleteOutliers)
        if (detailOperationIsCurrent(operation)) {
          updateMethylationForDetailOperation(operation, (previous) => ({
            ...previous,
            loading: false,
            detailOperationId: null,
          }))
          finishDetailOperation(operation)
        }
      }
    }
    fetchOutlierMethylation()
    return () => {
      if (detailOperationIsCurrent(operation)) {
        updateMethylationForDetailOperation(operation, (previous) => ({
          ...previous,
          loading: false,
          detailOperationId: null,
        }))
        cancelDetailOperation(operation)
      }
    }
  }, [
    showHaplotypes, chrom, start, stop, methylationOutliers, methylationViewState.scope, lrCohort,
    methylationAvailable, y1Mode, availableMethylationIds, methylationScope, regionSize,
    beginDetailOperation, cancelDetailOperation, detailOperationIsCurrent,
    finishDetailOperation, markDetailOperationSamplesInFlight,
    releaseDetailOperationSamples, updateMethylationForDetailOperation,
  ])

  // Load all sample methylation (triggered from HaplotypeTrack). Each click owns
  // one immutable carrier roster and supersedes any prior detail operation.
  const handleLoadAllSamples = useCallback(async () => {
    if (!methylationAvailable || haplotypeGroups.groups.length === 0) return
    if (y1Mode && methylationAvailability === null) return

    const activeOperation = activeMethylationDetailOperationRef.current
    if (activeOperation?.kind === 'load-all' && detailOperationIsCurrent(activeOperation)) return

    const carrierSampleIds = Array.from(new Set(
      haplotypeGroups.groups.flatMap((group) => group.samples.map((sample) => sample.sample_id))
    ))
    const requestableSampleIds = y1Mode
      ? carrierSampleIds.filter((sampleId) => availableMethylationIds.has(sampleId))
      : carrierSampleIds
    if (requestableSampleIds.length === 0) return

    loadAllClaimedMethylationScopeRef.current = methylationScope
    const operation = beginDetailOperation('load-all', requestableSampleIds)
    const incompleteSampleIds = incompleteMethylationSampleIds(
      [...operation.requestableSampleIds],
      completedMethylationSampleIdentitiesRef.current,
      methylationScope
    ).filter((sampleId) => !requestedMethylationSampleIdentitiesRef.current.has(
      methylationSampleIdentity(methylationScope, sampleId)
    ))
    const completedRequestableCount = operation.requestableSampleIds.filter((sampleId) =>
      completedMethylationSampleIdentitiesRef.current.has(
        methylationSampleIdentity(methylationScope, sampleId)
      )
    ).length
    if (detailOperationIsCurrent(operation)) {
      setMethylationViewState((previous) => previous.scope === operation.token.scope ? ({
        ...previous,
        loading: incompleteSampleIds.length > 0,
        sampleCount: completedRequestableCount,
        totalSamples: operation.requestableSampleIds.length,
        detailOperationId: operation.token.id,
      }) : previous)
    }
    if (incompleteSampleIds.length === 0) {
      updateMethylationForDetailOperation(operation, (previous) => ({
        ...previous,
        detailOperationId: null,
      }))
      finishDetailOperation(operation)
      return
    }

    const BATCH_SIZE = 5
    for (let i = 0; i < incompleteSampleIds.length; i += BATCH_SIZE) {
      if (!detailOperationIsCurrent(operation)) return
      const requestedBatch = incompleteSampleIds.slice(i, i + BATCH_SIZE)
      markDetailOperationSamplesInFlight(operation, requestedBatch)

      try {
        const result = await responseForCurrentMethylationRequest(
          detailMethylationRequestGateRef.current,
          operation.token,
          (signal) => fetchGraphQL(METHYLATION_QUERY, {
            chrom, start, stop, samples: requestedBatch, lr_cohort: lrCohort,
          }, signal)
        )
        if (!detailOperationIsCurrent(operation) || !result) return
        const batch = methylationBatchFromGraphQL(result, requestedBatch)
        if (!batch) continue

        batch.completedSampleIds.forEach((sampleId) => {
          completedMethylationSampleIdentitiesRef.current.add(
            methylationSampleIdentity(methylationScope, sampleId)
          )
        })
        const completedCount = operation.requestableSampleIds.filter((sampleId) =>
          completedMethylationSampleIdentitiesRef.current.has(
            methylationSampleIdentity(methylationScope, sampleId)
          )
        ).length
        updateMethylationForDetailOperation(operation, (previous) => ({
          ...previous,
          rowsByIdentity: mergeMethylationRecords(
            previous.rowsByIdentity,
            batch.records,
            methylationScope
          ),
          sampleCount: completedCount,
        }))
      } catch (error: any) {
        if (error?.name === 'AbortError' || !detailOperationIsCurrent(operation)) return
        console.error(`Error fetching batch ${i / BATCH_SIZE}:`, error)
      } finally {
        releaseDetailOperationSamples(operation, requestedBatch)
      }
    }

    if (detailOperationIsCurrent(operation)) {
      updateMethylationForDetailOperation(operation, (previous) => ({
        ...previous,
        loading: false,
        detailOperationId: null,
      }))
      finishDetailOperation(operation)
    }
  }, [
    chrom, start, stop, haplotypeGroups, lrCohort, methylationAvailable, methylationScope,
    y1Mode, methylationAvailability, availableMethylationIds, beginDetailOperation,
    detailOperationIsCurrent, finishDetailOperation, markDetailOperationSamplesInFlight,
    releaseDetailOperationSamples, updateMethylationForDetailOperation,
  ])

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

  // Standardize length → allele_length so summary and haplotype tracks use the same field name
  const standardizedVariants = useMemo(
    () => variants.map((v: any) => ({ ...v, allele_length: v.length })),
    [variants]
  )

  const displayVariants = useMemo(
    () => standardizedVariants.filter(
      (v: any) => !v.enveloping_tr_id
    ),
    [standardizedVariants]
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
    () => filterVariantsInZoomRegion(standardizedVariants, zoomRegion),
    [standardizedVariants, zoomRegion]
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
        const freq = nullableLongReadFrequency(v.freq?.all)
        const tc = v.transcript_consequences?.[0]
        return {
          ...v,
          consequence: v.major_consequence,
          ac: freq.ac,
          an: freq.an,
          af: freq.af,
          ac_hom: v.freq?.all?.homozygote_alt_count ?? null,
          ac_hemi: null,
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
      {outOfScope && (
        <TrackPageSection as="p">
          <strong>Prototype data unavailable outside chr22.</strong> This request was not routed to legacy primary data.
        </TrackPageSection>
      )}
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
      <LRUniqueDensityTrack
        variants={zoomedVariants}
        typeFilters={typeFilters}
        onTypeFiltersChange={setTypeFilters}
      />
      <LongReadVariantTrack variants={zoomedVariants} lod={showHaplotypes ? lod : undefined} showGenealogyPanel={genealogyPanelVisible} isDiploidView={isDiploidView} hoveredVariantPosition={hoveredVariantPosition} onHoverVariantPosition={setHoveredVariantPosition} typeFilters={typeFilters} colorMode={colorMode} regionStart={start} regionStop={stop} />

      {/* Haplotype layer — opt-in */}
      {showHaplotypes && (
        <>
          {showRecombination && recombinationAvailable && <RecombinationRatePlot chrom={chrom} start={start} stop={stop} />}
          {showSourcePhasedMethylation && haplotypeGroups && dataMatchesMode && (
            <HG00097PhasedMethylationComparison
              haplotypeGroups={haplotypeGroups.groups}
              records={sourcePhasedMethylation}
              orientationStatus={phasedMethylationCapability.orientation_status}
            />
          )}
          {/* TODO: Re-enable when mQTL data source is production-ready */}
          {false && showMqtl && (
            <MQTLTrack
              mqtlData={mqtlData}
              loading={mqtlLoading}
              minLogP={mqtlMinLogP}
              onMinLogPChange={setMqtlMinLogP}
            />
          )}
          {haplotypeGroups && !dataMatchesMode && (
            <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              Computing…
            </div>
          )}
          {haplotypeGroups && dataMatchesMode && (
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
              isAutoTuned={isAutoTuned}
              typeFilters={typeFilters}
              ambiguousUnphasedRows={ambiguousUnphasedRows}
            />
          )}
        </>
      )}

      {/* Axis — accordion when haplotypes active, standard otherwise */}
      {showHaplotypes ? <AccordionPositionAxisTrack /> : <PositionAxisTrack />}

      {/* The LR parent viewer keeps the full loaded region as its coordinate frame,
          so this overview owns client-side zoom and explicit region navigation. */}
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
            onNavigateRegion={
              onSetRegion
                ? (region) => onSetRegion({ start: region.start, stop: region.stop })
                : undefined
            }
          />
        </TrackPageSection>
      )}

      </AccordionRegionViewer>

      {/* Top bar: view mode toggle + search */}
      <TrackPageSection>
        <TopBar>
          <ViewModeControls>
            <LongReadViewHelpButton maxHaplotypeRegionSize={MAX_HAPLOTYPE_REGION_SIZE} />
            <LongReadViewControls
              cohort={lrCohort}
              onChangeCohort={onChangeLrCohort}
              showHaplotypes={showHaplotypes}
              haplotypesDisabled={regionTooLarge || haplotypesUnavailable}
              onChangeShowHaplotypes={setShowHaplotypes}
            />
          </ViewModeControls>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontSize: '12px' }}>Color:</label>
            <Select
              value={colorMode}
              onChange={(e: any) => setColorMode(e.target.value)}
            >
              {COLOR_MODES.map((cm) => (
                <option key={cm.value} value={cm.value}>{cm.label}</option>
              ))}
            </Select>
          </div>
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
          <div style={{ marginBottom: 12 }}>
            <label>
              <input
                type="checkbox"
                checked={showSourcePhasedMethylation}
                disabled={!phasedMethylationCapability.available || !sourcePhasedEvaluationInScope}
                onChange={(event) => setShowSourcePhasedMethylationUrl(event.target.checked)}
              />
              {' '}Show pinned HG00097 source hap1/hap2 comparison (orientation unconfirmed)
            </label>
            <div style={{ marginLeft: 20, color: '#666', fontSize: 12 }}>
              HG00097 only; raw source labels are not VCF haplotype 1/2. The cohort view remains visible.
              {sourcePhasedMethylationLoading && ' Loading…'}
              {sourcePhasedMethylationError && ` Error: ${sourcePhasedMethylationError}`}
              {!sourcePhasedEvaluationInScope && ' Available only within chr22:47,040,000-47,050,000.'}
            </div>
          </div>
          <Legend
            initialMinAf={threshold}
            onMinAfChange={handleManualAfChange}
            colorMode={colorMode}
            onColorModeChange={setColorMode}
            initialSortBy={sortBy}
            onSortModeChange={setSortBy}
            showMethylation={showMethylation}
            onShowMethylationChange={setShowMethylation}
            methylationAvailable={methylationAvailable}
            methylationLabel={sourceForModality(provenance, 'METHYLATION')?.label || 'Legacy — not Y1'}
            methylationAvailability={y1Mode ? methylationAvailability : undefined}
            phasedMethylationCapability={phasedMethylationCapability}
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
            showRecombination={showRecombination}
            onShowRecombinationChange={setShowRecombination}
            recombinationAvailable={recombinationAvailable}
            recombinationLabel={sourceForModality(provenance, 'RECOMBINATION')?.label || 'External reference (UCSC hg38)'}
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
              lrCohort={lrCohort}
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
