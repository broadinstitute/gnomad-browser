/**
 * Web Worker for haplotype computation.
 * Maintains rawPayload, tree, and baseGroups in memory.
 * Messages: INIT, UPDATE_AF, UPDATE_THRESHOLD.
 */

import type { LRVariant } from './index'
import {
  rehydrateVariants,
  computeHaplotypeView,
  filterDisplayVariants,
  type SoAVariants,
  type ComputedHaplotypeData,
  type AutoDefaults,
  type DistanceMetric,
} from './haplotypeCompute'

// ---- Worker state ----

let variants: LRVariant[] = []
let carrierVariantIndices: Record<string, number[]> = {}
let trvAlts: Record<string, Record<number, string>> | undefined
let autoDefaults: AutoDefaults | null = null
let baseData: ComputedHaplotypeData | null = null
let baseDataThreshold = 0
let currentSortBy = 'similarity_score'
let isDiploidView = false
let currentDistanceMetric: DistanceMetric = 'auto'

// ---- Message types ----

type InitMessage = {
  type: 'INIT'
  rawData: {
    variants: SoAVariants
    carrier_variant_indices: Record<string, number[]>
    trv_alts?: Record<string, Record<number, string>>
    auto_defaults?: AutoDefaults
  }
  sortBy?: string
  isDiploidView?: boolean
  distanceMetric?: DistanceMetric
}

type UpdateAfMessage = {
  type: 'UPDATE_AF'
  minAf: number
  isClusteredView: boolean
  clusterThreshold: number
  sortBy: string
  isDiploidView?: boolean
  distanceMetric?: DistanceMetric
}

type UpdateThresholdMessage = {
  type: 'UPDATE_THRESHOLD'
  clusterThreshold: number
}

type WorkerMessage = InitMessage | UpdateAfMessage | UpdateThresholdMessage

// ---- Handler ----

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data

  switch (msg.type) {
    case 'INIT': {
      variants = rehydrateVariants(msg.rawData.variants)
      carrierVariantIndices = msg.rawData.carrier_variant_indices
      trvAlts = msg.rawData.trv_alts
      autoDefaults = msg.rawData.auto_defaults || null
      currentSortBy = msg.sortBy || 'similarity_score'
      isDiploidView = msg.isDiploidView || false
      currentDistanceMetric = msg.distanceMetric || 'auto'

      // Compute base data at floor AF with clustering
      const floorAf = autoDefaults?.floor || 0
      const clusterThreshold = autoDefaults?.defaultClusterThreshold || 0
      const isClusteredView = autoDefaults?.isClusteredView || false

      baseData = computeHaplotypeView(
        variants, carrierVariantIndices,
        floorAf, currentSortBy, isClusteredView, clusterThreshold,
        trvAlts, isDiploidView, currentDistanceMetric
      )
      baseDataThreshold = clusterThreshold

      // Apply display filtering if default AF > floor
      const defaultAf = autoDefaults?.defaultAf || floorAf
      let result = baseData
      if (isClusteredView && defaultAf > floorAf) {
        result = filterDisplayVariants(baseData, defaultAf)
      }

      self.postMessage({
        type: 'READY',
        data: result,
        autoDefaults,
      })
      break
    }

    case 'UPDATE_AF': {
      currentSortBy = msg.sortBy
      if (msg.isDiploidView !== undefined) isDiploidView = msg.isDiploidView
      const metricChanged = msg.distanceMetric !== undefined && msg.distanceMetric !== currentDistanceMetric
      if (msg.distanceMetric !== undefined) currentDistanceMetric = msg.distanceMetric

      let result: ComputedHaplotypeData
      if (isDiploidView) {
        // Diploid view: grouping by diplotype, no clustering/tree
        result = computeHaplotypeView(
          variants, carrierVariantIndices,
          msg.minAf, currentSortBy, false, msg.clusterThreshold,
          trvAlts, true
        )
      } else if (msg.isClusteredView) {
        // Clustering ON: rebuild baseData if threshold or distance metric changed
        if (!baseData || msg.clusterThreshold !== baseDataThreshold || metricChanged) {
          baseData = computeHaplotypeView(
            variants, carrierVariantIndices,
            autoDefaults?.floor || 0, currentSortBy, true, msg.clusterThreshold,
            trvAlts, false, currentDistanceMetric
          )
          baseDataThreshold = msg.clusterThreshold
        }
        result = msg.minAf > (autoDefaults?.floor || 0)
          ? filterDisplayVariants(baseData, msg.minAf)
          : baseData
      } else {
        // Clustering OFF: min AF drives grouping
        result = computeHaplotypeView(
          variants, carrierVariantIndices,
          msg.minAf, currentSortBy, false, msg.clusterThreshold,
          trvAlts, false, currentDistanceMetric
        )
      }

      self.postMessage({ type: 'UPDATED', data: result })
      break
    }

    case 'UPDATE_THRESHOLD': {
      // Re-cut existing tree with new threshold
      if (!baseData?.tree_json) {
        self.postMessage({ type: 'UPDATED', data: baseData })
        break
      }

      // Rebuild base data with new cluster threshold
      baseData = computeHaplotypeView(
        variants, carrierVariantIndices,
        autoDefaults?.floor || 0, currentSortBy, true, msg.clusterThreshold,
        trvAlts, false, currentDistanceMetric
      )
      baseDataThreshold = msg.clusterThreshold

      self.postMessage({ type: 'UPDATED', data: baseData })
      break
    }
  }
}

