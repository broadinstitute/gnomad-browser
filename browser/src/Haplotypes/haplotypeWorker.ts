/**
 * Web Worker for haplotype computation.
 * Maintains rawPayload, tree, and baseGroups in memory.
 * Messages: INIT, UPDATE_AF, UPDATE_THRESHOLD.
 */

import type { LRVariant } from './index'
import {
  rehydrateVariants,
  carrierMetadataFromPayload,
  computeHaplotypeView,
  filterDisplayVariants,
  type SoAVariants,
  type ComputedHaplotypeData,
  type AutoDefaults,
  type CarrierMetadata,
  type DistanceMetric,
  type StructuredCarrier,
} from './haplotypeCompute'
import { minimumAlleleFrequencyOrDefault } from './minimumAlleleFrequency'

// ---- Worker state ----

let variants: LRVariant[] = []
let carrierVariantIndices: Record<string, number[]> = {}
let carrierMetadata: CarrierMetadata = {}
let trvAlts: Record<string, Record<number, string>> | undefined
let autoDefaults: AutoDefaults | null = null
let baseData: ComputedHaplotypeData | null = null
let baseDataThreshold = 0
let currentSortBy = 'similarity_score'
let isDiploidView = false
let currentDistanceMetric: DistanceMetric = 'auto'
let currentRegionSize: number | undefined
let wasClusteredView = false

// ---- Message types ----

type WorkerGeneration = {
  /** Scope/request epoch. Optional only for callers using the legacy protocol. */
  requestGeneration?: number
  /** Computation epoch within one request. Optional only for legacy callers. */
  computeGeneration?: number
  /** Exact UI representation requested by the caller. */
  representationIdentity?: string
}

type InitMessage = WorkerGeneration & {
  type: 'INIT'
  rawData: {
    variants: SoAVariants
    carrier_variant_indices: Record<string, number[]>
    carriers?: StructuredCarrier[]
    trv_alts?: Record<string, Record<number, string>>
    auto_defaults?: AutoDefaults
  }
  sortBy?: string
  minAf?: number
  isDiploidView?: boolean
  distanceMetric?: DistanceMetric
  regionSize?: number
}

type UpdateAfMessage = WorkerGeneration & {
  type: 'UPDATE_AF'
  minAf: number
  isClusteredView: boolean
  clusterThreshold: number
  sortBy: string
  isDiploidView?: boolean
  distanceMetric?: DistanceMetric
}

type UpdateThresholdMessage = WorkerGeneration & {
  type: 'UPDATE_THRESHOLD'
  clusterThreshold: number
}

type WorkerMessage = InitMessage | UpdateAfMessage | UpdateThresholdMessage

// ---- Handler ----

const generationFields = (msg: WorkerGeneration) => ({
  ...(msg.requestGeneration === undefined ? {} : { requestGeneration: msg.requestGeneration }),
  ...(msg.computeGeneration === undefined ? {} : { computeGeneration: msg.computeGeneration }),
  ...(msg.representationIdentity === undefined
    ? {}
    : { representationIdentity: msg.representationIdentity }),
})

const postProgress = (msg: WorkerGeneration, status: string) => {
  self.postMessage({ type: 'PROGRESS', status, ...generationFields(msg) })
}

