import { debounce, throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import { Select } from '@gnomad/ui'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import Cursor from '../RegionViewerCursor'
import { TrackPageSection } from '../TrackPage'

import HaplotypeTrack, {
  HaplotypeGroup,
  HaplotypeGroups,
  HaplotypeCluster,
  HaplotypeTrackHandle,
  Methylation,
  MethylationSummaryPoint,
  LRVariant,
  Legend,
  normalizeSelectableGroupingMode,
  type HaplotypeGroupingMode,
  type SelectableHaplotypeGroupingMode,
} from '../Haplotypes'
import type { MethylationSampleAvailability } from '../Haplotypes/MethylationHelp'
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
import HaplotypeVariantTable, {
  HaplotypeVariantTableHandle,
  type VariantTypeFilters,
} from '../Haplotypes/HaplotypeVariantTable'
import { createHaplotypeWorker } from '../Haplotypes/createHaplotypeWorker'
import RecombinationRatePlot from '../Haplotypes/RecombinationRate'
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
import { filterLongReadVariantsForViewport } from './longReadViewport'
import { AccordionCoordinateMapper } from '../Haplotypes/AccordionCoordinateMapper'
import AccordionRegionViewer from '../Haplotypes/AccordionRegionViewer'
import { AccordionPositionAxisTrack } from '../Haplotypes/AccordionPositionAxis'
import { useVariantSearchText, withVariantSearchParam } from '../RegionPage/variantSearchParam'
import {
  matchesLongReadVariantSearch,
  parseLongReadVariantSearch,
} from './longReadVariantSearch'
import {
  countMatchingHaplotypes,
  type VariantMatchPredicate,
} from './haplotypeSearchFiltering'
import {
  LongReadY1Provenance,
  modalityAvailable,
  sourceForModality,
} from './LongReadProvenanceBanner'
import { nullableLongReadFrequency } from './longReadFrequency'
import { parseHaplotypeResponse } from './haplotypeResponse'
import {
  incompleteMethylationSampleIds,
  mergeMethylationRecords,
  methylationBatchFromGraphQL,
  methylationRequestScope,
  methylationSampleIdentity,
  responseForCurrentMethylationRequest,
  MethylationRequestGate,
} from './methylationState'
import {
  deterministicSampleBatches,
  filterGroupsToSourceSamples,
  inclusiveRegionSpanBp,
  joinedMethylationRecordIdentity,
  joinedMethylationUsabilityForRegion,
  joinedMethylationRequestScope,
  perCopyLoadingProgress,
  validateJoinedMethylationBatch,
  type JoinedPhasedMethylationCapability,
  type JoinedPhasedMethylationRecord,
  type PerCopyMethylationSampleState,
} from './perCopyMethylation'

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

const JOINED_PHASED_METHYLATION_CAPABILITY_QUERY = `
  query RegionJoinedPhasedMethylationCapability($chrom: String!, $lr_cohort: LongReadCohort!) {
    joined_phased_methylation_capability(chrom: $chrom, lr_cohort: $lr_cohort) {
      available joinable_to_vcf status source_sample_ids max_span_bp max_samples max_records reason
      identity {
        source_run_id source_completion_receipt_sha256 source_manifest_sha256
        browser_vcf_manifest_bundle_sha256 browser_vcf_manifest_sha256 browser_vcf_run_id
        orientation_receipt_id orientation_receipt_sha256 mapping_artifact_sha256 mapping_scope
      }
    }
  }
`

const JOINED_PHASED_METHYLATION_REGION_QUERY = `
  query RegionJoinedPhasedMethylation($chrom: String!, $start: Int!, $stop: Int!, $sample_ids: [String!]!, $expected_orientation_receipt_sha256: String!, $lr_cohort: LongReadCohort!) {
    joined_phased_methylation_region(
      chrom: $chrom
      start: $start
      stop: $stop
      sample_ids: $sample_ids
      expected_orientation_receipt_sha256: $expected_orientation_receipt_sha256
      lr_cohort: $lr_cohort
    ) {
      identity {
        source_run_id source_completion_receipt_sha256 source_manifest_sha256
        browser_vcf_manifest_bundle_sha256 browser_vcf_manifest_sha256 browser_vcf_run_id
        orientation_receipt_id orientation_receipt_sha256 mapping_artifact_sha256 mapping_scope
      }
      requested_sample_ids completed_sample_ids
      unavailable_samples { sample_id status reason }
      records {
        source_row_key chr pos1 pos2 sample methylation coverage source_haplotype
        vcf_strand mapping_scope phase_set
      }
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
  chrom: string,
  start: number,
  stop: number,
  lrCohort: 'hgsvc_hprc' | 'aou',
  signal?: AbortSignal
): Promise<RawPayload> => {
  const params = new URLSearchParams({
    chrom,
    start: String(start),
    stop: String(stop),
    lr_cohort: lrCohort,
  })
  const t0 = performance.now()
  const response = await fetch(`/api/lr/haplotype-groups?${params}`, { signal })
  const tNetwork = Math.round(performance.now() - t0)
  const t1 = performance.now()
  const text = await response.text()
  const tDownload = Math.round(performance.now() - t1)
  const t2 = performance.now()
  const data = parseHaplotypeResponse(response, text)
  const tParse = Math.round(performance.now() - t2)
  const sizeMB = (text.length / 1024 / 1024).toFixed(2)
  console.log(
    `[perf] REST fetch: network=${tNetwork}ms, download=${tDownload}ms, JSON.parse=${tParse}ms, size=${sizeMB}MB`
  )
  return data
}

// --- Styled components ---

const TopBar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, max-content) max-content minmax(180px, auto);
  align-items: center;
  gap: 8px 16px;
  min-block-size: 52px;
  padding: 8px 0;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, auto) max-content;
    min-block-size: 92px;
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, auto);
    align-items: start;
    min-block-size: 154px;
  }
`

const ViewModeControls = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const ColorControls = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const SearchInline = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 420px;

  @media (max-width: 900px) {
    grid-column: 1 / -1;
    max-width: none;
  }
`

const SearchStatus = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 22px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #555;

  button {
    padding: 2px 7px;
    border: 1px solid #aaa;
    border-radius: 3px;
    background: #fff;
    cursor: pointer;
  }
`

const SearchInput = styled.input`
  box-sizing: border-box;
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
  variantSearch?: string | null
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

/**
 * Stable identity for the single retained haplotype payload. Source fields are
 * explicit (rather than object serialization) so unrelated provenance UI changes
 * do not invalidate a large payload.
 */
export const haplotypeRequestScope = ({
  datasetId,
  cohort,
  chrom,
  start,
  stop,
  provenance,
}: {
  datasetId: DatasetId
  cohort: 'hgsvc_hprc' | 'aou'
  chrom: string
  start: number
  stop: number
  provenance: LongReadY1Provenance | null
}) => {
  const source = sourceForModality(provenance, 'HAPLOTYPES')
  return JSON.stringify([
    datasetId,
    cohort,
    chrom,
    start,
    stop,
    source?.source ?? null,
    source?.database ?? null,
    source?.release ?? null,
    source?.cohort ?? null,
    source?.reference_genome ?? null,
    source?.chromosome ?? null,
    source?.scope ?? null,
    source?.run_id ?? null,
    source?.status ?? null,
    source?.available ?? null,
  ])
}

type HaplotypeDataState = {
  scope: string
  representationIdentity: string
  data: ComputedHaplotypeData
}

type ActiveWorkerCompute = {
  scope: string
  requestGeneration: number
  computeGeneration: number
  representationIdentity: string
}

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

type JoinedMethylationCapabilityQueryState =
  | { scope: string | null; status: 'loading' }
  | { scope: string; status: 'resolved'; capability: JoinedPhasedMethylationCapability }
  | { scope: string; status: 'error'; reason: string }

type JoinedMethylationViewState = {
  scope: string
  recordsByIdentity: Map<string, JoinedPhasedMethylationRecord>
  sampleStates: Map<string, PerCopyMethylationSampleState>
  version: number
}

const emptyJoinedMethylationViewState = (scope: string): JoinedMethylationViewState => ({
  scope,
  recordsByIdentity: new Map(),
  sampleStates: new Map(),
  version: 0,
})

const LongReadUnifiedView = ({
  datasetId,
  gene,
  variants,
  variantSearch = null,
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

  // If region is too large and URL requests haplotype, show warning and fall back
  const [showRegionWarning, setShowRegionWarning] = useState(regionTooLarge && urlShowHaplotypes)
  const y1Mode = provenance?.enabled === true || process.env.LR_Y1_ENABLED === 'true'
  // Capabilities from the API are authoritative. The build flag only fails closed while
  // provenance is unavailable (for example during an API/frontend version transition).
  const capabilityKnown = (modality: string) =>
    sourceForModality(provenance, modality) !== undefined
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
  const outOfScope =
    provenance?.enabled === true &&
    provenance.sources.some((source) => source.modality === 'PRIMARY_VARIANTS' && !source.available)
  const haplotypesUnavailable = lrCohort === 'aou' || outOfScope || !haplotypesAvailable
  const showHaplotypes = !regionTooLarge && !haplotypesUnavailable && urlShowHaplotypes

  const [threshold, setThreshold] = useState(0)
  const [sortBy, setSortBy] = useState('sample_id')
  const [groupingModeState, setGroupingMode] = useState<HaplotypeGroupingMode>('diploid')
  const groupingMode = normalizeSelectableGroupingMode(groupingModeState)
  const [distanceMetric, setDistanceMetric] = useState<
    import('../Haplotypes/haplotypeCompute').DistanceMetric
  >(regionSize < 50_000 ? 'all' : 'sv_only')
  const [colorMode, setColorMode] = useState('sv_type')
  const isDiploidView = groupingMode === 'diploid'

  const setShowHaplotypes = useCallback(
    (show: boolean) => {
      const params = new URLSearchParams(location.search)
      if (show) {
        params.set('show_haplotypes', 'true')
      } else {
        params.delete('show_haplotypes')
        params.delete('show_tree')
      }
      history.replace({ ...location, search: params.toString() })
    },
    [history, location]
  )

  const setShowGenealogyUrl = useCallback((show: boolean) => {
    const params = new URLSearchParams(location.search)
    if (show) {
      params.delete('show_tree') // default is on, so remove param
    } else {
      params.set('show_tree', 'false')
    }
    history.replace({ ...location, search: params.toString() })
  }, [history, location])

  // Haplotype mode state. Memory is deliberately bounded to one raw scope (inside
  // the worker, or one rehydrated fallback payload) and one computed representation.
  const haplotypeScope = haplotypeRequestScope({
    datasetId,
    cohort: lrCohort,
    chrom,
    start,
    stop,
    provenance,
  })
  const activeHaplotypeScopeRef = useRef(haplotypeScope)
  activeHaplotypeScopeRef.current = haplotypeScope
  const [haplotypeDataState, setHaplotypeDataState] = useState<HaplotypeDataState | null>(null)
  const haplotypeData = haplotypeDataState?.scope === haplotypeScope
    ? haplotypeDataState.data
    : null
  const [autoDefaults, setAutoDefaults] = useState<AutoDefaults>({ floor: 0, ceiling: 1, defaultAf: 0, defaultClusterThreshold: 0, isClusteredView: false })
  const workerRef = useRef<Worker | null>(null)
  const rawDataRef = useRef<{
    scope: string
    variants: import('../Haplotypes/index').LRVariant[]
    carrierIndices: Record<string, number[]>
    carrierMetadata: CarrierMetadata
    trvAlts?: Record<string, Record<number, string>>
  } | null>(null)
  const workerRawScopeRef = useRef<string | null>(null)
  const requestGenerationRef = useRef(0)
  const computeGenerationRef = useRef(0)
  const activeWorkerComputeRef = useRef<ActiveWorkerCompute | null>(null)
  const [haplotypeLoading, setHaplotypeLoading] = useState(false)
  const [workerComputing, setWorkerComputing] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [haplotypeError, setHaplotypeError] = useState<string | null>(null)
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
  const [methylationAvailability, setMethylationAvailability] = useState<
    MethylationSampleAvailability[] | null
  >(null)
  const joinedMethylationCapabilityScope = JSON.stringify([lrCohort, chrom])
  const [joinedMethylationCapabilityState, setJoinedMethylationCapabilityState] =
    useState<JoinedMethylationCapabilityQueryState>({ scope: null, status: 'loading' })
  const joinedMethylationCapability =
    joinedMethylationCapabilityState.scope === joinedMethylationCapabilityScope &&
    joinedMethylationCapabilityState.status === 'resolved'
      ? joinedMethylationCapabilityState.capability
      : null
  const joinedMethylationUsability =
    joinedMethylationCapabilityState.scope === joinedMethylationCapabilityScope &&
    joinedMethylationCapabilityState.status === 'error'
      ? { usable: false as const, reason: joinedMethylationCapabilityState.reason }
      : joinedMethylationUsabilityForRegion(
          joinedMethylationCapability,
          inclusiveRegionSpanBp(start, stop),
          isDiploidView || groupingMode === 'similarity'
        )
  const joinedMethylationUsableForRegion = joinedMethylationUsability.usable
  const confirmedJoinedMethylationCapability = joinedMethylationUsability.usable
    ? joinedMethylationUsability.capability
    : null
  const [showPerCopyMethylation, setShowPerCopyMethylation] = useState(false)
  const [methylationSamplesOnly, setMethylationSamplesOnly] = useState(false)
  const [loadAllJoinedMethylationScope, setLoadAllJoinedMethylationScope] = useState<string | null>(
    null
  )
  const joinedMethylationScope = joinedMethylationRequestScope({
    cohort: lrCohort,
    chrom,
    start,
    stop,
    mode: groupingMode,
    enabled: showHaplotypes && showPerCopyMethylation && joinedMethylationUsableForRegion,
    identity: confirmedJoinedMethylationCapability?.identity || null,
  })
  const [joinedMethylationDemand, setJoinedMethylationDemand] = useState<{
    scope: string
    sampleIds: Set<string>
    reported: boolean
  }>({ scope: joinedMethylationScope, sampleIds: new Set(), reported: false })
  const [joinedMethylationViewState, setJoinedMethylationViewState] =
    useState<JoinedMethylationViewState>(emptyJoinedMethylationViewState(joinedMethylationScope))
  const joinedMethylationRequestGateRef = useRef(new MethylationRequestGate())
  const joinedMethylationInFlightRef = useRef<Map<string, number>>(new Map())
  const joinedMethylationStateIsCurrent =
    joinedMethylationViewState.scope === joinedMethylationScope
  const perCopyMethylationRecords = useMemo(
    () =>
      joinedMethylationStateIsCurrent
        ? [...joinedMethylationViewState.recordsByIdentity.values()]
        : [],
    [joinedMethylationStateIsCurrent, joinedMethylationViewState.recordsByIdentity]
  )
  const perCopyMethylationSampleStates = joinedMethylationStateIsCurrent
    ? joinedMethylationViewState.sampleStates
    : new Map<string, PerCopyMethylationSampleState>()
  const handleShowPerCopyMethylationChange = useCallback((show: boolean) => {
    setShowPerCopyMethylation(show)
  }, [])
  const availableMethylationIds = useMemo(
    () =>
      new Set(
        (methylationAvailability || []).filter((row) => row.available).map((row) => row.sample_id)
      ),
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
  const methylationOutlierSampleIds = useMemo(
    () => (methylationOutliers?.samples || [])
      .filter((sample: any) => sample.outlier_count > 0)
      .map((sample: any) => String(sample.sample_id)),
    [methylationOutliers]
  )
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
    },
    [detailOperationIsCurrent, releaseDetailOperationIdentities]
  )

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
  const [filterToOutliers, setFilterToOutliers] = useState(false)
  const [isAutoTuned, setIsAutoTuned] = useState(true)
  const [searchText, setSearchText] = useVariantSearchText(variantSearch)
  const [showOnlyMatchingHaplotypes, setShowOnlyMatchingHaplotypes] = useState(false)
  const parsedSearch = useMemo(
    () => parseLongReadVariantSearch(searchText, { chrom, start, stop }),
    [searchText, chrom, start, stop]
  )
  const searchIsActive = parsedSearch.status !== 'empty'
  const hasLocalSearchTerms = parsedSearch.validTerms.length > 0
  const variantMatchesSearch = useCallback<VariantMatchPredicate>(
    (variant) => matchesLongReadVariantSearch(variant, parsedSearch),
    [parsedSearch]
  )

  // Keep committed search state shareable while avoiding one history entry per keypress.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const nextSearch = withVariantSearchParam(location.search, searchText)
      if (nextSearch !== location.search) history.replace({ ...location, search: nextSearch })
    }, 250)
    return () => clearTimeout(timeout)
  }, [history, location, searchText])

  useEffect(() => {
    if (!hasLocalSearchTerms) setShowOnlyMatchingHaplotypes(false)
  }, [hasLocalSearchTerms])

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

  const handleGroupingModeChange = useCallback((mode: SelectableHaplotypeGroupingMode) => {
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

  // Derive booleans from groupingMode for worker/compute compatibility.
  const isClusteredView = groupingMode === 'similarity'
  const representationIdentity = JSON.stringify([
    threshold,
    isClusteredView,
    deferredClusterThreshold,
    sortBy,
    isDiploidView,
    distanceMetric,
  ])
  const computeParametersRef = useRef({
    threshold,
    isClusteredView,
    deferredClusterThreshold,
    sortBy,
    isDiploidView,
    distanceMetric,
    representationIdentity,
  })
  computeParametersRef.current = {
    threshold,
    isClusteredView,
    deferredClusterThreshold,
    sortBy,
    isDiploidView,
    distanceMetric,
    representationIdentity,
  }

  // The worker is intentionally lazy: Summary-only mounts allocate neither a Worker
  // nor its raw-data state. Responses must match both epochs; untagged legacy replies
  // are never accepted by this generation-aware caller.
  const ensureHaplotypeWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current
    try {
      const w = createHaplotypeWorker()
      const workerStartTimes = new Map<number, number>()
      w.onmessage = (e: MessageEvent) => {
        const active = activeWorkerComputeRef.current
        const responseIsCurrent =
          active !== null &&
          active.scope === activeHaplotypeScopeRef.current &&
          e.data.requestGeneration === active.requestGeneration &&
          e.data.computeGeneration === active.computeGeneration &&
          e.data.representationIdentity === active.representationIdentity
        if (!responseIsCurrent) return

        const elapsed = workerStartTimes.has(e.data.computeGeneration)
          ? Date.now() - workerStartTimes.get(e.data.computeGeneration)!
          : 0
        if (e.data.type === 'PROGRESS') {
          setLoadingStatus(e.data.status)
        } else if (e.data.type === 'READY' || e.data.type === 'UPDATED') {
          console.log(
            `[perf] worker ${e.data.type} in ${elapsed}ms, groups=${e.data.data?.groups?.length || 0}`
          )
          setLoadingStatus('')
          setHaplotypeDataState({
            scope: active.scope,
            representationIdentity: e.data.representationIdentity,
            data: normalizeHaplotypeWorkerData(e.data.data),
          })
          setWorkerComputing(false)
        } else if (e.data.type === 'ERROR') {
          console.error('[worker] haplotype computation failed:', e.data.error)
          setLoadingStatus('')
          setWorkerComputing(false)
          setHaplotypeError('Haplotype computation failed. Reload the page to retry.')
        }
      }
      const origPostMessage = w.postMessage.bind(w)
      w.postMessage = (msg: any, ...args: any[]) => {
        if (msg.computeGeneration !== undefined) {
          workerStartTimes.set(msg.computeGeneration, Date.now())
        }
        return origPostMessage(msg, ...args)
      }
      w.onerror = () => {
        console.warn('[worker] haplotype worker failed')
        w.terminate()
        if (workerRef.current === w) workerRef.current = null
        workerRawScopeRef.current = null
        activeWorkerComputeRef.current = null
        setWorkerComputing(false)
        setLoadingStatus('')
        setHaplotypeError('Haplotype computation failed. Reload the page to retry.')
      }
      workerRef.current = w
      console.log('[worker] haplotype worker initialized')
      return w
    } catch {
      console.warn('[worker] haplotype worker unavailable, using main thread')
      return null
    }
  }, [])

  const postWorkerCompute = useCallback((
    worker: Worker,
    scope: string,
    requestGeneration: number,
    requestedRepresentationIdentity: string,
    message: Record<string, unknown>
  ) => {
    const computeGeneration = computeGenerationRef.current + 1
    computeGenerationRef.current = computeGeneration
    activeWorkerComputeRef.current = {
      scope,
      requestGeneration,
      computeGeneration,
      representationIdentity: requestedRepresentationIdentity,
    }
    setWorkerComputing(true)
    worker.postMessage({
      ...message,
      requestGeneration,
      computeGeneration,
      representationIdentity: requestedRepresentationIdentity,
    })
  }, [])

  const abortControllerRef = useRef<AbortController | null>(null)
  const networkScopeRef = useRef<string | null>(null)
  const workerRawRequestGenerationRef = useRef(0)

  // Fetch at most one raw scope. Leaving Haplotype View retains that one scope;
  // changing cohort/region/provenance aborts and evicts it before loading another.
  useEffect(() => {
    const residentScope = workerRawScopeRef.current || rawDataRef.current?.scope || null
    if (residentScope !== null && residentScope !== haplotypeScope) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      networkScopeRef.current = null
      // The worker owns the raw payload, so scope eviction must terminate it;
      // clearing only the UI marker would leave the old large arrays resident.
      workerRef.current?.terminate()
      workerRef.current = null
      workerRawScopeRef.current = null
      rawDataRef.current = null
      activeWorkerComputeRef.current = null
      requestGenerationRef.current += 1
      setWorkerComputing(false)
      setHaplotypeLoading(false)
      setLoadingStatus('')
    } else if (networkScopeRef.current !== null && networkScopeRef.current !== haplotypeScope) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      networkScopeRef.current = null
      activeWorkerComputeRef.current = null
      requestGenerationRef.current += 1
    }

    if (!showHaplotypes) return
    const worker = ensureHaplotypeWorker()

    if (
      haplotypeDataState?.scope === haplotypeScope ||
      workerRawScopeRef.current === haplotypeScope ||
      rawDataRef.current?.scope === haplotypeScope ||
      networkScopeRef.current === haplotypeScope
    ) {
      return
    }

    const requestGeneration = requestGenerationRef.current + 1
    requestGenerationRef.current = requestGeneration
    const controller = new AbortController()
    abortControllerRef.current = controller
    networkScopeRef.current = haplotypeScope
    setHaplotypeLoading(true)
    setHaplotypeError(null)
    setLoadingStatus('Fetching variant data…')
    const t0 = performance.now()

    fetchHaplotypeDataREST(chrom, start, stop, lrCohort, controller.signal)
      .then((result) => {
        if (
          controller.signal.aborted ||
          activeHaplotypeScopeRef.current !== haplotypeScope ||
          requestGeneration !== requestGenerationRef.current
        ) return
        networkScopeRef.current = null
        abortControllerRef.current = null
        const variantCount = result.variants?.variant_id?.length ?? 0
        const carrierCount = Object.keys(result.carrier_variant_indices || {}).length
        const fetchTime = Math.round(performance.now() - t0)
        console.log(`[REST] raw payload: ${variantCount} variants, ${carrierCount} carriers in ${fetchTime}ms (server: ${result._timing?.total_ms}ms)`)
        setLoadingStatus(`Received ${variantCount.toLocaleString()} variants, ${carrierCount} samples`)
        setAmbiguousUnphasedRows(result._phase_summary?.ambiguous_unphased_rows || 0)

        const defaults = result.auto_defaults || { floor: 0, ceiling: 1, defaultAf: 0, defaultClusterThreshold: 0, isClusteredView: false }
        setAutoDefaults(defaults)
        setThreshold(0)
        setClusterThreshold(defaults.defaultClusterThreshold)
        setDeferredClusterThreshold(defaults.defaultClusterThreshold)
        setHaplotypeLoading(false)

        const current = computeParametersRef.current
        const initialRepresentationIdentity = JSON.stringify([
          0,
          current.isClusteredView,
          defaults.defaultClusterThreshold,
          current.sortBy,
          current.isDiploidView,
          current.distanceMetric,
        ])
        // The worker captured when REST started may have failed and been terminated
        // while the request was in flight. Only transfer the sole raw payload to it
        // if it is still the live worker; otherwise retain the payload on the main
        // thread and compute there without installing a dead-worker scope marker.
        const liveWorker = worker !== null && workerRef.current === worker ? worker : null
        if (liveWorker) {
          workerRawScopeRef.current = haplotypeScope
          workerRawRequestGenerationRef.current = requestGeneration
          setLoadingStatus(`Grouping ${variantCount.toLocaleString()} variants into haplotypes…`)
          postWorkerCompute(liveWorker, haplotypeScope, requestGeneration, initialRepresentationIdentity, {
            type: 'INIT',
            rawData: result,
            minAf: 0,
            isClusteredView: current.isDiploidView ? false : current.isClusteredView,
            sortBy: current.sortBy,
            distanceMetric: current.distanceMetric,
            regionSize,
            isDiploidView: current.isDiploidView,
          })
        } else {
          const rehydrated: import('../Haplotypes/index').LRVariant[] = result.variants?.variant_id
            ? rehydrateVariants(result.variants as any)
            : (result.variants as any) || []
          const carrierIndices = result.carrier_variant_indices || {}
          const carrierMetadata = carrierMetadataFromPayload(result.carriers)
          rawDataRef.current = {
            scope: haplotypeScope,
            variants: rehydrated,
            carrierIndices,
            carrierMetadata,
            trvAlts: result.trv_alts,
          }
          const baseData = computeHaplotypeView(
            rehydrated, carrierIndices,
            0, current.sortBy, current.isDiploidView ? false : current.isClusteredView,
            defaults.defaultClusterThreshold, result.trv_alts, current.isDiploidView,
            current.distanceMetric, regionSize, carrierMetadata
          )
          if (activeHaplotypeScopeRef.current === haplotypeScope) {
            setHaplotypeError(null)
            setLoadingStatus('')
            setHaplotypeDataState({
              scope: haplotypeScope,
              representationIdentity: initialRepresentationIdentity,
              data: baseData,
            })
          }
        }
      })
      .catch((error: any) => {
        if (
          error?.name === 'AbortError' ||
          activeHaplotypeScopeRef.current !== haplotypeScope ||
          requestGeneration !== requestGenerationRef.current
        ) return
        networkScopeRef.current = null
        abortControllerRef.current = null
        console.error('Error fetching haplotype data:', error)
        setHaplotypeLoading(false)
        setWorkerComputing(false)
        setLoadingStatus('')
        setHaplotypeError(
          error instanceof Error ? error.message : 'Unable to load haplotype data.'
        )
      })
  }, [
    showHaplotypes,
    haplotypeScope,
    haplotypeDataState?.scope,
    chrom,
    start,
    stop,
    lrCohort,
    regionSize,
    ensureHaplotypeWorker,
    postWorkerCompute,
  ])

  useEffect(() => () => {
    requestGenerationRef.current += 1
    abortControllerRef.current?.abort()
    workerRef.current?.terminate()
    workerRef.current = null
    rawDataRef.current = null
    workerRawScopeRef.current = null
    activeWorkerComputeRef.current = null
  }, [])

  // Recompute only when the retained representation differs from the controls.
  // This is what makes Summary → Haplotype re-entry reuse both raw and computed data.
  const hasData = haplotypeData !== null
  useEffect(() => {
    if (!hasData) return
    if (haplotypeDataState?.representationIdentity === representationIdentity) {
      const active = activeWorkerComputeRef.current
      if (
        active?.scope === haplotypeScope &&
        active.representationIdentity !== representationIdentity
      ) {
        // Controls returned to the resident representation before an older compute
        // replied. Retire its generation so that response cannot repaint stale data.
        activeWorkerComputeRef.current = null
        setWorkerComputing(false)
        setLoadingStatus('')
      }
      return
    }
    if (workerRef.current && workerRawScopeRef.current === haplotypeScope) {
      postWorkerCompute(
        workerRef.current,
        haplotypeScope,
        workerRawRequestGenerationRef.current,
        representationIdentity,
        {
          type: 'UPDATE_AF',
          minAf: threshold,
          isClusteredView,
          clusterThreshold: deferredClusterThreshold,
          sortBy,
          isDiploidView,
          distanceMetric,
        }
      )
    } else if (rawDataRef.current?.scope === haplotypeScope) {
      const { variants: rawVariants, carrierIndices, carrierMetadata, trvAlts } = rawDataRef.current
      let result: ComputedHaplotypeData
      if (isDiploidView) {
        result = computeHaplotypeView(rawVariants, carrierIndices, threshold, sortBy, false, deferredClusterThreshold, trvAlts, true, 'auto', regionSize, carrierMetadata)
      } else if (isClusteredView) {
        const baseData = computeHaplotypeView(rawVariants, carrierIndices, autoDefaults.floor, sortBy, true, deferredClusterThreshold, trvAlts, false, distanceMetric, regionSize, carrierMetadata)
        result = threshold > autoDefaults.floor ? filterDisplayVariants(baseData, threshold) : baseData
      } else {
        result = computeHaplotypeView(rawVariants, carrierIndices, threshold, sortBy, false, deferredClusterThreshold, trvAlts, false, distanceMetric, regionSize, carrierMetadata)
      }
      setHaplotypeDataState({ scope: haplotypeScope, representationIdentity, data: result })
    }
  }, [
    threshold,
    sortBy,
    isClusteredView,
    deferredClusterThreshold,
    isDiploidView,
    distanceMetric,
    hasData,
    haplotypeDataState?.representationIdentity,
    haplotypeScope,
    representationIdentity,
    regionSize,
    autoDefaults.floor,
    postWorkerCompute,
  ])

  const unfilteredHaplotypeGroups: HaplotypeGroups = (haplotypeData as HaplotypeGroups | null) || {
    groups: [],
  }
  const sourceSampleIds = useMemo(
    () => confirmedJoinedMethylationCapability?.source_sample_ids || [],
    [confirmedJoinedMethylationCapability]
  )
  const sourceSampleIdSet = useMemo(() => new Set(sourceSampleIds), [sourceSampleIds])
  const haplotypeGroups: HaplotypeGroups = useMemo(
    () =>
      methylationSamplesOnly && isDiploidView && confirmedJoinedMethylationCapability
        ? {
            ...unfilteredHaplotypeGroups,
            groups: filterGroupsToSourceSamples(unfilteredHaplotypeGroups.groups, sourceSampleIds),
          }
        : unfilteredHaplotypeGroups,
    [
      methylationSamplesOnly,
      isDiploidView,
      confirmedJoinedMethylationCapability,
      unfilteredHaplotypeGroups,
      sourceSampleIds,
    ]
  )
  const allDisplayedSourceSampleIds = useMemo(
    () =>
      Array.from(
        new Set(
          unfilteredHaplotypeGroups.groups.flatMap((group) =>
            group.samples
              .map((sample) => sample.sample_id)
              .filter((sampleId) => sourceSampleIdSet.has(sampleId))
          )
        )
      ).sort((left, right) => left.localeCompare(right)),
    [unfilteredHaplotypeGroups.groups, sourceSampleIdSet]
  )
  const visibleJoinedSampleIds = useMemo(
    () =>
      joinedMethylationDemand.scope === joinedMethylationScope && joinedMethylationDemand.reported
        ? joinedMethylationDemand.sampleIds
        : new Set<string>(),
    [joinedMethylationDemand, joinedMethylationScope]
  )
  const loadAllJoinedMethylation = loadAllJoinedMethylationScope === joinedMethylationScope
  // Display-roster churn is irrelevant until Load All is claimed and must not cancel
  // an otherwise unchanged visible-row request.
  const displayedSourceSampleIdsForLoadAll = loadAllJoinedMethylation
    ? allDisplayedSourceSampleIds
    : null
  const neededJoinedSampleIds = useMemo(() => {
    const needed = new Set(visibleJoinedSampleIds)
    displayedSourceSampleIdsForLoadAll?.forEach((sampleId) => needed.add(sampleId))
    return needed
  }, [visibleJoinedSampleIds, displayedSourceSampleIdsForLoadAll])
  const visibleMethylationProgress =
    joinedMethylationDemand.scope === joinedMethylationScope && joinedMethylationDemand.reported
      ? perCopyLoadingProgress(
          [...joinedMethylationDemand.sampleIds],
          perCopyMethylationSampleStates
        )
      : null
  const allMethylationProgress = loadAllJoinedMethylation
    ? perCopyLoadingProgress(allDisplayedSourceSampleIds, perCopyMethylationSampleStates)
    : null
  const handleLoadAllPerCopyMethylation = useCallback(() => {
    setLoadAllJoinedMethylationScope(joinedMethylationScope)
  }, [joinedMethylationScope])
  const handleRetryPerCopyMethylation = useCallback(() => {
    setJoinedMethylationViewState((previous) => {
      if (previous.scope !== joinedMethylationScope) return previous
      let changed = false
      const sampleStates = new Map(previous.sampleStates)
      sampleStates.forEach((state, sampleId) => {
        if (state.status === 'error') {
          // Remove the terminal state so the request effect can claim this sample
          // exactly once; the ownership map distinguishes active loading from a
          // reclaimable loading state left by a canceled request.
          sampleStates.delete(sampleId)
          changed = true
        }
      })
      return changed ? { ...previous, sampleStates, version: previous.version + 1 } : previous
    })
  }, [joinedMethylationScope])

  // `groupingMode` updates synchronously, but the recomputed `haplotypeData` lags
  // by a render (worker) or an effect tick (main thread). Rendering diplotype-shaped
  // groups under a non-diploid mode (or vice versa) hits track code paths that assume
  // the other shape (e.g. `group.variants.variants`, absent on diplotype groups),
  // which crashes. Suppress the haplotype track until the data shape matches the mode.
  const dataIsDiploid = haplotypeGroups.groups.length > 0 && 'is_diplotype' in haplotypeGroups.groups[0]
  const dataMatchesMode = haplotypeGroups.groups.length === 0 || dataIsDiploid === isDiploidView
  const trackHaplotypeGroups: HaplotypeGroups = dataMatchesMode ? haplotypeGroups : { groups: [] }
  const haplotypeViewportStatus = haplotypeError
    ? { kind: 'error' as const, message: `Unable to load Haplotype View. ${haplotypeError}` }
    : !dataMatchesMode
      ? { kind: 'busy' as const, message: loadingStatus || 'Computing haplotype groups…' }
      : haplotypeLoading || workerComputing || !hasData
        ? {
            kind: 'busy' as const,
            message: loadingStatus || (workerComputing ? 'Computing haplotype groups…' : 'Loading haplotypes…'),
          }
        : haplotypeGroups.groups.length === 0
          ? { kind: 'empty' as const, message: 'There is no haplotype data for this region.' }
          : null

  // Match HaplotypeTrack's genealogy eligibility so summary bands reserve tree space
  // only when the tree actually renders. In particular, a missing tree lets both
  // track families expand across RegionViewer's otherwise reserved right panel.
  const genealogyPanelVisible = useMemo(() => {
    if (!showHaplotypes || !showGenealogy || isDiploidView || !dataMatchesMode) return false
    const groups = haplotypeGroups.groups as HaplotypeGroup[]
    if (!filterToOutliers || !showMethylation) return groups.length >= 2
    const outlierSampleIds = new Set(methylationOutlierSampleIds)
    return groups.filter(group => group.samples.some(sample => outlierSampleIds.has(sample.sample_id))).length >= 2
  }, [showHaplotypes, showGenealogy, isDiploidView, dataMatchesMode, haplotypeGroups.groups, filterToOutliers, showMethylation, methylationOutlierSampleIds])

  useEffect(() => {
    onGenealogyPanelVisibilityChange?.(genealogyPanelVisible)
    return () => onGenealogyPanelVisibilityChange?.(false)
  }, [genealogyPanelVisible, onGenealogyPanelVisibilityChange])

  useEffect(() => {
    let cancelled = false
    setJoinedMethylationCapabilityState({
      scope: joinedMethylationCapabilityScope,
      status: 'loading',
    })
    fetchGraphQL(JOINED_PHASED_METHYLATION_CAPABILITY_QUERY, { chrom, lr_cohort: lrCohort })
      .then((result) => {
        if (cancelled) return
        if (result.errors?.length) throw new Error(result.errors[0].message)
        const capability = result.data?.joined_phased_methylation_capability
        if (!capability) throw new Error('Joined methylation capability response was empty')
        setJoinedMethylationCapabilityState({
          scope: joinedMethylationCapabilityScope,
          status: 'resolved',
          capability,
        })
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Error fetching joined methylation capability:', error)
        setJoinedMethylationCapabilityState({
          scope: joinedMethylationCapabilityScope,
          status: 'error',
          reason:
            'Per-copy methylation API is unavailable; restart with the joined methylation route enabled.',
        })
      })
    return () => {
      cancelled = true
    }
  }, [chrom, lrCohort, joinedMethylationCapabilityScope])

  const handleVisibleDiploidSampleIdsChange = useCallback(
    (sampleIds: string[]) => {
      const next =
        showHaplotypes && showPerCopyMethylation && joinedMethylationUsableForRegion
          ? new Set(sampleIds)
          : new Set<string>()
      setJoinedMethylationDemand((previous) => {
        if (
          previous.scope === joinedMethylationScope &&
          previous.reported &&
          previous.sampleIds.size === next.size &&
          [...next].every((sampleId) => previous.sampleIds.has(sampleId))
        ) {
          return previous
        }
        return { scope: joinedMethylationScope, sampleIds: next, reported: true }
      })
    },
    [
      showHaplotypes,
      showPerCopyMethylation,
      joinedMethylationUsableForRegion,
      joinedMethylationScope,
    ]
  )

  useEffect(() => {
    const gate = joinedMethylationRequestGateRef.current
    gate.invalidate()
    // Load All is one explicit user action for one uninterrupted scope lifetime. Clearing
    // the claim here prevents a recreated scope from silently resurrecting bulk demand.
    setLoadAllJoinedMethylationScope(null)
    joinedMethylationInFlightRef.current.clear()
    setJoinedMethylationViewState(emptyJoinedMethylationViewState(joinedMethylationScope))
    return () => gate.invalidate()
  }, [joinedMethylationScope])

  // Fetch only samples represented by visible diploid or collapsed similarity-cluster rows,
  // in deterministic batches. Raw joined records stay scoped to source/region/mode rather
  // than a transient cluster ID or threshold cut.
  useEffect(() => {
    if (
      !showHaplotypes ||
      !showPerCopyMethylation ||
      !joinedMethylationUsableForRegion ||
      !confirmedJoinedMethylationCapability ||
      joinedMethylationViewState.scope !== joinedMethylationScope
    )
      return undefined

    const requestIdentity = (sampleId: string) => `${joinedMethylationScope}\u0000${sampleId}`
    const isPending = (sampleId: string) => {
      const state = joinedMethylationViewState.sampleStates.get(sampleId)
      return (
        (state === undefined || state.status === 'loading') &&
        !joinedMethylationInFlightRef.current.has(requestIdentity(sampleId))
      )
    }
    const pendingVisible = [...visibleJoinedSampleIds].filter(isPending)
    const pendingAll = [...neededJoinedSampleIds].filter(
      (sampleId) => !visibleJoinedSampleIds.has(sampleId) && isPending(sampleId)
    )
    const maxBatchSize = Math.min(25, confirmedJoinedMethylationCapability.max_samples)
    const requestedSampleIds =
      deterministicSampleBatches(pendingVisible, maxBatchSize)[0] ||
      deterministicSampleBatches(pendingAll, maxBatchSize)[0]
    if (!requestedSampleIds?.length) return undefined

    const gate = joinedMethylationRequestGateRef.current
    const token = gate.begin(joinedMethylationScope)
    requestedSampleIds.forEach((sampleId) => {
      joinedMethylationInFlightRef.current.set(requestIdentity(sampleId), token.id)
    })
    const releaseInFlight = () => {
      requestedSampleIds.forEach((sampleId) => {
        const identity = requestIdentity(sampleId)
        if (joinedMethylationInFlightRef.current.get(identity) === token.id) {
          joinedMethylationInFlightRef.current.delete(identity)
        }
      })
    }
    setJoinedMethylationViewState((previous) => {
      if (previous.scope !== joinedMethylationScope) return previous
      const sampleStates = new Map(previous.sampleStates)
      requestedSampleIds.forEach((sampleId) => sampleStates.set(sampleId, { status: 'loading' }))
      return { ...previous, sampleStates }
    })

    const fetchBatch = async () => {
      try {
        const result = await responseForCurrentMethylationRequest(gate, token, (signal) =>
          fetchGraphQL(
            JOINED_PHASED_METHYLATION_REGION_QUERY,
            {
              chrom,
              start,
              stop,
              sample_ids: requestedSampleIds,
              expected_orientation_receipt_sha256:
                confirmedJoinedMethylationCapability.identity.orientation_receipt_sha256,
              lr_cohort: lrCohort,
            },
            signal
          )
        )
        if (!result || !gate.isCurrent(token)) return
        if (result.errors?.length) {
          const graphQLError = result.errors[0]
          const error = new Error(graphQLError.message) as Error & { code?: string }
          error.code = graphQLError.extensions?.code || 'JOINED_METHYLATION_QUERY_ERROR'
          throw error
        }
        const region = validateJoinedMethylationBatch(
          result.data?.joined_phased_methylation_region,
          {
            requestedSampleIds,
            identity: confirmedJoinedMethylationCapability.identity,
            chrom,
            start,
            stop,
          }
        )
        if (!gate.isCurrent(token)) return
        setJoinedMethylationViewState((previous) => {
          if (previous.scope !== joinedMethylationScope) return previous
          const recordsByIdentity = new Map(previous.recordsByIdentity)
          region.records.forEach((record) => {
            recordsByIdentity.set(joinedMethylationRecordIdentity(record), record)
          })
          const sampleStates = new Map(previous.sampleStates)
          region.completed_sample_ids.forEach((sampleId) => {
            sampleStates.set(sampleId, {
              status: 'complete',
              recordCount: region.records.filter((record) => record.sample === sampleId).length,
            })
          })
          region.unavailable_samples.forEach((sample) => {
            sampleStates.set(sample.sample_id, { status: 'unavailable', reason: sample.reason })
          })
          return { ...previous, recordsByIdentity, sampleStates, version: previous.version + 1 }
        })
      } catch (error: any) {
        if (error?.name === 'AbortError' || !gate.isCurrent(token)) return
        setJoinedMethylationViewState((previous) => {
          if (previous.scope !== joinedMethylationScope) return previous
          const sampleStates = new Map(previous.sampleStates)
          requestedSampleIds.forEach((sampleId) =>
            sampleStates.set(sampleId, {
              status: 'error',
              code: error.code || error.message || 'JOINED_METHYLATION_QUERY_ERROR',
              reason: error.message || 'Joined methylation query failed',
            })
          )
          return { ...previous, sampleStates, version: previous.version + 1 }
        })
      } finally {
        // Successful/error state updates advance `version`; their effect cleanup releases
        // ownership before the next batch is selected. A canceled token may finish later,
        // but can release only identities it still owns.
        if (!gate.isCurrent(token)) releaseInFlight()
      }
    }
    fetchBatch()
    return () => {
      gate.cancel(token)
      releaseInFlight()
    }
  }, [
    showHaplotypes,
    showPerCopyMethylation,
    joinedMethylationUsableForRegion,
    confirmedJoinedMethylationCapability,
    joinedMethylationScope,
    joinedMethylationViewState.scope,
    joinedMethylationViewState.version,
    neededJoinedSampleIds,
    visibleJoinedSampleIds,
    regionSize,
    chrom,
    start,
    stop,
    lrCohort,
  ])

  // The canonical 292-sample roster is authoritative for which identities may be requested.
  useEffect(() => {
    setMethylationAvailability(null)
    if (!showMethylation || !y1Mode || !methylationAvailable || lrCohort !== 'hgsvc_hprc')
      return undefined
    let cancelled = false
    fetchGraphQL(METHYLATION_AVAILABILITY_QUERY, { lr_cohort: lrCohort })
      .then((result) => {
        if (!cancelled)
          setMethylationAvailability(result.data?.methylation_sample_availability || [])
      })
      .catch((error) => console.error('Error fetching methylation availability:', error))
    return () => {
      cancelled = true
    }
  }, [showMethylation, y1Mode, methylationAvailable, lrCohort])

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
    if (!showHaplotypes || !showMethylation || !methylationAvailable || regionSize > 200_000)
      return undefined

    const gate = summaryMethylationRequestGateRef.current
    const token = gate.begin(methylationScope)
    const fetchSummaryAndOutliers = async () => {
      try {
        const [summaryResult, outlierResult] = await Promise.all([
          responseForCurrentMethylationRequest(gate, token, (signal) =>
            fetchGraphQL(
              METHYLATION_SUMMARY_QUERY,
              { chrom, start, stop, lr_cohort: lrCohort },
              signal
            )
          ),
          responseForCurrentMethylationRequest(gate, token, (signal) =>
            fetchGraphQL(
              METHYLATION_OUTLIERS_QUERY,
              { chrom, start, stop, lr_cohort: lrCohort },
              signal
            )
          ),
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
    showHaplotypes,
    showMethylation,
    chrom,
    start,
    stop,
    lrCohort,
    methylationAvailable,
    methylationScope,
    regionSize,
  ])

  // Auto-fetch per-sample methylation for top outlier samples. Once load-all
  // claims a scope, its captured carrier roster remains authoritative and late
  // summary/outlier completion cannot start a non-carrier detail operation.
  const MAX_AUTO_FETCH_OUTLIERS = 10
  useEffect(() => {
    if (!showHaplotypes || !showMethylation || !methylationAvailable || regionSize > 200_000)
      return undefined
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
    showHaplotypes,
    showMethylation,
    chrom,
    start,
    stop,
    methylationOutliers,
    methylationViewState.scope,
    lrCohort,
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

  // The loaded region owns data, grouping, and table rows. The view region is
  // a client-only graphical x-domain and never participates in fetch effects.
  const viewRegion = useMemo(
    () => zoomRegion || { start, stop },
    [zoomRegion, start, stop]
  )

  const lod = useMemo(
    () => getLodVisibility(viewRegion.stop - viewRegion.start),
    [viewRegion]
  )

  // Project only overlapping variants into graphical tracks. Keep the loaded
  // array intact for the stable summary table and preserve spanning SV/TRs.
  const viewportVariants = useMemo(
    () => filterLongReadVariantsForViewport(displayVariants, viewRegion),
    [displayVariants, viewRegion]
  )
  const searchedViewportVariants = useMemo(
    () => searchIsActive
      ? viewportVariants.filter((variant: LRVariant) => variantMatchesSearch(variant))
      : viewportVariants,
    [viewportVariants, searchIsActive, variantMatchesSearch]
  )
  const searchedLoadedVariants = useMemo(
    () => searchIsActive
      ? displayVariants.filter((variant: LRVariant) => variantMatchesSearch(variant))
      : displayVariants,
    [displayVariants, searchIsActive, variantMatchesSearch]
  )
  const haplotypeSearchCounts = useMemo(
    () => hasLocalSearchTerms
      ? countMatchingHaplotypes(haplotypeGroups.groups, variantMatchesSearch)
      : null,
    [hasLocalSearchTerms, haplotypeGroups.groups, variantMatchesSearch]
  )
  const outOfRegionSearchTerm = parsedSearch.terms.find((term) => term.status === 'out_of_region')
  const malformedSearchTerms = parsedSearch.terms.filter((term) => term.status === 'malformed')

  // Unfiltered viewport variants define optional accordion phantom loci.
  const unfilteredViewportVariants: LRVariant[] = useMemo(
    () => filterLongReadVariantsForViewport(standardizedVariants, viewRegion),
    [standardizedVariants, viewRegion]
  )

  const accordionMapper = useMemo(
    () => new AccordionCoordinateMapper(viewRegion, unfilteredViewportVariants, showPhantomRegions),
    [viewRegion, unfilteredViewportVariants, showPhantomRegions]
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

      {/* Controls precede the visualization they govern and keep a stable document position. */}
      <TrackPageSection data-testid="lr-control-slot">
        <TopBar data-testid="lr-view-top-bar">
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
          <ColorControls>
            <label style={{ fontSize: '12px' }}>Color:</label>
            <Select
              value={colorMode}
              onChange={(e: any) => setColorMode(e.target.value)}
            >
              {COLOR_MODES.map((cm) => (
                <option key={cm.value} value={cm.value}>{cm.label}</option>
              ))}
            </Select>
          </ColorControls>
          <SearchInline>
            <svg
              aria-hidden="true"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14 }}
              viewBox="0 0 24 24"
              fill="#888"
            >
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <SearchInput
              type="text"
              aria-label="Filter long-read variants"
              placeholder="Position, rsID, REF>ALT, variant/SV/TR ID…"
              value={searchText}
              maxLength={512}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSearchText('')
              }}
            />
          </SearchInline>
        </TopBar>
        {searchIsActive && (
          <SearchStatus role={parsedSearch.status === 'invalid' || parsedSearch.status === 'limit_exceeded' ? 'alert' : 'status'}>
            {hasLocalSearchTerms && (
              <span>
                {searchedLoadedVariants.length.toLocaleString()} matching variant{searchedLoadedVariants.length === 1 ? '' : 's'} in this loaded region
                {parsedSearch.validTerms.length > 1 ? ` (${parsedSearch.validTerms.length} terms, OR)` : ''}.
              </span>
            )}
            {!hasLocalSearchTerms && !outOfRegionSearchTerm && (
              <span>{parsedSearch.issues[0]?.message || malformedSearchTerms[0]?.message || 'Enter a recognized variant search.'}</span>
            )}
            {malformedSearchTerms.length > 0 && hasLocalSearchTerms && (
              <span>{malformedSearchTerms.length} unrecognized term{malformedSearchTerms.length === 1 ? '' : 's'} ignored.</span>
            )}
            {outOfRegionSearchTerm && outOfRegionSearchTerm.start != null && outOfRegionSearchTerm.end != null && (
              <>
                <span>{outOfRegionSearchTerm.message}.</span>
                <button
                  type="button"
                  onClick={() => {
                    const targetChrom = outOfRegionSearchTerm.chrom || chrom.replace(/^chr/i, '')
                    const point = outOfRegionSearchTerm.start === outOfRegionSearchTerm.end
                    const targetStart = point ? Math.max(1, outOfRegionSearchTerm.start! - 500) : outOfRegionSearchTerm.start!
                    const targetStop = point ? outOfRegionSearchTerm.end! + 500 : outOfRegionSearchTerm.end!
                    history.push({
                      pathname: `/region/${targetChrom}-${targetStart}-${targetStop}`,
                      search: location.search,
                    })
                  }}
                >
                  Go to {outOfRegionSearchTerm.chrom || chrom}:{outOfRegionSearchTerm.start.toLocaleString()}{outOfRegionSearchTerm.end !== outOfRegionSearchTerm.start ? `-${outOfRegionSearchTerm.end.toLocaleString()}` : ''}
                </button>
              </>
            )}
            {showHaplotypes && hasLocalSearchTerms && haplotypeGroups.groups.length > 0 && haplotypeSearchCounts && (
              <label>
                <input
                  type="checkbox"
                  checked={showOnlyMatchingHaplotypes}
                  onChange={(event) => setShowOnlyMatchingHaplotypes(event.target.checked)}
                />{' '}
                Show only containing haplotypes ({haplotypeSearchCounts.matchingGroupRows}/{haplotypeSearchCounts.totalGroupRows} rows;{' '}
                {haplotypeSearchCounts.matchingSamples}/{haplotypeSearchCounts.totalSamples} samples;{' '}
                {haplotypeSearchCounts.matchingChromosomeCopies}/{haplotypeSearchCounts.totalChromosomeCopies} chromosome copies)
              </label>
            )}
            <button type="button" onClick={() => setSearchText('')}>Clear search</button>
          </SearchStatus>
        )}
        {regionTooLarge && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#999', marginBottom: 8 }}>
            Haplotype view disabled: region too large (&gt; {(MAX_HAPLOTYPE_REGION_SIZE / 1000).toFixed(0)} kb)
          </div>
        )}
      </TrackPageSection>

      <AccordionRegionViewer
        testId="lr-plot-slot"
        mapper={accordionMapper}
        originalRegion={viewRegion}
      >

      {/* Base layer — always rendered */}
      {lod.showDensityTrack && <VariantDensityTrack variants={searchedViewportVariants} />}
      <LRUniqueDensityTrack
        variants={searchedViewportVariants}
        typeFilters={typeFilters}
        onTypeFiltersChange={setTypeFilters}
      />
      <LongReadVariantTrack variants={searchedViewportVariants} lod={showHaplotypes ? lod : undefined} showGenealogyPanel={genealogyPanelVisible} isDiploidView={isDiploidView} hoveredVariantPosition={hoveredVariantPosition} onHoverVariantPosition={setHoveredVariantPosition} typeFilters={typeFilters} colorMode={colorMode} regionStart={viewRegion.start} regionStop={viewRegion.stop} />

      {/* Haplotype layer — opt-in */}
        {showHaplotypes && (
          <>
            {showRecombination && recombinationAvailable && (
              <RecombinationRatePlot chrom={chrom} start={start} stop={stop} />
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
            <HaplotypeTrack
                ref={trackRef}
                viewportStatus={haplotypeViewportStatus}
                haplotypeGroups={trackHaplotypeGroups.groups as HaplotypeGroup[]}
                clusters={trackHaplotypeGroups.clusters}
                methylationData={methylationData}
                methylationSummary={methylationSummary}
                methylationOutlierSampleIds={methylationOutlierSampleIds}
                showPerCopyMethylation={showPerCopyMethylation && joinedMethylationUsableForRegion}
                perCopyMethylationRecords={perCopyMethylationRecords}
                perCopyMethylationSampleStates={perCopyMethylationSampleStates}
                sampleMetadata={sampleMetadata}
                start={viewRegion.start}
                stop={viewRegion.stop}
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
                initialColorMode={colorMode}
                showGenealogy={showGenealogy}
                hoveredVariantPosition={hoveredVariantPosition}
                onVisibleGroupChange={handleVisibleGroupChange}
                onVisibleDiploidSampleIdsChange={handleVisibleDiploidSampleIdsChange}
                joinedMethylationSourceSampleIds={sourceSampleIds}
                groupingMode={groupingMode}
                clusterThreshold={clusterThreshold}
                onClusterThresholdChange={handleClusterThresholdChange}
                expandedClusterIds={expandedClusterIds}
                toggleClusterExpansion={toggleClusterExpansion}
              treeJson={trackHaplotypeGroups.tree_json}
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
              variantMatchesSearch={searchIsActive ? variantMatchesSearch : undefined}
              showOnlyMatchingHaplotypes={showOnlyMatchingHaplotypes}
              ambiguousUnphasedRows={ambiguousUnphasedRows}
            />
        </>
      )}

      {/* Axis — accordion when haplotypes active, standard otherwise */}
      {showHaplotypes ? <AccordionPositionAxisTrack /> : <PositionAxisTrack />}

      {/* The minimap changes only the shared graphical viewport. Loaded data,
          grouping, and table rows stay stable until Set as region is used. */}
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

      </AccordionRegionViewer>

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
            methylationAvailable={methylationAvailable}
            methylationLabel={
              sourceForModality(provenance, 'METHYLATION')?.label || 'Legacy — not Y1'
            }
            methylationAvailability={y1Mode ? methylationAvailability : undefined}
            showPerCopyMethylation={showPerCopyMethylation}
            onShowPerCopyMethylationChange={handleShowPerCopyMethylationChange}
            joinedMethylationCapability={joinedMethylationCapability}
            joinedMethylationUsableForRegion={joinedMethylationUsableForRegion}
            joinedMethylationUnavailableReason={joinedMethylationUsability.reason}
            methylationSamplesOnly={methylationSamplesOnly}
            onMethylationSamplesOnlyChange={setMethylationSamplesOnly}
            visibleMethylationProgress={visibleMethylationProgress}
            allMethylationProgress={allMethylationProgress}
            onLoadAllPerCopyMethylation={handleLoadAllPerCopyMethylation}
            onRetryPerCopyMethylation={handleRetryPerCopyMethylation}
            filterToOutliers={filterToOutliers}
            onFilterToOutliersChange={setFilterToOutliers}
            onLoadAllSamples={handleLoadAllSamples}
            methylationLoading={methylationLoading}
            methylationSampleCount={methylationSampleCount}
            methylationTotalSamples={methylationTotalSamples}
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
      <TrackPageSection data-testid="lr-table-slot">
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
                  summaryVariants={displayVariants}
                  haplotypeGroups={haplotypeGroups as { groups: HaplotypeGroup[]; clusters?: HaplotypeCluster[] }}
                  sampleMetadata={sampleMetadata}
                  ambiguousUnphasedRows={ambiguousUnphasedRows}
                  onHoverVariant={setHoveredVariantPosition}
                  onVisibleVariantChange={handleVisibleVariantChange}
                  onFilteredVariantsChange={handleFilteredVariantsChange}
                  onRowClick={handleRowClick}
                  isClusteredView={isClusteredView}
                  selectedClusterId={selectedClusterId}
                  onClearClusterFilter={handleClearClusterFilter}
                  searchText={searchText}
                  parsedSearch={parsedSearch}
                  typeFilters={typeFilters}
                  onTypeFiltersChange={setTypeFilters}
                />
            </>
          ) : (
            <HaplotypeVariantTable
              mode="summary"
              lrCohort={lrCohort}
              summaryVariants={displayVariants}
              onHoverVariant={setHoveredVariantPosition}
              searchText={searchText}
              parsedSearch={parsedSearch}
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