const handleMessage = (msg: WorkerMessage) => {
  switch (msg.type) {
    case 'INIT': {
      postProgress(msg, 'Unpacking variant data…')
      let t0 = Date.now()
      variants = rehydrateVariants(msg.rawData.variants)
      const tRehydrate = Date.now() - t0
      carrierVariantIndices = msg.rawData.carrier_variant_indices
      carrierMetadata = carrierMetadataFromPayload(msg.rawData.carriers)
      trvAlts = msg.rawData.trv_alts
      autoDefaults = msg.rawData.auto_defaults || null
      currentSortBy = msg.sortBy || 'similarity_score'
      isDiploidView = msg.isDiploidView || false
      currentDistanceMetric = msg.distanceMetric || 'auto'
      currentRegionSize = msg.regionSize

      const carrierCount = Object.keys(carrierVariantIndices).length
      postProgress(msg, `Grouping ${carrierCount} samples into haplotypes…`)

      // Clustered views need a stable floor for their base tree; other modes use the
      // requested AF directly, including zero.
      const floorAf = autoDefaults?.floor ?? 0
      const clusterThreshold = autoDefaults?.defaultClusterThreshold ?? 0
      const isClusteredView = autoDefaults?.isClusteredView ?? false
      const initialAf = minimumAlleleFrequencyOrDefault(
        msg.minAf,
        autoDefaults?.defaultAf ?? floorAf
      )

      const reportProgress = (status: string) => postProgress(msg, status)

      t0 = Date.now()
      baseData = computeHaplotypeView(
        variants, carrierVariantIndices,
        isClusteredView ? floorAf : initialAf, currentSortBy, isClusteredView, clusterThreshold,
        trvAlts, isDiploidView, currentDistanceMetric, currentRegionSize,
        carrierMetadata, reportProgress
      )
      const tCompute = Date.now() - t0
      baseDataThreshold = clusterThreshold
      wasClusteredView = isClusteredView

      // Apply display filtering if the initial AF is above the clustering floor.
      let result = baseData
      if (isClusteredView && initialAf > floorAf) {
        postProgress(msg, `Filtering ${baseData.groups.length} groups…`)
        result = filterDisplayVariants(baseData, initialAf)
      }

      console.log(`[perf-worker] INIT: rehydrate=${tRehydrate}ms, compute=${tCompute}ms, groups=${baseData.groups.length}, clusters=${baseData.clusters?.length || 0}`)

      self.postMessage({
        type: 'READY',
        data: result,
        autoDefaults,
        ...generationFields(msg),
      })
      break
    }

    case 'UPDATE_AF': {
      currentSortBy = msg.sortBy
      if (msg.isDiploidView !== undefined) isDiploidView = msg.isDiploidView
      const metricChanged = msg.distanceMetric !== undefined && msg.distanceMetric !== currentDistanceMetric
      if (msg.distanceMetric !== undefined) currentDistanceMetric = msg.distanceMetric

      // Invalidate baseData when switching into clustered mode from a non-clustered mode
      const modeChanged = msg.isClusteredView !== wasClusteredView
      wasClusteredView = msg.isClusteredView

      let result: ComputedHaplotypeData
      if (isDiploidView) {
        // Diploid view: grouping by diplotype, no clustering/tree
        result = computeHaplotypeView(
          variants, carrierVariantIndices,
          msg.minAf, currentSortBy, false, msg.clusterThreshold,
          trvAlts, true, 'auto', currentRegionSize, carrierMetadata
        )
      } else if (msg.isClusteredView) {
        // Clustering ON: rebuild baseData if threshold, distance metric, or mode changed
        if (!baseData || msg.clusterThreshold !== baseDataThreshold || metricChanged || modeChanged) {
          baseData = computeHaplotypeView(
            variants, carrierVariantIndices,
            autoDefaults?.floor ?? 0, currentSortBy, true, msg.clusterThreshold,
            trvAlts, false, currentDistanceMetric, currentRegionSize, carrierMetadata
          )
          baseDataThreshold = msg.clusterThreshold
        }
        result = msg.minAf > (autoDefaults?.floor ?? 0)
          ? filterDisplayVariants(baseData, msg.minAf)
          : baseData
      } else {
        // Clustering OFF: min AF drives grouping
        result = computeHaplotypeView(
          variants, carrierVariantIndices,
          msg.minAf, currentSortBy, false, msg.clusterThreshold,
          trvAlts, false, currentDistanceMetric, currentRegionSize, carrierMetadata
        )
      }

      self.postMessage({ type: 'UPDATED', data: result, ...generationFields(msg) })
      break
    }

    case 'UPDATE_THRESHOLD': {
      // Re-cut existing tree with new threshold
      if (!baseData?.tree_json) {
        self.postMessage({ type: 'UPDATED', data: baseData, ...generationFields(msg) })
        break
      }

      // Rebuild base data with new cluster threshold
      baseData = computeHaplotypeView(
        variants, carrierVariantIndices,
        autoDefaults?.floor ?? 0, currentSortBy, true, msg.clusterThreshold,
        trvAlts, false, currentDistanceMetric, currentRegionSize, carrierMetadata
      )
      baseDataThreshold = msg.clusterThreshold

      self.postMessage({ type: 'UPDATED', data: baseData, ...generationFields(msg) })
      break
    }
  }
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    handleMessage(e.data)
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      ...generationFields(e.data),
    })
  }
}


// perf timing
