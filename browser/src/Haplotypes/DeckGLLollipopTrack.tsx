import React, { useMemo, useState, useCallback, useRef, useContext, forwardRef, useImperativeHandle, useEffect } from 'react'
import { DeckGL } from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { ScatterplotLayer, LineLayer, SolidPolygonLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import { RegionViewerContext } from '@gnomad/region-viewer'
import { scaleLinear } from 'd3-scale'
import { SUPERPOPULATION_COLORS } from './colors'
import { getDiploidSampleLabelColor } from './diploidSampleLabelColor'
import { formatSampleAncestryTooltip } from './sampleAncestryTooltip'
import {
  formatDiploidSampleLabel,
  formatExpandedMemberSampleTooltip,
  getCollapsedClusterLabelLayout,
  getExpandedMemberBarLayout,
  getStandaloneGroupLabelLayout,
} from './leftPanelLabels'
import { countVariantLociAcrossHaplotypeRows } from './haplotypeLocusCounts'
import {
  DIPLOID_SAMPLE_HOVER_HALF_HEIGHT,
  DIPLOID_SAMPLE_LABEL_CENTER_OFFSET,
  DIPLOID_SAMPLE_LABEL_FONT_SIZE,
  HAPLOTYPE_ROW_CENTER_Y,
  scrollTopForHaplotypeRow,
  stackHaplotypeRows,
} from './haplotypeVerticalLayout'
import { getVariantCategory, getLodVisibility, ALLELE_TYPE_COLORS } from '../LongReadVariantPage/variantUtils'
import {
  passesHaplotypeVariantTypeAndSnvLodFilters,
  passesLongReadVariantTypeFilters,
} from '../LongReadVariantPage/longReadVariantTypes'
import {
  hslToRgba, hexToRgba, cssColorToRgba,
  getColorByHashRGBA, getColorByPositionRGBA, getColorByAfRGBA,
  getColorByHaplotypeCountRGBA,
  getVariantRgbaColor,
} from '../LongReadVariantPage/variantColorUtils'
import AccordionContext from './AccordionContext'
import type { PhantomLocus } from './AccordionCoordinateMapper'
import { buildGenealogyTreeLayout } from './genealogyTreeLayout'
import type { TreeBranch, TreeNodePoint, TreePieWedge, TreeClusterMarker, TreeLayout } from './genealogyTreeLayout'
import type { HaplotypeGroup, HaplotypeCluster, LRVariant, Methylation } from './index'
import type { DiplotypeGroup } from './haplotypeCompute'
import { HaplotypeVariantTooltipContent } from './TrVariantTooltip'
import { getRowBackgroundRects } from './haplotypeBackgrounds'
import { getGenealogyPanelLayout } from './genealogyPanelLayout'
import { useStableScrollbarGutter } from './scrollbarGutter'
import { SEARCHED_POSITION_GUIDE_STYLE } from './searchedPositionGuideStyle'
import { longReadAncestryGroupDisplayId } from '../LongReadVariantPage/longReadAncestryGroups'
import type { RowBackgroundRect } from './haplotypeBackgrounds'
import type { VariantMatchPredicate } from '../LongReadVariantPage/haplotypeSearchFiltering'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import { classifyCopySupport, type CopySupportClassification } from './methylationSupport'
import {
  buildMethylationLayerDisplay,
  observationsByCanonicalCopy,
  type MethylationLayerGroupSummary,
  type MethylationLayerSiteSummary,
} from './methylationGroupAggregation'
import type { MethylationViewMode } from './methylationTypes'
import type { MethylationVisualGroup } from './methylationVisualGroups'
import {
  CLUSTER_METHYLATION_BAND_HEIGHT,
  clusterMethylationBandTop,
  clusterMethylationDisplay,
  clusterMethylationRowHeight,
  clusterVariantCenter,
  expandedClusterChildMethylationBandTop,
  expandedClusterChildRowHeight,
  indexJoinedMethylationByCopy,
  recordsForClusterMembership,
  resolveClusterMethylationMembership,
  resolveExactGroupMethylationMembership,
  scientificClusterForDisplay,
  summarizeClusterMethylation,
  type ClusterMethylationGroupSummary,
  type ClusterMethylationSiteSummary,
  type ClusterMethylationSummary,
} from './clusterMethylation'
import {
  diploidPerCopyLayout,
  perCopyEmptyLabel,
  perCopyMethylationForReadyRow,
  PER_COPY_METHYLATION_BAND_HEIGHT,
  type JoinedPhasedMethylationRecord,
  type PerCopyMethylationPoint,
  type PerCopyMethylationSampleState,
} from '../LongReadVariantPage/perCopyMethylation'

type Variant = LRVariant

// Allele types eligible for accordion phantom rendering (matching AccordionCoordinateMapper)
const ACCORDION_ALLELE_TYPES = new Set(['ins', 'alu_ins', 'sva_ins', 'numt', 'trv'])

// Row height constants
const VARIANT_ROW_HEIGHT = 25
const METH_TRACK_HEIGHT = 40
const MQTL_TRACK_HEIGHT = 80
const MQTL_PAD = 8
const ROW_CENTER_Y = HAPLOTYPE_ROW_CENTER_Y
const INSERTION_TYPES = new Set(['ins', 'alu_ins', 'sva_ins', 'numt'])
export const HAPLOTYPE_VIEWPORT_HEIGHT = 500

/** Accurate span measurement using end/pos when available, falling back to allele_length */
const getVariantSpan = (v: { pos: number; end?: number | null; allele_length?: number | null }) =>
  v.end != null ? Math.max(0, v.end - v.pos) : Math.abs(v.allele_length || 0)

// Flattened data types for deck.gl layers
type VariantPoint = {
  position: number // raw genomic position — scaled in layer accessor
  y: number // pixel y
  radius: number
  color: [number, number, number, number]
  variant: Variant
  groupHash: number
  pxX?: number // pre-computed pixel X for phantom-space below-threshold variants
}

type StemLine = {
  position: number // raw genomic position — scaled in layer accessor
  yTop: number
  yBottom: number
  color: [number, number, number, number]
  width: number
  variant: Variant
}

type BackgroundRect = RowBackgroundRect<HaplotypeGroup | DiplotypeGroup>

type SpanningRect = {
  start: number // raw genomic position
  end: number // raw genomic position
  rowY: number
  color: [number, number, number, number]
  variant: Variant
  groupHash: number
}

type MethPoint = {
  position: number // raw genomic position
  y: number
  color: [number, number, number, number]
  layerSite?: MethylationLayerSiteSummary
  copy?: 'A' | 'B'
  copySupport?: CopySupportClassification
  counterpart?: MethylationLayerSiteSummary
  perCopyMetadata?: PerCopyMethylationPoint
  counterpartMetadata?: PerCopyMethylationPoint
}

type MethGroupMark = {
  start: number
  stop: number
  y: number
  color: [number, number, number, number]
  summary: MethylationLayerGroupSummary
  copy?: 'A' | 'B'
  copySupport?: CopySupportClassification
  counterpart?: MethylationLayerGroupSummary
}

type MethStatusLabel = {
  position: [number, number, number]
  text: string
  color: [number, number, number, number]
}

type InlineMethylationScope = 'cluster' | 'exact group'

type ClusterMethPoint = {
  position: number
  y: number
  color: [number, number, number, number]
  clusterSite: ClusterMethylationSiteSummary
  methylationScope: InlineMethylationScope
}

type ClusterMethGroupMark = {
  start: number
  stop: number
  y: number
  color: [number, number, number, number]
  clusterGroup: ClusterMethylationGroupSummary
  methylationScope: InlineMethylationScope
}

type ClusterPopulationPoint = {
  position: number
  y: number
}

type ClusterPopulationGroupMark = {
  start: number
  stop: number
  y: number
}

type MqtlArc = {
  variantPos: number // raw genomic position
  cpgPos: number // raw genomic position
  arcHeight: number // pre-computed arc height in pixels
  baseY: number // baseline Y
  color: [number, number, number, number]
  width: number
}

type PhantomBar = {
  genomicPos: number
  endOffset: number // min(abs(allele_length), maxPhantomLength) in bp
  centerY: number
  color: [number, number, number, number] // colorMode fill
  accentColor: [number, number, number, number] // ALLELE_TYPE_COLORS accent stripe
  variant: Variant
}

type PhantomConnector = {
  genomicPos: number
  startOffset: number // 0 for non-carriers, carrier length for partial connectors
  endOffset: number // maxPhantomLength
  centerY: number
}

type PhantomLabel = {
  text: string
  genomicPos: number
  endOffset: number
  centerY: number
}

// Wrapper that adapts the shared getVariantRgbaColor to the old call-site signature
function getVariantColor(
  variant: Variant,
  colorMode: string,
  start: number,
  stop: number,
  sampleMetadata?: SampleMetadataMap,
  group?: HaplotypeGroup,
  locusCount: number = 0,
  totalGroups: number = 1
): [number, number, number, number] {
  return getVariantRgbaColor(variant, colorMode, {
    start, stop,
    sampleMetadata,
    group,
    locusCount,
    totalGroups,
  })
}

// Variant shape classification — delegates to shared getVariantCategory
type VariantShape = 'circle' | 'deletion' | 'insertion' | 'duplication' | 'inversion' | 'tandem_repeat'

function getVariantShape(variant: Variant): VariantShape {
  const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
  switch (cat) {
    case 'deletion': return 'deletion'
    case 'insertion': return 'insertion'
    case 'sv': return 'duplication'
    case 'tr': return 'tandem_repeat'
    default: return 'circle'
  }
}

// Discriminated union for rows in the mixed cluster + group view
type RowItem =
  | { type: 'cluster'; cluster: HaplotypeCluster }
  | { type: 'group'; group: HaplotypeGroup; isChild: boolean }
  | { type: 'diplotype'; group: DiplotypeGroup }

// Pre-computed population stats for a row (group or cluster)
type PopulationStats = {
  counts: Record<string, number>
  totalSamples: number
  dominantPop: string
  dominantCount: number
  dominantFraction: number
}

function computePopulationStats(
  samples: { sample_id: string }[],
  sampleMetadata: SampleMetadataMap
): PopulationStats {
  const counts: Record<string, number> = {}
  let totalSamples = 0
  let dominantPop = 'N/A'
  let dominantCount = 0
  for (const s of samples) {
    const meta = sampleMetadata.get(s.sample_id)
    const pop = meta?.superpopulation || 'N/A'
    counts[pop] = (counts[pop] || 0) + 1
    totalSamples++
    if (counts[pop] > dominantCount) {
      dominantCount = counts[pop]
      dominantPop = pop
    }
  }
  return {
    counts,
    totalSamples,
    dominantPop,
    dominantCount,
    dominantFraction: totalSamples > 0 ? dominantCount / totalSamples : 0,
  }
}

type DeckGLLollipopTrackProps = {
  displayGroups: HaplotypeGroup[]
  viewportHeight?: number
  variantMatchesSearch?: VariantMatchPredicate
  haplotypeGroups: HaplotypeGroup[]
  clusters?: HaplotypeCluster[]
  scientificClusters?: HaplotypeCluster[]
  start: number
  stop: number
  colorMode: string
  showMethylation: boolean
  methylationData: Methylation[]
  showPerCopyMethylation: boolean
  perCopyMethylationRecords: JoinedPhasedMethylationRecord[]
  perCopyMethylationSampleStates: ReadonlyMap<string, PerCopyMethylationSampleState>
  methylationViewMode: MethylationViewMode
  methylationVisualGroups: MethylationVisualGroup[]
  summaryByPos: Map<number, { mean: number; std: number }>
  populationMeanByPos: Map<number, number>
  variantCircleRadius: number
  sampleColorScale: (n: number) => string
  variantColorScale: (n: number) => string
  mqtlData?: any[]
  showMqtl?: boolean
  mqtlMinLogP?: number
  sampleMetadata?: SampleMetadataMap
  hoveredVariantPosition?: number | null
  showGenealogy?: boolean
  genealogyResult?: { tree: any; leafOrder: number[] } | null
  onVisibleGroupChange?: (group: HaplotypeGroup) => void
  onVisibleDiploidSampleIdsChange?: (sampleIds: string[]) => void
  joinedMethylationSourceSampleIds?: string[]
  isClusteredView?: boolean
  expandedClusterIds?: Set<string>
  toggleClusterExpansion?: (clusterId: string) => void
  clusterThreshold?: number
  onClusterThresholdChange?: (threshold: number) => void
  isDiploidView?: boolean
  onVariantClick?: (pos: number) => void
  onClusterSelect?: (clusterId: string) => void
  selectedClusterId?: string | null
  highlightedVariantIds?: Set<string> | null
  selectedVariantPos?: number | null
  typeFilters?: Record<string, boolean>
}

export type DeckGLLollipopTrackHandle = {
  scrollToPosition: (pos: number) => void
}

const DeckGLLollipopTrack = forwardRef<DeckGLLollipopTrackHandle, DeckGLLollipopTrackProps>(function DeckGLLollipopTrack({
  displayGroups,
  viewportHeight = HAPLOTYPE_VIEWPORT_HEIGHT,
  variantMatchesSearch,
  haplotypeGroups,
  clusters,
  scientificClusters,
  start,
  stop,
  colorMode,
  showMethylation,
  methylationData,
      showPerCopyMethylation,
      perCopyMethylationRecords,
      perCopyMethylationSampleStates,
  methylationViewMode,
  methylationVisualGroups,
  summaryByPos,
  populationMeanByPos,
  variantCircleRadius,
  sampleColorScale,
  variantColorScale,
  mqtlData = [],
  showMqtl = false,
  mqtlMinLogP = 0,
  sampleMetadata,
  hoveredVariantPosition,
  showGenealogy = false,
  genealogyResult,
  onVisibleGroupChange,
      onVisibleDiploidSampleIdsChange,
  joinedMethylationSourceSampleIds = [],
  isClusteredView = false,
  expandedClusterIds,
  toggleClusterExpansion,
  clusterThreshold = 0,
  onClusterThresholdChange,
  isDiploidView = false,
  onVariantClick,
  onClusterSelect,
  selectedClusterId,
  highlightedVariantIds,
  selectedVariantPos,
  typeFilters,
}, ref) {
  const [hovered, setHovered] = useState<{
    x: number
    y: number
    object: any
    viewportId: string
  } | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollTopRef = useRef(0)
  const deckRef = useRef<any>(null)

  // Build a hash->group lookup for cluster expansion
  const groupByHash = useMemo(() => {
    const map = new Map<string, HaplotypeGroup>()
    for (const g of displayGroups) {
      map.set(String(g.hash), g)
    }
    // Also include all haplotypeGroups for cluster member resolution
    for (const g of haplotypeGroups) {
      const key = String(g.hash)
      if (!map.has(key)) map.set(key, g)
    }
    return map
  }, [displayGroups, haplotypeGroups])

  // Build mixed RowItem array: clusters + expanded groups (or diplotype rows)
  const rowItems: RowItem[] = useMemo(() => {
    if (isDiploidView) {
      return displayGroups.map(group => {
        if ('is_diplotype' in group && (group as any).is_diplotype) {
          return { type: 'diplotype' as const, group: group as unknown as DiplotypeGroup }
        }
        return { type: 'group' as const, group, isChild: false }
      })
    }
    if (!isClusteredView || !clusters || clusters.length === 0) {
      return displayGroups.map(group => ({ type: 'group' as const, group, isChild: false }))
    }
    const items: RowItem[] = []
    for (const cluster of clusters) {
      items.push({ type: 'cluster', cluster })
      if (expandedClusterIds?.has(cluster.cluster_id)) {
        for (const hash of cluster.member_group_hashes) {
          const group = groupByHash.get(hash)
          if (group) {
            items.push({ type: 'group', group, isChild: true })
          }
        }
      }
    }
    return items
  }, [isClusteredView, isDiploidView, clusters, displayGroups, expandedClusterIds, groupByHash])

  // Pre-compute population stats for each row (used for background tint + left panel bars)
  const populationStatsByRow: (PopulationStats | null)[] = useMemo(() => {
    if (!sampleMetadata || sampleMetadata.size === 0) {
      return rowItems.map(() => null)
    }
    return rowItems.map((item) => {
      if (item.type === 'group') {
        return computePopulationStats(item.group.samples, sampleMetadata)
      }
      if (item.type === 'diplotype') {
        return computePopulationStats(item.group.samples, sampleMetadata)
      }
      // Cluster: aggregate all member groups' samples
      const allSamples: { sample_id: string }[] = []
      for (const hash of item.cluster.member_group_hashes) {
        const group = groupByHash.get(hash)
        if (group) {
          for (const s of group.samples) allSamples.push(s)
        }
      }
      return computePopulationStats(allSamples, sampleMetadata)
    })
  }, [rowItems, sampleMetadata, groupByHash])

  // Compute row Y offsets and total height. The content-owned top inset keeps
  // first-row labels and hit targets inside DeckGL's clipped viewport instead
  // of relying on whitespace between the summary and haplotype tracks.
  const { rowOffsets, totalHeight } = useMemo(() => {
    const rowHeights = rowItems.map((item) => {
      if (item.type === 'cluster') {
        return clusterMethylationRowHeight(showPerCopyMethylation && isClusteredView)
      }
      if (item.type === 'diplotype') {
        let height = diploidPerCopyLayout(0, showPerCopyMethylation).rowHeight
        if (showMethylation) height += METH_TRACK_HEIGHT
        if (showMqtl && mqtlData.length > 0) {
          const allVars = [...item.group.haplotypeA.variants, ...item.group.haplotypeB.variants]
          const groupVarPositions = new Set(allVars.map((v) => v.pos))
          const hasGroupMqtl = mqtlData.some(
            (d: any) => groupVarPositions.has(d.variant_pos) && -Math.log10(d.p_value) >= mqtlMinLogP
          )
          if (hasGroupMqtl) height += MQTL_PAD + MQTL_TRACK_HEIGHT
        }
        return height
      }

      const group = item.group
      const showGroupMqtl = showMqtl && mqtlData.length > 0 && (() => {
        const groupVarPositions = new Set(group.variants.variants.map((v) => v.pos))
        return mqtlData.some(
          (d: any) => groupVarPositions.has(d.variant_pos) && -Math.log10(d.p_value) >= mqtlMinLogP
        )
      })()
      let height = item.isChild
        ? expandedClusterChildRowHeight(showPerCopyMethylation && isClusteredView)
        : VARIANT_ROW_HEIGHT
      if (showMethylation) height += METH_TRACK_HEIGHT
      if (showGroupMqtl) height += MQTL_PAD + MQTL_TRACK_HEIGHT
      return height
    })

    return stackHaplotypeRows(rowHeights)
  }, [
    rowItems,
    showMethylation,
    showPerCopyMethylation,
    isClusteredView,
    showMqtl,
    mqtlData,
    mqtlMinLogP,
  ])

  // Refs for scroll-sync (avoids stale closure in debounced callback)
  const rowOffsetsRef = useRef(rowOffsets)
  rowOffsetsRef.current = rowOffsets
  const rowItemsRef = useRef(rowItems)
  rowItemsRef.current = rowItems

  const notifyVisibleJoinedSamples = useCallback(
    (scrollTop: number) => {
      if (!onVisibleDiploidSampleIdsChange) return
      const viewportBottom = scrollTop + Math.min(viewportHeight, totalHeight || 1)
      const visibleSampleIds = new Set<string>()
      const sourceSamples = new Set(joinedMethylationSourceSampleIds)
      const originalClusters = scientificClusters ?? clusters ?? []
      rowItemsRef.current.forEach((item, index) => {
        const rowTop = rowOffsetsRef.current[index]
        const rowBottom = rowOffsetsRef.current[index + 1] ?? totalHeight
        if (rowBottom <= scrollTop || rowTop >= viewportBottom) return
        if (item.type === 'diplotype') {
          item.group.samples.forEach((sample) => {
            if (sourceSamples.has(sample.sample_id)) visibleSampleIds.add(sample.sample_id)
          })
        } else if (item.type === 'cluster') {
          const membership = resolveClusterMethylationMembership(
            scientificClusterForDisplay(item.cluster, originalClusters),
            haplotypeGroups,
            joinedMethylationSourceSampleIds
          )
          membership.requestSampleIds.forEach((sampleId) => visibleSampleIds.add(sampleId))
        }
      })
      onVisibleDiploidSampleIdsChange([...visibleSampleIds].sort((a, b) => a.localeCompare(b)))
    },
    [
      clusters,
      haplotypeGroups,
      joinedMethylationSourceSampleIds,
      onVisibleDiploidSampleIdsChange,
      scientificClusters,
      totalHeight,
      viewportHeight,
    ]
  )

  useEffect(() => {
    notifyVisibleJoinedSamples(scrollTopRef.current)
  }, [notifyVisibleJoinedSamples, rowItems, rowOffsets])

  // Debounced group-change notification (doesn't need to be instant)
  const debouncedGroupChange = useMemo(
    () => {
      let timer: ReturnType<typeof setTimeout> | null = null
      return (scrollTop: number) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          if (!onVisibleGroupChange || rowOffsetsRef.current.length === 0) return
          let visibleIdx = 0
          for (let i = 0; i < rowOffsetsRef.current.length; i++) {
            if (rowOffsetsRef.current[i] <= scrollTop) visibleIdx = i
            else break
          }
          const item = rowItemsRef.current[visibleIdx]
          if (item?.type === 'group') {
            onVisibleGroupChange(item.group)
          }
        }, 100)
      }
    },
    [onVisibleGroupChange]
  )

  // Refs for canvas dimensions — avoids stale closures in scroll handler
  const canvasWidthRef = useRef(0)
  const viewportHeightRef = useRef(0)

  // Refs for panel widths — avoids stale closures in scroll handler
  const leftPanelWidthRef = useRef(115)
  const centerWidthRef = useRef(0)
  const rightPanelWidthRef = useRef(0)

  // Imperative scroll handler — updates DeckGL camera directly, no React re-render
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = (e.target as HTMLDivElement).scrollTop
    scrollTopRef.current = newScrollTop

    // Update DeckGL camera imperatively — bypasses React entirely
    if (deckRef.current?.deck) {
      const vh = viewportHeightRef.current
      const lw = leftPanelWidthRef.current
      const cw = centerWidthRef.current
      const rw = rightPanelWidthRef.current
      const yTarget = newScrollTop + vh / 2
      const vs: Record<string, { target: [number, number, number]; zoom: number }> = {
        'left-panel': { target: [lw / 2, yTarget, 0], zoom: 0 },
        'center-panel': { target: [cw / 2, yTarget, 0], zoom: 0 },
      }
      if (rw > 0) {
        vs['right-panel'] = { target: [rw / 2, yTarget, 0], zoom: 0 }
      }
      deckRef.current.deck.setProps({ viewState: vs })
    }

    debouncedGroupChange(newScrollTop)
    notifyVisibleJoinedSamples(newScrollTop)
  }, [debouncedGroupChange, notifyVisibleJoinedSamples])

  // Expose scrollToPosition for external sync
  useImperativeHandle(ref, () => ({
    scrollToPosition(pos: number) {
      if (!scrollContainerRef.current) return
      // Find the first group row containing a variant at or after pos
      for (let i = 0; i < rowItems.length; i++) {
        const item = rowItems[i]
        if (item.type === 'group') {
          const group = item.group
          if (group.variants.variants.some((v) => v.pos >= pos) ||
              group.below_threshold.variants.some((v) => v.pos >= pos)) {
            scrollContainerRef.current.scrollTop = scrollTopForHaplotypeRow(rowOffsets[i])
            return
          }
        } else if (item.type === 'diplotype') {
          const dg = item.group
          if (dg.haplotypeA.variants.some((v) => v.pos >= pos) ||
              dg.haplotypeB.variants.some((v) => v.pos >= pos)) {
            scrollContainerRef.current.scrollTop = scrollTopForHaplotypeRow(rowOffsets[i])
            return
          }
        }
      }
    },
  }), [rowItems, rowOffsets])

  // Compute leaf Y positions for genealogy tree overlay
  const leafYPositions = useMemo(() => {
    const positions = new Map<number, number>()
    if (showGenealogy && genealogyResult) {
      rowItems.forEach((item, i) => {
        if (item.type === 'group') {
          positions.set(item.group.hash, rowOffsets[i] + ROW_CENTER_Y)
        } else if (item.type === 'cluster') {
          // Map all member group hashes to the cluster's Y so the tree
          // can render even when no clusters are expanded
          const y = clusterVariantCenter(rowOffsets[i])
          for (const h of item.cluster.member_group_hashes) {
            const hash = typeof h === 'string' ? (parseInt(h, 10) || 0) : h
            if (!positions.has(hash)) positions.set(hash, y)
          }
        }
      })
    }
    return positions
  }, [showGenealogy, genealogyResult, rowItems, rowOffsets])

  // Combined row Y positions: group hashes + cluster IDs (string keys)
  const rowYPositions = useMemo(() => {
    const positions = new Map<string, number>()
    rowItems.forEach((item, i) => {
      if (item.type === 'group') {
        positions.set(String(item.group.hash), rowOffsets[i] + ROW_CENTER_Y)
      } else if (item.type === 'cluster') {
        positions.set(item.cluster.cluster_id, clusterVariantCenter(rowOffsets[i]))
      }
    })
    return positions
  }, [rowItems, rowOffsets])

  const onHover = useCallback(
    (info: any) => {
      if (info.picked && info.object) {
        setHovered({
          x: info.x,
          y: info.y,
          object: info.object,
          viewportId: info.viewport?.id || 'center-panel',
        })
      } else {
        setHovered(null)
      }
    },
    []
  )

  // Consume RegionViewerContext directly — bypass Track component
  const { scalePosition, centerPanelWidth: contextCenterWidth, leftPanelWidth: contextLeftPanelWidth, rightPanelWidth: contextRightPanelWidth } = useContext(RegionViewerContext)
  const scrollbarGutterWidth = useStableScrollbarGutter()

  // The tree panel exists only when there is a tree to render. Otherwise the plot
  // absorbs RegionViewer's reserved right-panel width instead of leaving whitespace.
  const leftPanelWidth = contextLeftPanelWidth
  const showRightPanel = Boolean(
    showGenealogy && !isDiploidView && genealogyResult && leafYPositions.size > 0
  )
  const {
    plotWidth: centerWidth,
    rightPanelWidth,
    totalWidth,
  } = getGenealogyPanelLayout({
    leftPanelWidth,
    centerPanelWidth: contextCenterWidth,
    contextRightPanelWidth,
    showGenealogyPanel: showRightPanel,
    scrollbarGutterWidth,
  })

  // Rescale genomic positions to fit the (possibly narrower) center panel
  const scaleFactor = contextCenterWidth > 0 ? centerWidth / contextCenterWidth : 1
  const adjustedScalePosition = scaleFactor === 1
    ? scalePosition
    : (pos: number) => scalePosition(pos) * scaleFactor

  // Keep panel width refs in sync for the imperative scroll handler
  leftPanelWidthRef.current = leftPanelWidth
  centerWidthRef.current = centerWidth
  rightPanelWidthRef.current = rightPanelWidth

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{ height: viewportHeight, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', position: 'relative' }}
    >
      {/* Spacer div — establishes native scrollable height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* DeckGL canvas — multi-view, sticky to viewport */}
        <DeckGLLollipopCanvas
          displayGroups={displayGroups}
          haplotypeGroups={haplotypeGroups}
          rowItems={rowItems}
          start={start}
          stop={stop}
          colorMode={colorMode}
          showMethylation={showMethylation}
          methylationData={methylationData}
            showPerCopyMethylation={showPerCopyMethylation}
            perCopyMethylationRecords={perCopyMethylationRecords}
            perCopyMethylationSampleStates={perCopyMethylationSampleStates}
          methylationViewMode={methylationViewMode}
          methylationVisualGroups={methylationVisualGroups}
          summaryByPos={summaryByPos}
          populationMeanByPos={populationMeanByPos}
          variantCircleRadius={variantCircleRadius}
          mqtlData={mqtlData}
          showMqtl={showMqtl}
          mqtlMinLogP={mqtlMinLogP}
          sampleMetadata={sampleMetadata}
          hoveredVariantPosition={hoveredVariantPosition}
          scalePosition={adjustedScalePosition}
          width={centerWidth}
          totalHeight={totalHeight}
          viewportHeight={viewportHeight}
          totalWidth={totalWidth}
          leftPanelWidth={leftPanelWidth}
          rightPanelWidth={rightPanelWidth}
          rowOffsets={rowOffsets}
          hovered={hovered}
          onHover={onHover}
          deckRef={deckRef}
          scrollTopRef={scrollTopRef}
          canvasWidthRef={canvasWidthRef}
          viewportHeightRef={viewportHeightRef}
          sampleColorScale={sampleColorScale}
          variantColorScale={variantColorScale}
          expandedClusterIds={expandedClusterIds}
          toggleClusterExpansion={toggleClusterExpansion}
          showGenealogy={showGenealogy}
          genealogyResult={genealogyResult}
          leafYPositions={leafYPositions}
          rowYPositions={rowYPositions}
          clusterThreshold={clusterThreshold}
          onClusterThresholdChange={onClusterThresholdChange}
          clusters={clusters}
          scientificClusters={scientificClusters}
          joinedMethylationSourceSampleIds={joinedMethylationSourceSampleIds}
          isClusteredView={isClusteredView}
          populationStatsByRow={populationStatsByRow}
          isDiploidView={isDiploidView}
          onVariantClick={onVariantClick}
          onClusterSelect={onClusterSelect}
          selectedClusterId={selectedClusterId}
          highlightedVariantIds={highlightedVariantIds}
          selectedVariantPos={selectedVariantPos}
          typeFilters={typeFilters}
          variantMatchesSearch={variantMatchesSearch}
        />

        {/* Threshold drag overlay — positioned over right panel, scrolls natively */}
        {showRightPanel && (
          <ThresholdDragOverlay
            leftPanelWidth={leftPanelWidth}
            centerWidth={centerWidth}
            rightPanelWidth={rightPanelWidth}
            totalHeight={totalHeight}
            showGenealogy={showGenealogy}
            genealogyResult={genealogyResult}
            leafYPositions={leafYPositions}
            groups={displayGroups}
            sampleMetadata={sampleMetadata}
            clusterThreshold={clusterThreshold}
            onClusterThresholdChange={onClusterThresholdChange}
            clusters={clusters}
            isClusteredView={isClusteredView}
            expandedClusterIds={expandedClusterIds}
            rowYPositions={rowYPositions}
          />
        )}
      </div>
    </div>
  )
})

export default DeckGLLollipopTrack

type DeckGLCanvasProps = {
  displayGroups: HaplotypeGroup[]
  variantMatchesSearch?: VariantMatchPredicate
  haplotypeGroups: HaplotypeGroup[]
  rowItems: RowItem[]
  start: number
  stop: number
  colorMode: string
  showMethylation: boolean
  methylationData: Methylation[]
  showPerCopyMethylation: boolean
  perCopyMethylationRecords: JoinedPhasedMethylationRecord[]
  perCopyMethylationSampleStates: ReadonlyMap<string, PerCopyMethylationSampleState>
  methylationViewMode: MethylationViewMode
  methylationVisualGroups: MethylationVisualGroup[]
  summaryByPos: Map<number, { mean: number; std: number }>
  populationMeanByPos: Map<number, number>
  variantCircleRadius: number
  mqtlData: any[]
  showMqtl: boolean
  mqtlMinLogP: number
  sampleMetadata?: SampleMetadataMap
  hoveredVariantPosition?: number | null
  scalePosition: (input: number) => number
  width: number
  totalHeight: number
  viewportHeight: number
  totalWidth: number
  leftPanelWidth: number
  rightPanelWidth: number
  rowOffsets: number[]
  hovered: any
  onHover: (info: any) => void
  deckRef: React.MutableRefObject<any>
  scrollTopRef: React.MutableRefObject<number>
  canvasWidthRef: React.MutableRefObject<number>
  viewportHeightRef: React.MutableRefObject<number>
  sampleColorScale: (n: number) => string
  variantColorScale: (n: number) => string
  expandedClusterIds?: Set<string>
  toggleClusterExpansion?: (clusterId: string) => void
  showGenealogy: boolean
  genealogyResult?: { tree: any; leafOrder: number[] } | null
  leafYPositions: Map<number, number>
  rowYPositions: Map<string, number>
  clusterThreshold: number
  onClusterThresholdChange?: (threshold: number) => void
  clusters?: HaplotypeCluster[]
  scientificClusters?: HaplotypeCluster[]
  joinedMethylationSourceSampleIds: string[]
  isClusteredView: boolean
  populationStatsByRow: (PopulationStats | null)[]
  isDiploidView: boolean
  onVariantClick?: (pos: number) => void
  onClusterSelect?: (clusterId: string) => void
  selectedClusterId?: string | null
  highlightedVariantIds?: Set<string> | null
  selectedVariantPos?: number | null
  typeFilters?: Record<string, boolean>
}

/** Compute alpha for cluster consensus AF: filter < 0.5, scale 50-255 for 0.5-0.9, 255 for >= 0.9 */
function clusterAfAlpha(clusterAf: number): number {
  if (clusterAf >= 0.9) return 255
  // 0.5 <= af < 0.9 => scale 50..255
  return Math.round(50 + ((clusterAf - 0.5) / 0.4) * 205)
}

// Inner component — consumes scalePosition from context (no Track)
function DeckGLLollipopCanvas({
  displayGroups,
  variantMatchesSearch,
  haplotypeGroups,
  rowItems,
  start,
  stop,
  colorMode,
  showMethylation,
  methylationData,
  showPerCopyMethylation,
  perCopyMethylationRecords,
  perCopyMethylationSampleStates,
  methylationViewMode,
  methylationVisualGroups,
  summaryByPos,
  populationMeanByPos,
  variantCircleRadius,
  mqtlData,
  showMqtl,
  mqtlMinLogP,
  sampleMetadata,
  hoveredVariantPosition,
  scalePosition,
  width,
  totalHeight,
  viewportHeight: maximumViewportHeight,
  totalWidth,
  leftPanelWidth,
  rightPanelWidth,
  rowOffsets,
  hovered,
  onHover,
  deckRef,
  scrollTopRef,
  canvasWidthRef,
  viewportHeightRef,
  sampleColorScale,
  variantColorScale,
  expandedClusterIds,
  toggleClusterExpansion,
  showGenealogy,
  genealogyResult,
  leafYPositions,
  rowYPositions,
  clusterThreshold,
  onClusterThresholdChange,
  clusters,
  scientificClusters,
  joinedMethylationSourceSampleIds,
  isClusteredView,
  populationStatsByRow,
  isDiploidView,
  onVariantClick,
  onClusterSelect,
  selectedClusterId,
  highlightedVariantIds,
  selectedVariantPos,
  typeFilters,
}: DeckGLCanvasProps) {
  const canvasWidth = width
  const { mapper } = useContext(AccordionContext)

  const viewportHeight = Math.min(maximumViewportHeight, totalHeight || 1)

  // Visual-only filters. They do not affect UPGMA clustering or scientific denominators.
  const isVariantVisible = (variant: LRVariant): boolean =>
    passesLongReadVariantTypeFilters(variant.allele_type || '', typeFilters) &&
    (!variantMatchesSearch || variantMatchesSearch(variant))

  // Keep dimension refs in sync so the imperative scroll handler can read them
  canvasWidthRef.current = canvasWidth
  viewportHeightRef.current = viewportHeight

  // Left panel data arrays for DeckGL layers
  type LeftPanelCircle = { position: [number, number, number]; color: [number, number, number, number]; radius: number; tooltipText?: string }
  type LeftPanelText = { position: [number, number, number]; text: string; color: [number, number, number, number]; size: number; textAnchor?: 'start' | 'middle' | 'end'; tooltipText?: string }
  type LeftPanelHitbox = { position: [number, number, number]; action: string; clusterId: string }
  type LeftPanelPopBar = { polygon: [number, number][]; color: [number, number, number, number] }
  type LeftPanelSampleHoverTarget = { polygon: [number, number][]; tooltipText: string }
  type LeftPanelMemberHoverTarget = { polygon: [number, number][]; tooltipText: string }
  type LeftPanelTreeLine = { sourcePosition: [number, number, number]; targetPosition: [number, number, number] }

  const { leftPanelCircles, leftPanelTexts, leftPanelHitboxes, leftPanelPopBars, leftPanelSampleHoverTargets, leftPanelMemberHoverTargets, leftPanelTreeLines, leftPanelSampleLabels } = useMemo(() => {
    const circles: LeftPanelCircle[] = []
    const texts: LeftPanelText[] = []
    const hitboxes: LeftPanelHitbox[] = []
    const popBars: LeftPanelPopBar[] = []
    const sampleHoverTargets: LeftPanelSampleHoverTarget[] = []
    const memberHoverTargets: LeftPanelMemberHoverTarget[] = []
    const treeLines: LeftPanelTreeLine[] = []
    const sampleLabels: LeftPanelText[] = []
    // Compute total cohort size for diplotype percentage display
    const cohortTotal = isDiploidView
      ? rowItems.reduce((sum, item) => sum + (item.type === 'diplotype' ? item.group.samples.length : 0), 0)
      : 0

    for (let i = 0; i < rowItems.length; i++) {
      const item = rowItems[i]
      const y = rowOffsets[i] + ROW_CENTER_Y

      if (item.type === 'diplotype') {
        const group = item.group
        const popStats = populationStatsByRow[i]

        // Sample ID(s) above the population bar — centered, bold. A transparent
        // row target makes both the label and ancestry bar reliably hoverable.
        const sampleLabel = formatDiploidSampleLabel(group.samples)
        const ancestryTooltip = formatSampleAncestryTooltip(group.samples, sampleMetadata)
        sampleLabels.push({
          position: [35, y - DIPLOID_SAMPLE_LABEL_CENTER_OFFSET, 0],
          text: sampleLabel,
          color: getDiploidSampleLabelColor(group.samples, sampleMetadata),
          size: DIPLOID_SAMPLE_LABEL_FONT_SIZE,
          tooltipText: ancestryTooltip,
        })
        sampleHoverTargets.push({
          polygon: [
            [3, y - DIPLOID_SAMPLE_HOVER_HALF_HEIGHT],
            [67, y - DIPLOID_SAMPLE_HOVER_HALF_HEIGHT],
            [67, y + DIPLOID_SAMPLE_HOVER_HALF_HEIGHT],
            [3, y + DIPLOID_SAMPLE_HOVER_HALF_HEIGHT],
          ],
          tooltipText: ancestryTooltip,
        })

        // Subpopulation code(s) beneath the sample ID / pop bar (diploid mode).
        // Finer-grained than the superpop-colored bar (e.g. PEL, JPT) — one small
        // grey line summarizing the distinct labeled subpops of this row's samples.
        if (sampleMetadata && sampleMetadata.size > 0) {
          const subpops = Array.from(
            new Set(
              group.samples
                .map(s => sampleMetadata.get(s.sample_id)?.subpopulation)
                .filter((sp): sp is string => !!sp && sp !== 'N/A')
                .map(longReadAncestryGroupDisplayId)
            )
          )
          if (subpops.length > 0) {
            const subpopLabel = subpops.length <= 2
              ? subpops.join(', ')
              : `${subpops[0]} +${subpops.length - 1}`
            sampleLabels.push({
              position: [35, y + 13, 0],
              text: subpopLabel,
              color: [110, 110, 110, 255],
              size: 9,
              tooltipText: ancestryTooltip,
            })
          }
        }

        if (popStats && popStats.totalSamples > 0) {
          const barX = 5
          const barWidth = 60
          const barH = 10
          const barTop = y - barH / 2
          const sortedPops = Object.entries(popStats.counts).sort((a, b) => b[1] - a[1])
          let accX = barX
          for (const [pop, count] of sortedPops) {
            const w = (count / popStats.totalSamples) * barWidth
            const color = cssColorToRgba(SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A'])
            popBars.push({
              polygon: [[accX, barTop], [accX + w, barTop], [accX + w, barTop + barH], [accX, barTop + barH]],
              color,
            })
            accX += w
          }
          const pct = cohortTotal > 0 ? ((popStats.totalSamples / cohortTotal) * 100).toFixed(1) : '?'
          texts.push({
            position: [barX + barWidth + 4, y, 0],
            text: `${popStats.totalSamples} (${pct}%)`,
            color: [0, 0, 0, 255],
            size: 9,
            tooltipText: `${popStats.totalSamples} samples (${pct}% of cohort)`,
          })
          // Clinical badges after frequency
          let badgeX = barX + barWidth + 50
          if (group.is_compound_het) {
            texts.push({ position: [badgeX, y, 0], text: '[CH]', color: [220, 38, 38, 255], size: 8 })
            badgeX += 22
          }
          if (group.is_roh) {
            texts.push({ position: [badgeX, y, 0], text: '[ROH]', color: [218, 165, 32, 255], size: 8 })
          }
        } else {
          // Fallback when no population metadata: sample count + percentage + badges
          const sampleColor = cssColorToRgba(sampleColorScale(group.samples.length))
          circles.push({ position: [5, y, 0], color: sampleColor, radius: 5, tooltipText: `Samples: ${group.samples.length}` })
          const pct = cohortTotal > 0 ? ((group.samples.length / cohortTotal) * 100).toFixed(1) : '?'
          texts.push({
            position: [15, y, 0],
            text: `${group.samples.length} (${pct}%)`,
            color: [0, 0, 0, 255],
            size: 11,
            tooltipText: `${group.samples.length} samples (${pct}% of cohort)`,
          })
          let badgeX = 68
          if (group.is_compound_het) {
            texts.push({ position: [badgeX, y, 0], text: '[CH]', color: [220, 38, 38, 255], size: 9 })
            badgeX += 24
          }
          if (group.is_roh) {
            texts.push({ position: [badgeX, y, 0], text: '[ROH]', color: [218, 165, 32, 255], size: 9 })
          }
        }
      } else if (item.type === 'cluster') {
        const cluster = item.cluster
        const isExpanded = expandedClusterIds?.has(cluster.cluster_id)

        // Expand/collapse triangle — prominent so users know to click
        texts.push({
          position: [8, y, 0],
          text: isExpanded ? '\u25BC' : '\u25B6',
          color: [30, 30, 30, 255],
          size: 14,
        })

        // Hitbox for expand/collapse triangle
        hitboxes.push({
          position: [8, y, 0],
          action: 'toggle_cluster',
          clusterId: cluster.cluster_id,
        })

        // Hitbox for cluster select (over the text/bar area)
        hitboxes.push({
          position: [60, y, 0],
          action: 'select_cluster',
          clusterId: cluster.cluster_id,
        })

        {
          // Stacked population bar for cluster
          const popStats = populationStatsByRow[i]
          if (popStats && popStats.totalSamples > 0) {
            const { barX, barWidth, countX, countTextAnchor } = getCollapsedClusterLabelLayout(leftPanelWidth)
            const barH = 10
            const barTop = y - barH / 2
            const sortedPops = Object.entries(popStats.counts).sort((a, b) => b[1] - a[1])
            let accX = barX
            for (const [pop, count] of sortedPops) {
              const w = (count / popStats.totalSamples) * barWidth
              const color = cssColorToRgba(SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A'])
              popBars.push({
                polygon: [[accX, barTop], [accX + w, barTop], [accX + w, barTop + barH], [accX, barTop + barH]],
                color,
              })
              accX += w
            }
            texts.push({
              position: [countX, y, 0],
              text: String(popStats.totalSamples),
              color: [0, 0, 0, 255],
              size: 10,
              textAnchor: countTextAnchor,
              tooltipText: `${popStats.totalSamples} haplotype copies, ${cluster.member_group_hashes.length} exact groups`,
            })
          } else {
            // Fallback when no population metadata
            const sampleColor = cssColorToRgba(sampleColorScale(cluster.sample_count))
            circles.push({ position: [20, y, 0], color: sampleColor, radius: 5, tooltipText: `${cluster.sample_count} haplotype copies, ${cluster.member_group_hashes.length} exact groups` })
            texts.push({
              position: [30, y, 0],
              text: String(cluster.sample_count),
              color: [0, 0, 0, 255],
              size: 12,
              tooltipText: `${cluster.sample_count} haplotype copies, ${cluster.member_group_hashes.length} exact groups`,
            })
          }
        }
      } else {
        const group = item.group
        const popStats = populationStatsByRow[i]

        if (item.isChild) {
          // Expanded similarity-cluster members keep only their population bar.
          // A full-row hover target replaces the redundant sample/variant numbers.
          const { barX, barWidth } = getExpandedMemberBarLayout(leftPanelWidth, 24)
          const barH = 10
          const barTop = y - barH / 2

          if (popStats && popStats.totalSamples > 0) {
            const sortedPops = Object.entries(popStats.counts).sort((a, b) => b[1] - a[1])
            let accX = barX
            for (const [pop, count] of sortedPops) {
              const w = (count / popStats.totalSamples) * barWidth
              const color = cssColorToRgba(SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A'])
              popBars.push({
                polygon: [[accX, barTop], [accX + w, barTop], [accX + w, barTop + barH], [accX, barTop + barH]],
                color,
              })
              accX += w
            }
          } else {
            popBars.push({
              polygon: [[barX, barTop], [barX + barWidth, barTop], [barX + barWidth, barTop + barH], [barX, barTop + barH]],
              color: cssColorToRgba(SUPERPOPULATION_COLORS['N/A']),
            })
          }

          memberHoverTargets.push({
            polygon: [
              [barX, y - ROW_CENTER_Y],
              [leftPanelWidth, y - ROW_CENTER_Y],
              [leftPanelWidth, y + ROW_CENTER_Y],
              [barX, y + ROW_CENTER_Y],
            ],
            tooltipText: formatExpandedMemberSampleTooltip(group.samples),
          })
        } else if (popStats && popStats.totalSamples > 0) {
          // Standalone exact-match groups retain their existing numeric summaries.
          const variantCount = group.variants?.variants?.length ?? 0
          const {
            barX,
            barWidth,
            sampleCountX,
            sampleCountTextAnchor,
            variantCircleX,
            variantCountX,
            variantCountTextAnchor,
          } = getStandaloneGroupLabelLayout(
            leftPanelWidth,
            0,
            popStats.totalSamples,
            variantCount
          )
          const barH = 10
          const barTop = y - barH / 2
          const sortedPops = Object.entries(popStats.counts).sort((a, b) => b[1] - a[1])
          let accX = barX
          for (const [pop, count] of sortedPops) {
            const w = (count / popStats.totalSamples) * barWidth
            const color = cssColorToRgba(SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A'])
            popBars.push({
              polygon: [[accX, barTop], [accX + w, barTop], [accX + w, barTop + barH], [accX, barTop + barH]],
              color,
            })
            accX += w
          }
          texts.push({
            position: [sampleCountX, y, 0],
            text: String(popStats.totalSamples),
            color: [0, 0, 0, 255],
            size: 10,
            textAnchor: sampleCountTextAnchor,
            tooltipText: `Samples: ${popStats.totalSamples}`,
          })
          const variantColor = cssColorToRgba(variantColorScale(variantCount))
          circles.push({ position: [variantCircleX, y, 0], color: variantColor, radius: 4, tooltipText: `Variants: ${variantCount}` })
          texts.push({
            position: [variantCountX, y, 0],
            text: String(variantCount),
            color: [0, 0, 0, 255],
            size: 10,
            textAnchor: variantCountTextAnchor,
            tooltipText: `Variants: ${variantCount} variant sites above AF threshold`,
          })
        } else {
          // Fallback for standalone groups when no population metadata is available.
          const sampleColor = cssColorToRgba(sampleColorScale(group.samples.length))
          circles.push({ position: [5, y, 0], color: sampleColor, radius: 5, tooltipText: `Samples: ${group.samples.length}` })
          texts.push({
            position: [15, y, 0],
            text: String(group.samples.length),
            color: [0, 0, 0, 255],
            size: 12,
            tooltipText: `Samples: ${group.samples.length} haplotypes share this variant combination`,
          })

          const variantCount = group.variants?.variants?.length ?? 0
          const variantColor = cssColorToRgba(variantColorScale(variantCount))
          circles.push({ position: [50, y, 0], color: variantColor, radius: 5, tooltipText: `Variants: ${variantCount}` })
          texts.push({
            position: [60, y, 0],
            text: String(variantCount),
            color: [0, 0, 0, 255],
            size: 12,
            tooltipText: `Variants: ${variantCount} variant sites above AF threshold`,
          })
        }
      }
    }

    // Build tree connector lines for expanded clusters
    for (let i = 0; i < rowItems.length; i++) {
      const item = rowItems[i]
      if (item.type === 'cluster' && expandedClusterIds?.has(item.cluster.cluster_id)) {
        const parentY = rowOffsets[i] + ROW_CENTER_Y
        // Find last child row
        let lastChildIdx = i
        for (let j = i + 1; j < rowItems.length; j++) {
          if (rowItems[j].type === 'group' && (rowItems[j] as { type: 'group'; group: HaplotypeGroup; isChild: boolean }).isChild) {
            lastChildIdx = j
          } else {
            break
          }
        }
        if (lastChildIdx > i) {
          const lastChildY = rowOffsets[lastChildIdx] + ROW_CENTER_Y
          const lineX = 14
          // Vertical connector from parent to last child
          treeLines.push({
            sourcePosition: [lineX, parentY + 6, 0],
            targetPosition: [lineX, lastChildY, 0],
          })
          // Horizontal ticks for each child
          for (let j = i + 1; j <= lastChildIdx; j++) {
            const childY = rowOffsets[j] + ROW_CENTER_Y
            treeLines.push({
              sourcePosition: [lineX, childY, 0],
              targetPosition: [lineX + 8, childY, 0],
            })
          }
        }
      }
    }

    return { leftPanelCircles: circles, leftPanelTexts: texts, leftPanelHitboxes: hitboxes, leftPanelPopBars: popBars, leftPanelSampleHoverTargets: sampleHoverTargets, leftPanelMemberHoverTargets: memberHoverTargets, leftPanelTreeLines: treeLines, leftPanelSampleLabels: sampleLabels }
  }, [rowItems, rowOffsets, expandedClusterIds, sampleColorScale, variantColorScale, populationStatsByRow, isDiploidView, sampleMetadata, leftPanelWidth])

  // Left panel DeckGL layers
  const leftPanelLayers = useMemo(() => {
    const lpLayers: any[] = []

    // Render order: circles → pop bars → text → hitboxes (text on top of bars)
    if (leftPanelCircles.length > 0) {
      lpLayers.push(new ScatterplotLayer({
        id: 'left-panel-circles',
        data: leftPanelCircles,
        getPosition: (d: LeftPanelCircle) => d.position,
        getRadius: (d: LeftPanelCircle) => d.radius,
        getFillColor: (d: LeftPanelCircle) => d.color,
        radiusUnits: 'pixels' as const,
        pickable: true,
        onHover: onHover,
      }))
    }

    if (leftPanelPopBars.length > 0) {
      lpLayers.push(new SolidPolygonLayer({
        id: 'left-panel-pop-bars',
        data: leftPanelPopBars,
        getPolygon: (d: LeftPanelPopBar) => d.polygon,
        getFillColor: (d: LeftPanelPopBar) => d.color,
        pickable: false,
      }))
    }

    if (leftPanelSampleHoverTargets.length > 0) {
      lpLayers.push(new SolidPolygonLayer({
        id: 'left-panel-sample-hover-targets',
        data: leftPanelSampleHoverTargets,
        getPolygon: (d: LeftPanelSampleHoverTarget) => d.polygon,
        getFillColor: [0, 0, 0, 0],
        pickable: true,
        onHover,
      }))
    }

    if (leftPanelMemberHoverTargets.length > 0) {
      lpLayers.push(new SolidPolygonLayer({
        id: 'left-panel-member-hover-targets',
        data: leftPanelMemberHoverTargets,
        getPolygon: (d: LeftPanelMemberHoverTarget) => d.polygon,
        getFillColor: [0, 0, 0, 0],
        pickable: true,
        onHover,
      }))
    }

    if (leftPanelTexts.length > 0) {
      // DeckGL TextLayer default characterSet is ASCII 32-128; add Unicode triangles for expand/collapse
      const ASCII_CHARS = Array.from({length: 95}, (_, i) => String.fromCharCode(i + 32))
      const characterSet = [...ASCII_CHARS, '\u25BC', '\u25B6'] // ▼ ▶

      lpLayers.push(new TextLayer({
        id: 'left-panel-text',
        data: leftPanelTexts,
        characterSet,
        getPosition: (d: LeftPanelText) => d.position,
        getText: (d: LeftPanelText) => d.text,
        getSize: (d: LeftPanelText) => d.size,
        getColor: (d: LeftPanelText) => d.color,
        getTextAnchor: (d: LeftPanelText) => d.textAnchor || 'start',
        getAlignmentBaseline: 'center',
        fontSettings: { sdf: true, smoothing: 0.15 },
        pickable: true,
        onHover: onHover,
      }))
    }

    if (leftPanelSampleLabels.length > 0) {
      lpLayers.push(new TextLayer({
        id: 'left-panel-sample-labels',
        data: leftPanelSampleLabels,
        getPosition: (d: LeftPanelText) => d.position,
        getText: (d: LeftPanelText) => d.text,
        getSize: (d: LeftPanelText) => d.size,
        getColor: (d: LeftPanelText) => d.color,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontWeight: 700,
        fontSettings: { sdf: true, smoothing: 0.15 },
        pickable: true,
        onHover,
      }))
    }

    if (leftPanelTreeLines.length > 0) {
      lpLayers.push(new LineLayer({
        id: 'left-panel-tree-lines',
        data: leftPanelTreeLines,
        getSourcePosition: (d: LeftPanelTreeLine) => d.sourcePosition,
        getTargetPosition: (d: LeftPanelTreeLine) => d.targetPosition,
        getColor: [160, 160, 180, 200],
        getWidth: 1.5,
        widthUnits: 'pixels' as const,
        pickable: false,
      }))
    }

    if (leftPanelHitboxes.length > 0) {
      lpLayers.push(new ScatterplotLayer({
        id: 'left-panel-hitboxes',
        data: leftPanelHitboxes,
        getPosition: (d: LeftPanelHitbox) => d.position,
        getRadius: 12,
        getFillColor: [0, 0, 0, 0],
        radiusUnits: 'pixels' as const,
        pickable: true,
        onClick: (info: any) => {
          if (info.object?.action === 'toggle_cluster' && toggleClusterExpansion) {
            toggleClusterExpansion(info.object.clusterId)
          } else if (info.object?.action === 'select_cluster' && onClusterSelect) {
            onClusterSelect(info.object.clusterId)
          }
        },
      }))
    }

    return lpLayers
  }, [leftPanelCircles, leftPanelTexts, leftPanelHitboxes, leftPanelPopBars, leftPanelSampleHoverTargets, leftPanelMemberHoverTargets, leftPanelTreeLines, leftPanelSampleLabels, toggleClusterExpansion, onClusterSelect, onHover])

  // Genealogy tree layout — pure data arrays for DeckGL
  const treeLayout = useMemo((): TreeLayout | null => {
    if (!showGenealogy || !genealogyResult || leafYPositions.size === 0) return null
    return buildGenealogyTreeLayout({
      tree: genealogyResult.tree,
      leafYPositions,
      panelWidth: rightPanelWidth,
      groups: displayGroups,
      sampleMetadata,
      clusterThreshold,
      isClusteredView,
      clusters,
      expandedClusterIds,
      rowYPositions,
    })
  }, [showGenealogy, genealogyResult, leafYPositions, rightPanelWidth, displayGroups, sampleMetadata, clusterThreshold, isClusteredView, clusters, expandedClusterIds, rowYPositions])

  // Tree DeckGL layers for right panel
  const treeLayers = useMemo(() => {
    if (!treeLayout) return []
    const result: any[] = []

    if (treeLayout.branches.length > 0) {
      result.push(new LineLayer({
        id: 'tree-branches',
        data: treeLayout.branches,
        getSourcePosition: (d: TreeBranch) => d.sourcePosition,
        getTargetPosition: (d: TreeBranch) => d.targetPosition,
        getColor: (d: TreeBranch) => d.color,
        getWidth: 1,
        widthUnits: 'pixels' as const,
        pickable: false,
      }))
    }

    if (treeLayout.pieWedges.length > 0) {
      result.push(new SolidPolygonLayer({
        id: 'tree-node-ancestry-pies',
        data: treeLayout.pieWedges,
        getPolygon: (d: TreePieWedge) => d.polygon,
        getFillColor: (d: TreePieWedge) => d.color,
        stroked: false,
        pickable: false,
      }))
    }

    if (treeLayout.nodes.length > 0) {
      // Transparent fill preserves the original circular hover/click target while
      // the non-pickable polygons beneath it provide ancestry slices.
      result.push(new ScatterplotLayer({
        id: 'tree-nodes',
        data: treeLayout.nodes,
        getPosition: (d: TreeNodePoint) => d.position,
        getRadius: (d: TreeNodePoint) => d.radius,
        getFillColor: [0, 0, 0, 0],
        getLineColor: [51, 51, 51, 128],
        getLineWidth: 0.5,
        lineWidthUnits: 'pixels' as const,
        stroked: true,
        radiusUnits: 'pixels' as const,
        pickable: true,
        onClick: (info: any) => {
          if (info.object?.isThresholdNode && onClusterThresholdChange && treeLayout) {
            onClusterThresholdChange(info.object.distance / treeLayout.maxDistance)
          }
        },
        onHover: onHover,
      }))
    }

    if (treeLayout.clusterMarkers.length > 0) {
      result.push(new TextLayer({
        id: 'tree-cluster-markers',
        data: treeLayout.clusterMarkers,
        getPosition: (d: TreeClusterMarker) => d.position,
        getText: (d: TreeClusterMarker) => d.text,
        getSize: (d: TreeClusterMarker) => d.size,
        getColor: (d: TreeClusterMarker) => d.color,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontSettings: { sdf: true, smoothing: 0.15 },
        pickable: true,
        onClick: (info: any) => {
          if (info.object?.isClusterRoot && toggleClusterExpansion) {
            toggleClusterExpansion(info.object.clusterId)
          }
        },
        onHover: onHover,
      }))
    }

    // Threshold cut line
    if (treeLayout.thresholdX !== null) {
      result.push(new LineLayer({
        id: 'tree-threshold-line',
        data: [{ x: treeLayout.thresholdX, yTop: 0, yBottom: totalHeight }],
        getSourcePosition: (d: any) => [d.x, d.yTop, 0],
        getTargetPosition: (d: any) => [d.x, d.yBottom, 0],
        getColor: [217, 83, 79, 179], // #d9534f at ~70% opacity
        getWidth: 1.5,
        widthUnits: 'pixels' as const,
        pickable: false,
      }))
    }

    return result
  }, [treeLayout, totalHeight, onClusterThresholdChange, toggleClusterExpansion, onHover])

  // Pre-aggregate locus counts for haplotype_count color mode
  const locusCounts = useMemo(() => {
    if (colorMode !== 'haplotype_count') return new Map<string, number>()
    return countVariantLociAcrossHaplotypeRows(haplotypeGroups)
  }, [colorMode, haplotypeGroups])

  // Resolve every displayed row through the unfiltered UPGMA clusters and exact
  // (sample, VCF strand) members. Raw joined records are indexed once per evidence update;
  // changing the cluster threshold only recomputes these small summaries.
  const clusterMethylationRecordIndex = useMemo(
    () => indexJoinedMethylationByCopy(perCopyMethylationRecords),
    [perCopyMethylationRecords]
  )
  const clusterMethylationById = useMemo(() => {
    const result = new Map<string, ClusterMethylationSummary>()
    if (!showPerCopyMethylation || !isClusteredView) return result
    const originals = scientificClusters ?? clusters ?? []
    rowItems.forEach((item) => {
      if (item.type !== 'cluster') return
      const scientificCluster = scientificClusterForDisplay(item.cluster, originals)
      const membership = resolveClusterMethylationMembership(
        scientificCluster,
        haplotypeGroups,
        joinedMethylationSourceSampleIds
      )
      result.set(
        item.cluster.cluster_id,
        summarizeClusterMethylation(
          membership,
          recordsForClusterMembership(membership, clusterMethylationRecordIndex),
          perCopyMethylationSampleStates,
          methylationVisualGroups,
          populationMeanByPos
        )
      )
    })
    return result
  }, [
    clusterMethylationRecordIndex,
    clusters,
    haplotypeGroups,
    isClusteredView,
    joinedMethylationSourceSampleIds,
    methylationVisualGroups,
    perCopyMethylationSampleStates,
    rowItems,
    populationMeanByPos,
    scientificClusters,
    showPerCopyMethylation,
  ])
  const exactGroupMethylationByHash = useMemo(() => {
    const result = new Map<string, ClusterMethylationSummary>()
    if (!showPerCopyMethylation || !isClusteredView) return result
    rowItems.forEach((item) => {
      if (item.type !== 'group' || !item.isChild) return
      const membership = resolveExactGroupMethylationMembership(
        item.group,
        joinedMethylationSourceSampleIds
      )
      result.set(
        String(item.group.hash),
        summarizeClusterMethylation(
          membership,
          recordsForClusterMembership(membership, clusterMethylationRecordIndex),
          perCopyMethylationSampleStates,
          methylationVisualGroups,
          populationMeanByPos
        )
      )
    })
    return result
  }, [
    clusterMethylationRecordIndex,
    isClusteredView,
    joinedMethylationSourceSampleIds,
    methylationVisualGroups,
    perCopyMethylationSampleStates,
    populationMeanByPos,
    rowItems,
    showPerCopyMethylation,
  ])

  // Consolidated global DeckGL layers — one layer per data type for performance at 500+ rows
  const layers = useMemo(() => {
    console.time('[perf] DeckGL global layers')
    const lod = getLodVisibility(stop - start)
    const isVariantVisibleAtLod = (variant: LRVariant): boolean =>
      passesHaplotypeVariantTypeAndSnvLodFilters(
        variant.allele_type || '', typeFilters, lod.showSnvs
      ) && (!variantMatchesSearch || variantMatchesSearch(variant))

    // Global data arrays — populated across all rows, rendered as single layers
    const allBgRects: BackgroundRect[] = []
    const allVariantPoints: VariantPoint[] = []
    const allBelowThresholdPoints: VariantPoint[] = []
    const allDeletionLines: StemLine[] = []
    const allSpanningRects: SpanningRect[] = []
    const allMethPoints: MethPoint[] = []
    const allMethGroups: MethGroupMark[] = []
    const allMethStatusLabels: MethStatusLabel[] = []
    const allClusterMethPoints: ClusterMethPoint[] = []
    const allClusterMethGroups: ClusterMethGroupMark[] = []
    const allClusterPopulationPoints: ClusterPopulationPoint[] = []
    const allClusterPopulationGroups: ClusterPopulationGroupMark[] = []
    const allMqtlArcs: MqtlArc[] = []
    const allCenterLines: { groupStart: number; groupStop: number; y: number }[] = []
    const allDashedSeparators: { groupStart: number; groupStop: number; y: number }[] = []
    const allChArcs: { x1: number; y1: number; x2: number; y2: number }[] = []
    const allRohWaves: { startPos: number; stopPos: number; y: number }[] = []
    const allClusterBoxes: { yTop: number; yBottom: number }[] = []
    const allPhantomBars: PhantomBar[] = []
    const allPhantomConnectors: PhantomConnector[] = []
    const allPhantomLabels: PhantomLabel[] = []
    const allInsertionTriangles: VariantPoint[] = []
    const allTrRects: VariantPoint[] = []

    // Accordion phantom region setup — skip for very large regions where
    // phantom bars would be sub-pixel and the iteration cost is prohibitive
    const regionSize = stop - start
    const accordionActive = !!(mapper && mapper.hasPhantomRegions && regionSize < 500_000)
    const phantomLoci = accordionActive ? mapper!.getPhantomLoci() : []
    const phantomLociByPos = new Map<number, PhantomLocus>()
    if (accordionActive) {
      for (const locus of phantomLoci) {
        if (locus.maxPhantomLength > 0) {
          // Map exact position and ±2bp neighbors (matching mapper's clustering threshold)
          for (let d = -2; d <= 2; d++) {
            phantomLociByPos.set(locus.genomicPos + d, locus)
          }
        }
      }
    }
    const pxPerSynthUnit = accordionActive
      ? (scalePosition(stop) - scalePosition(start)) / mapper!.totalVisualLength
      : 0

    /** Try to create a phantom bar for an accordion-eligible variant. Returns true if handled. */
    const tryPhantomBar = (
      variant: Variant,
      centerY: number,
      color: [number, number, number, number],
      phantomCarriers: Map<number, number>
    ): boolean => {
      if (!accordionActive) return false
      const alleleType = (variant.allele_type || '').toLowerCase()
      if (!ACCORDION_ALLELE_TYPES.has(alleleType)) return false

      const locus = phantomLociByPos.get(variant.pos)
      if (!locus || locus.maxPhantomLength <= 0) return false

      // TRVs and insertions always get phantom bars if a locus exists — their phantom gap
      // was created for this variant. Non-insertion types need >= 50bp to qualify.
      const isIns = INSERTION_TYPES.has(alleleType)
      if (alleleType !== 'trv' && !isIns && Math.abs(variant.allele_length || 0) < 50) return false

      const effectiveLength = Math.min(Math.max(Math.abs(variant.allele_length || 0), 1), locus.maxPhantomLength)
      const accentColor = cssColorToRgba(ALLELE_TYPE_COLORS[alleleType] || '#888888')

      allPhantomBars.push({
        genomicPos: variant.pos,
        endOffset: effectiveLength,
        centerY,
        color,
        accentColor,
        variant,
      })

      // Mechanism label when bar is wide enough (> 40px)
      const pxWidth = effectiveLength * pxPerSynthUnit
      if (pxWidth > 40) {
        let labelText: string | null = null
        if (alleleType === 'alu_ins') labelText = 'ALU'
        else if (alleleType === 'sva_ins') labelText = 'SVA'
        else if (alleleType === 'numt') labelText = 'chrM'
        else if (alleleType === 'trv' && variant.tr_motifs) labelText = variant.tr_motifs
        if (labelText) {
          allPhantomLabels.push({
            text: labelText,
            genomicPos: variant.pos,
            endOffset: effectiveLength,
            centerY,
          })
        }
      }

      // Track carrier at this locus for connector logic (use max for multi-allelic)
      const existing = phantomCarriers.get(locus.genomicPos) || 0
      phantomCarriers.set(locus.genomicPos, Math.max(existing, effectiveLength))

      return true
    }

    /** Add connectors for phantom loci not (fully) covered by carriers at this row/strand */
    const addPhantomConnectors = (centerY: number, phantomCarriers: Map<number, number>) => {
      if (!accordionActive) return
      for (const locus of phantomLoci) {
        if (locus.maxPhantomLength <= 0) continue
        const carrierLen = phantomCarriers.get(locus.genomicPos)
        if (carrierLen === undefined) {
          // No carrier at this locus — full connector
          allPhantomConnectors.push({
            genomicPos: locus.genomicPos,
            startOffset: 0,
            endOffset: locus.maxPhantomLength,
            centerY,
          })
        } else if (carrierLen < locus.maxPhantomLength) {
          // Carrier shorter than max gap — partial connector after bar
          allPhantomConnectors.push({
            genomicPos: locus.genomicPos,
            startOffset: carrierLen,
            endOffset: locus.maxPhantomLength,
            centerY,
          })
        }
      }
    }

    const addInlineClusterMethylationBand = (
      summary: ClusterMethylationSummary | undefined,
      bandTop: number,
      methylationScope: InlineMethylationScope
    ) => {
      const methylationY = scaleLinear()
        .domain([0, 100])
        .range([CLUSTER_METHYLATION_BAND_HEIGHT - 4, 4])
      const display = summary
        ? clusterMethylationDisplay(summary, methylationViewMode)
        : { sites: [], groups: [] }

      // Every parent and exact child uses the same comparator and visual-group boundaries.
      if (methylationViewMode !== 'groups') {
        populationMeanByPos.forEach((populationMean, position) => {
          allClusterPopulationPoints.push({ position, y: bandTop + methylationY(populationMean) })
        })
      }
      if (methylationViewMode !== 'sites') {
        methylationVisualGroups.forEach((group) => {
          allClusterPopulationGroups.push({
            start: group.start,
            stop: group.stop,
            y: bandTop + methylationY(group.medianPopulationMean),
          })
        })
      }

      if (summary?.readiness === 'ready') {
        display.groups.forEach((clusterGroup) => {
          allClusterMethGroups.push({
            start: clusterGroup.group.start,
            stop: clusterGroup.group.stop,
            y: bandTop + methylationY(clusterGroup.medianSiteMean),
            color: [113, 61, 145, 220],
            clusterGroup,
            methylationScope,
          })
        })
        display.sites.forEach((clusterSite) => {
          allClusterMethPoints.push({
            position: clusterSite.pos1,
            y: bandTop + methylationY(clusterSite.meanMethylation),
            color: [113, 61, 145, 255],
            clusterSite,
            methylationScope,
          })
        })
      }

      if (!summary || summary.readiness !== 'ready' || (summary.sites.length === 0 && summary.groups.length === 0)) {
        let label = 'Methylation: loading'
        if (summary?.readiness === 'error') label = 'Methylation: error'
        else if (summary?.readiness === 'ready') {
          label =
            summary.sourceEligibleCopyCount === 0 || summary.availableCopyCount === 0
              ? 'Methylation: unavailable'
              : 'Methylation: no CpGs'
        }
        allMethStatusLabels.push({
          position: [scalePosition(start) + 4, bandTop + CLUSTER_METHYLATION_BAND_HEIGHT / 2, 0],
          text: label,
          color: summary?.readiness === 'error' ? [180, 50, 50, 210] : [105, 105, 105, 190],
        })
      }
    }


    for (let gi = 0; gi < rowItems.length; gi++) {
      const item = rowItems[gi]
      const rowY = rowOffsets[gi]
      const diploidLayout = item.type === 'diplotype'
        ? diploidPerCopyLayout(rowY, showPerCopyMethylation)
        : null

      allBgRects.push(...getRowBackgroundRects<HaplotypeGroup, DiplotypeGroup>(
        item, rowY, start, stop,
        diploidLayout
          ? diploidLayout.variantBBaseline - diploidLayout.variantABaseline
          : VARIANT_ROW_HEIGHT
      ))

      if (item.type === 'diplotype') {
        const dg = item.group
        const layout = diploidLayout!
        const yTop = layout.variantABaseline
        const yBottom = layout.variantBBaseline

        // Center lines for both strands
        allCenterLines.push({ groupStart: dg.start, groupStop: dg.stop, y: yTop })
        allCenterLines.push({ groupStart: dg.start, groupStop: dg.stop, y: yBottom })

        // The ROH squiggle remains variant-bounded; only the background spans the region.
        if (dg.is_roh) {
          allRohWaves.push({
            startPos: dg.start,
            stopPos: dg.stop,
            y: layout.relationshipMarkY,
          })
        }

        // Helper to push variants for a strand (opacity 0-1 for ghosting ROH strand B)
        const pushStrandVariants = (variants: LRVariant[], baseline: number, opacity: number = 1): Map<number, number> => {
          const phantomCarriers = new Map<number, number>()
          for (const variant of variants) {
            const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
            if (!isVariantVisibleAtLod(variant)) continue
            const isLarge = getVariantSpan(variant) >= 50
            if ((cat === 'insertion' || cat === 'deletion') && !isLarge && !lod.showSmallIndels) continue

            const baseColor = getVariantColor(
              variant, colorMode, start, stop, sampleMetadata, undefined,
              locusCounts.get(variant.variant_id) || 0, haplotypeGroups.length || 1
            )
            const color: [number, number, number, number] = opacity < 1
              ? [baseColor[0], baseColor[1], baseColor[2], Math.round(baseColor[3] * opacity)]
              : baseColor

            // Accordion phantom bar for eligible insertions/TRs
            if (tryPhantomBar(variant, baseline, color, phantomCarriers)) continue

            if ((cat === 'deletion' || cat === 'sv') && isLarge && !INSERTION_TYPES.has((variant.allele_type || '').toLowerCase())) {
              const endPos = variant.end ?? (variant.pos + Math.abs(variant.allele_length || 0))
              allSpanningRects.push({ start: variant.pos, end: endPos, rowY: baseline - ROW_CENTER_Y, color, variant, groupHash: dg.hash })
            } else if (cat === 'deletion') {
              const thickness = Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)
              allDeletionLines.push({ position: variant.pos, yTop: baseline - 7.5, yBottom: baseline + 7.5, color, width: thickness, variant })
            } else if (cat === 'insertion' || (cat === 'sv' && INSERTION_TYPES.has((variant.allele_type || '').toLowerCase()))) {
              allInsertionTriangles.push({ position: variant.pos, y: baseline, radius: variantCircleRadius, color, variant, groupHash: dg.hash })
            } else if (cat === 'tr') {
              const trSpan = getVariantSpan(variant)
              if (trSpan >= 50) {
                const endPos = variant.end ?? (variant.pos + trSpan)
                allSpanningRects.push({ start: variant.pos, end: endPos, rowY: baseline - ROW_CENTER_Y, color, variant, groupHash: dg.hash })
              } else {
                allTrRects.push({ position: variant.pos, y: baseline, radius: variantCircleRadius, color, variant, groupHash: dg.hash })
              }
            } else {
              allVariantPoints.push({ position: variant.pos, y: baseline, radius: variantCircleRadius, color, variant, groupHash: dg.hash })
            }
          }
          return phantomCarriers
        }

        // Strand A at full opacity, strand B ghosted if ROH
        const carriersA = pushStrandVariants(dg.haplotypeA.variants, yTop)
        addPhantomConnectors(yTop, carriersA)
        const carriersB = pushStrandVariants(dg.haplotypeB.variants, yBottom, dg.is_roh ? 0.2 : 1)
        addPhantomConnectors(yBottom, carriersB)

        // Below-threshold variants for both strands
        const pushBelowThreshold = (variants: LRVariant[], baseline: number) => {
          for (const variant of variants) {
            const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
            if (!isVariantVisible(variant)) continue
            const span = getVariantSpan(variant)
            const isLargeBt = span >= 50

            if ((cat === 'deletion' || cat === 'sv') && isLargeBt && !INSERTION_TYPES.has((variant.allele_type || '').toLowerCase())) {
              const endPos = variant.end ?? (variant.pos + span)
              allSpanningRects.push({ start: variant.pos, end: endPos, rowY: baseline - ROW_CENTER_Y, color: [128, 128, 128, 100], variant, groupHash: dg.hash })
            } else if (cat === 'deletion') {
              allDeletionLines.push({ position: variant.pos, yTop: baseline - 4.5, yBottom: baseline + 4.5, color: [128, 128, 128, 100], width: 1, variant })
            } else {
              const point: VariantPoint = { position: variant.pos, y: baseline, radius: 1.5, color: [128, 128, 128, 100], variant, groupHash: dg.hash }
              if (accordionActive) {
                if (cat === 'insertion' || cat === 'tr' || cat === 'sv') {
                  const locus = phantomLociByPos.get(variant.pos)
                  if (locus && locus.maxPhantomLength > 0) {
                    const halfLen = Math.min(Math.abs(variant.allele_length || 0) / 2, locus.maxPhantomLength)
                    point.pxX = scalePosition(variant.pos) + halfLen * pxPerSynthUnit
                  }
                }
              }
              allBelowThresholdPoints.push(point)
            }
          }
        }
        pushBelowThreshold(dg.below_thresholdA.variants, yTop)
        pushBelowThreshold(dg.below_thresholdB.variants, yBottom)

        // Compound het arcs
        if (dg.is_compound_het && dg.compound_het_pairs.length > 0) {
          for (const pair of dg.compound_het_pairs) {
            allChArcs.push({ x1: pair.variantA.pos, y1: yTop, x2: pair.variantB.pos, y2: yBottom })
          }
        }

        const groupSampleIds = new Set(dg.samples.map((sample) => sample.sample_id))

        // Map each sample through canonical A/B before calculating any CpG mean.
        if (
          showPerCopyMethylation &&
          layout.methylationABandTop !== null &&
          layout.methylationBBandTop !== null
        ) {
          const joinedForGroup = perCopyMethylationRecords.filter((record) =>
            groupSampleIds.has(record.sample)
          )
          // A scientific row is atomic: do not aggregate any completed subset while
          // another represented sample is absent, loading, or failed.
          const { readiness, points: perCopy } = perCopyMethylationForReadyRow(
            joinedForGroup,
            dg.samples,
            perCopyMethylationSampleStates
          )
          const perCopyYScale = scaleLinear()
            .domain([0, 100])
            .range([PER_COPY_METHYLATION_BAND_HEIGHT - 4, 4])
          const canonicalObservations =
            readiness === 'ready'
              ? observationsByCanonicalCopy(joinedForGroup, dg.samples)
              : { A: [], B: [] }
          const copyDisplays = {
            A: buildMethylationLayerDisplay(
              canonicalObservations.A,
              methylationVisualGroups,
              methylationViewMode,
              'copy'
            ),
            B: buildMethylationLayerDisplay(
              canonicalObservations.B,
              methylationVisualGroups,
              methylationViewMode,
              'copy'
            ),
          }
          const evidence = (value: MethylationLayerGroupSummary | undefined) =>
            value
              ? {
                  medianDepth: value.medianPerCpgCoverage,
                  representedSites: value.representedSites,
                  totalSites: value.group.siteCount,
                  sampleCount: value.contributingSampleCount,
                }
              : null
          const addCopyBand = (
            copy: 'A' | 'B',
            bandTop: number,
            points: PerCopyMethylationPoint[]
          ) => {
            const status =
              points.length === 0
                ? perCopyEmptyLabel([...groupSampleIds], perCopyMethylationSampleStates)
                : null
            allMethStatusLabels.push({
              position: [
                scalePosition(start) + 4,
                bandTop + PER_COPY_METHYLATION_BAND_HEIGHT / 2,
                0,
              ],
              text: status ? `${copy}: ${status}` : `${copy} methylation`,
              color: status === 'error' ? [180, 50, 50, 210] : [105, 105, 105, 190],
            })
            if (points.length === 0) return
            const color: [number, number, number, number] =
              copy === 'A' ? [42, 111, 151, 255] : [161, 85, 34, 255]
            const pointsByCoordinate = new Map(
              points.map((point) => [`${point.pos1}:${point.pos2}`, point])
            )
            const otherPoints = copy === 'A' ? perCopy.B : perCopy.A
            const otherByCoordinate = new Map(
              otherPoints.map((point) => [`${point.pos1}:${point.pos2}`, point])
            )
            const otherSites = copy === 'A' ? copyDisplays.B.sites : copyDisplays.A.sites
            const otherSitesByCoordinate = new Map(
              otherSites.map((site) => [`${site.pos1}:${site.pos2}`, site])
            )
            copyDisplays[copy].sites.forEach((site) => {
              const coordinate = `${site.pos1}:${site.pos2}`
              const point = pointsByCoordinate.get(coordinate)
              if (!point) return
              const counterpart = otherSitesByCoordinate.get(coordinate)
              const counterpartMetadata = otherByCoordinate.get(coordinate)
              const siteEvidence = (value: MethylationLayerSiteSummary | undefined) =>
                value
                  ? {
                      medianDepth: value.meanCoverage,
                      representedSites: 1,
                      totalSites: 1,
                      sampleCount: value.contributingSampleCount,
                    }
                  : null
              const copySupport =
                copy === 'A'
                  ? classifyCopySupport(siteEvidence(site), siteEvidence(counterpart))
                  : classifyCopySupport(siteEvidence(counterpart), siteEvidence(site))
              allMethPoints.push({
                position: site.pos1,
                y: bandTop + perCopyYScale(site.weightedMeanMethylation),
                color,
                layerSite: site,
                copy,
                perCopyMetadata: point,
                counterpart,
                counterpartMetadata,
                copySupport,
              })
            })
            const otherGroups = copy === 'A' ? copyDisplays.B.groups : copyDisplays.A.groups
            copyDisplays[copy].groups.forEach((summary) => {
              const counterpart = otherGroups.find(
                (candidate) => candidate.group.key === summary.group.key
              )
              const copySupport =
                copy === 'A'
                  ? classifyCopySupport(evidence(summary), evidence(counterpart))
                  : classifyCopySupport(evidence(counterpart), evidence(summary))
              allMethGroups.push({
                start: summary.group.start,
                stop: summary.group.stop,
                y: bandTop + perCopyYScale(summary.weightedMeanMethylation!),
                color,
                summary,
                copy,
                counterpart,
                copySupport,
              })
            })
          }
          addCopyBand('A', layout.methylationABandTop, perCopy.A)
          addCopyBand('B', layout.methylationBBandTop, perCopy.B)
        }

        // Sample-total methylation remains a separate, explicitly enabled layer.
        if (showMethylation) {
          const methSampleData = methylationData.filter((d) => groupSampleIds.has(d.sample))
          if (methSampleData.length > 0) {
            const display = buildMethylationLayerDisplay(
              methSampleData,
              methylationVisualGroups,
              methylationViewMode
            )
            const methBaseY = layout.afterCopies
            const methYScale = scaleLinear().domain([0, 100]).range([METH_TRACK_HEIGHT - 4, 4])
            display.groups.forEach((summary) => {
              allMethGroups.push({
                start: summary.group.start,
                stop: summary.group.stop,
                y: methBaseY + methYScale(summary.weightedMeanMethylation!),
                color: [74, 85, 104, 210],
                summary,
              })
            })
            display.sites.forEach((site) => {
              allMethPoints.push({
                position: site.pos1,
                y: methBaseY + methYScale(site.weightedMeanMethylation),
                color: [74, 85, 104, 255],
                layerSite: site,
              })
            })
          }
        }

        // mQTL arcs
        if (showMqtl && mqtlData.length > 0) {
          const allVars = [...dg.haplotypeA.variants, ...dg.haplotypeB.variants]
          const groupVarPositions = new Set(allVars.map((v) => v.pos))
          const groupMqtl = mqtlData.filter(
            (d: any) => groupVarPositions.has(d.variant_pos) && -Math.log10(d.p_value) >= (mqtlMinLogP || 0)
          )
          if (groupMqtl.length > 0) {
            const mqtlBaseY = layout.afterCopies + (showMethylation ? METH_TRACK_HEIGHT : 0) + MQTL_PAD + MQTL_TRACK_HEIGHT
            const maxLogP = Math.max(2, ...groupMqtl.map((d: any) => -Math.log10(d.p_value)))
            const hScale = scaleLinear().domain([0, maxLogP]).range([0, MQTL_TRACK_HEIGHT - 4])
            for (const d of groupMqtl) {
              const logP = -Math.log10(d.p_value)
              const arcH = hScale(logP)
              const isPositive = d.effect_size > 0
              const opacity = Math.min(204, Math.round(51 + (logP / maxLogP) * 153))
              allMqtlArcs.push({
                variantPos: d.variant_pos, cpgPos: d.cpg_pos, arcHeight: arcH, baseY: mqtlBaseY,
                color: isPositive ? [220, 38, 38, opacity] : [37, 99, 235, opacity], width: 1.5,
              })
            }
          }
        }

        continue // Skip to next row — diplotype fully handled
      }

      // Center line data for haploid/cluster rows
      const centerLineStart = item.type === 'cluster' ? start : item.group.start
      const centerLineStop = item.type === 'cluster' ? stop : item.group.stop
      allCenterLines.push({ groupStart: centerLineStart, groupStop: centerLineStop, y: rowY + ROW_CENTER_Y })

      if (item.type === 'cluster') {
        const cluster = item.cluster

        const clusterPhantomCarriers = new Map<number, number>()
        for (const cv of cluster.consensus_variants) {
          if (cv.cluster_af < 0.5) continue
          const variant = cv.variant
          const alpha = clusterAfAlpha(cv.cluster_af)
          const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
          if (!isVariantVisibleAtLod(variant)) continue
          const isLarge = getVariantSpan(variant) >= 50
          if ((cat === 'insertion' || cat === 'deletion') && !isLarge && !lod.showSmallIndels) continue

          const baseColor = getVariantColor(
            variant, colorMode, start, stop, sampleMetadata, undefined,
            locusCounts.get(variant.variant_id) || 0, haplotypeGroups.length || 1
          )
          const color: [number, number, number, number] = [baseColor[0], baseColor[1], baseColor[2], alpha]

          // Accordion phantom bar for eligible insertions/TRs
          if (tryPhantomBar(variant, rowY + ROW_CENTER_Y, color, clusterPhantomCarriers)) continue

          if ((cat === 'deletion' || cat === 'sv') && isLarge && !INSERTION_TYPES.has((variant.allele_type || '').toLowerCase())) {
            const endPos = variant.end ?? (variant.pos + Math.abs(variant.allele_length || 0))
            allSpanningRects.push({ start: variant.pos, end: endPos, rowY, color, variant, groupHash: 0 })
          } else if (cat === 'deletion') {
            const thickness = Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)
            allDeletionLines.push({ position: variant.pos, yTop: rowY + 5, yBottom: rowY + 20, color, width: thickness, variant })
          } else if (cat === 'insertion' || (cat === 'sv' && INSERTION_TYPES.has((variant.allele_type || '').toLowerCase()))) {
            allInsertionTriangles.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: 0 })
          } else if (cat === 'tr') {
            const trSpan = getVariantSpan(variant)
            if (trSpan >= 50) {
              const endPos = variant.end ?? (variant.pos + trSpan)
              allSpanningRects.push({ start: variant.pos, end: endPos, rowY, color, variant, groupHash: 0 })
            } else {
              allTrRects.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: 0 })
            }
          } else {
            allVariantPoints.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: 0 })
          }
        }
        addPhantomConnectors(rowY + ROW_CENTER_Y, clusterPhantomCarriers)

        if (showPerCopyMethylation && isClusteredView) {
          addInlineClusterMethylationBand(
            clusterMethylationById.get(cluster.cluster_id),
            clusterMethylationBandTop(rowY),
            'cluster'
          )
        }
      } else {
        const group = item.group

        for (const variant of group.below_threshold.variants) {
          const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
          if (!isVariantVisible(variant)) continue
          const span = getVariantSpan(variant)
          const isLargeBt = span >= 50

          if ((cat === 'deletion' || cat === 'sv') && isLargeBt && !INSERTION_TYPES.has((variant.allele_type || '').toLowerCase())) {
            const endPos = variant.end ?? (variant.pos + span)
            allSpanningRects.push({ start: variant.pos, end: endPos, rowY, color: [128, 128, 128, 100], variant, groupHash: group.hash })
          } else if (cat === 'deletion') {
            allDeletionLines.push({ position: variant.pos, yTop: rowY + 8, yBottom: rowY + 17, color: [128, 128, 128, 100], width: 1, variant })
          } else {
            const point: VariantPoint = { position: variant.pos, y: rowY + ROW_CENTER_Y, radius: 1.5, color: [128, 128, 128, 100], variant, groupHash: group.hash }
            if (accordionActive) {
              if (cat === 'insertion' || cat === 'tr' || cat === 'sv') {
                const locus = phantomLociByPos.get(variant.pos)
                if (locus && locus.maxPhantomLength > 0) {
                  const halfLen = Math.min(Math.abs(variant.allele_length || 0) / 2, locus.maxPhantomLength)
                  point.pxX = scalePosition(variant.pos) + halfLen * pxPerSynthUnit
                }
              }
            }
            allBelowThresholdPoints.push(point)
          }
        }

        const groupPhantomCarriers = new Map<number, number>()
        for (const variant of group.variants.variants) {
          const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
          if (!isVariantVisibleAtLod(variant)) continue
          const isLarge = getVariantSpan(variant) >= 50
          if ((cat === 'insertion' || cat === 'deletion') && !isLarge && !lod.showSmallIndels) continue

          const color = getVariantColor(
            variant, colorMode, start, stop, sampleMetadata, group,
            locusCounts.get(variant.variant_id) || 0, haplotypeGroups.length || 1
          )

          // Accordion phantom bar for eligible insertions/TRs
          if (tryPhantomBar(variant, rowY + ROW_CENTER_Y, color, groupPhantomCarriers)) continue

          if ((cat === 'deletion' || cat === 'sv') && isLarge && !INSERTION_TYPES.has((variant.allele_type || '').toLowerCase())) {
            const endPos = variant.end ?? (variant.pos + Math.abs(variant.allele_length || 0))
            allSpanningRects.push({ start: variant.pos, end: endPos, rowY, color, variant, groupHash: group.hash })
          } else if (cat === 'deletion') {
            const thickness = Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)
            allDeletionLines.push({ position: variant.pos, yTop: rowY + 5, yBottom: rowY + 20, color, width: thickness, variant })
          } else if (cat === 'insertion' || (cat === 'sv' && INSERTION_TYPES.has((variant.allele_type || '').toLowerCase()))) {
            allInsertionTriangles.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: group.hash })
          } else if (cat === 'tr') {
            const trSpan = getVariantSpan(variant)
            if (trSpan >= 50) {
              const endPos = variant.end ?? (variant.pos + trSpan)
              allSpanningRects.push({ start: variant.pos, end: endPos, rowY, color, variant, groupHash: group.hash })
            } else {
              allTrRects.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: group.hash })
            }
          } else {
            allVariantPoints.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: group.hash })
          }
        }
        addPhantomConnectors(rowY + ROW_CENTER_Y, groupPhantomCarriers)

        if (item.isChild && showPerCopyMethylation && isClusteredView) {
          addInlineClusterMethylationBand(
            exactGroupMethylationByHash.get(String(group.hash)),
            expandedClusterChildMethylationBandTop(rowY),
            'exact group'
          )
        }

        const afterInlineChildMethylation =
          item.isChild && showPerCopyMethylation && isClusteredView
            ? expandedClusterChildRowHeight(true)
            : VARIANT_ROW_HEIGHT

        if (showMethylation) {
          const groupSampleIds = new Set(group.samples.map((s) => s.sample_id))
          const methSampleData = methylationData.filter((d) => groupSampleIds.has(d.sample))
          if (methSampleData.length > 0) {
            const display = buildMethylationLayerDisplay(
              methSampleData,
              methylationVisualGroups,
              methylationViewMode
            )
            const methYScale = scaleLinear().domain([0, 100]).range([METH_TRACK_HEIGHT - 4, 4])
            const methBaseY = rowY + afterInlineChildMethylation
            display.groups.forEach((summary) => {
              allMethGroups.push({
                start: summary.group.start,
                stop: summary.group.stop,
                y: methBaseY + methYScale(summary.weightedMeanMethylation!),
                color: [74, 85, 104, 210],
                summary,
              })
            })
            display.sites.forEach((site) => {
              allMethPoints.push({
                position: site.pos1,
                y: methBaseY + methYScale(site.weightedMeanMethylation),
                color: [74, 85, 104, 255],
                layerSite: site,
              })
            })
          }
        }

        if (showMqtl && mqtlData.length > 0) {
          const groupVarPositions = new Set(group.variants.variants.map((v) => v.pos))
          const groupMqtl = mqtlData.filter(
            (d: any) => groupVarPositions.has(d.variant_pos) && -Math.log10(d.p_value) >= (mqtlMinLogP || 0)
          )
          if (groupMqtl.length > 0) {
            const mqtlBaseY = rowY + afterInlineChildMethylation + (showMethylation ? METH_TRACK_HEIGHT : 0) + MQTL_PAD + MQTL_TRACK_HEIGHT
            const maxLogP = Math.max(2, ...groupMqtl.map((d: any) => -Math.log10(d.p_value)))
            const hScale = scaleLinear().domain([0, maxLogP]).range([0, MQTL_TRACK_HEIGHT - 4])
            for (const d of groupMqtl) {
              const logP = -Math.log10(d.p_value)
              const arcH = hScale(logP)
              const isPositive = d.effect_size > 0
              const opacity = Math.min(204, Math.round(51 + (logP / maxLogP) * 153))
              allMqtlArcs.push({
                variantPos: d.variant_pos, cpgPos: d.cpg_pos, arcHeight: arcH, baseY: mqtlBaseY,
                color: isPositive ? [220, 38, 38, opacity] : [37, 99, 235, opacity], width: 1.5,
              })
            }
          }
        }
      }
    }

    // Collect bounding boxes for expanded clusters
    for (let gi = 0; gi < rowItems.length; gi++) {
      const item = rowItems[gi]
      if (item.type === 'cluster' && expandedClusterIds?.has(item.cluster.cluster_id)) {
        let lastChildIdx = gi
        for (let j = gi + 1; j < rowItems.length; j++) {
          if (rowItems[j].type === 'group' && (rowItems[j] as { type: 'group'; group: HaplotypeGroup; isChild: boolean }).isChild) {
            lastChildIdx = j
          } else break
        }
        if (lastChildIdx > gi) {
          allClusterBoxes.push({
            yTop: rowOffsets[gi],
            yBottom: rowOffsets[lastChildIdx + 1] ?? totalHeight,
          })
        }
      }
    }

    // Emit consolidated global layers — one per data type

    const result: any[] = []

    // Subtle edge lines at phantom gap boundaries (drawn beneath everything)
    if (accordionActive) {
      const activeLoci = (phantomLoci as readonly PhantomLocus[]).filter(l => l.maxPhantomLength > 0)
      if (activeLoci.length > 0) {
        const edgeData: { genomicPos: number; offset: number }[] = []
        for (const l of activeLoci) {
          edgeData.push({ genomicPos: l.genomicPos, offset: 0 })
          edgeData.push({ genomicPos: l.genomicPos, offset: l.maxPhantomLength })
        }
        result.push(new LineLayer({
          id: 'phantom-edge-lines',
          data: edgeData,
          getSourcePosition: (d: { genomicPos: number; offset: number }) => [
            scalePosition(d.genomicPos) + d.offset * pxPerSynthUnit, 0, 0,
          ],
          getTargetPosition: (d: { genomicPos: number; offset: number }) => [
            scalePosition(d.genomicPos) + d.offset * pxPerSynthUnit, totalHeight, 0,
          ],
          getColor: [100, 100, 100, 38], // rgba(100, 100, 100, 0.15)
          getWidth: 2,
          widthUnits: 'pixels' as const,
          pickable: false,
          updateTriggers: {
            getSourcePosition: [scalePosition, pxPerSynthUnit],
            getTargetPosition: [scalePosition, pxPerSynthUnit, totalHeight],
          },
        }))
      }
    }

    // Generate rounded-rect polygon (pill shape) — shared by bg rects and TR markers
    const roundedRect = (x1: number, y1: number, x2: number, y2: number, r: number): [number, number][] => {
      const pts: [number, number][] = []
      const steps = 6
      // top-right arc
      for (let i = 0; i <= steps; i++) {
        const a = -Math.PI / 2 + (Math.PI / 2) * (i / steps)
        pts.push([x2 - r + r * Math.cos(a), y1 + r + r * Math.sin(a)])
      }
      // bottom-right arc
      for (let i = 0; i <= steps; i++) {
        const a = 0 + (Math.PI / 2) * (i / steps)
        pts.push([x2 - r + r * Math.cos(a), y2 - r + r * Math.sin(a)])
      }
      // bottom-left arc
      for (let i = 0; i <= steps; i++) {
        const a = Math.PI / 2 + (Math.PI / 2) * (i / steps)
        pts.push([x1 + r + r * Math.cos(a), y2 - r + r * Math.sin(a)])
      }
      // top-left arc
      for (let i = 0; i <= steps; i++) {
        const a = Math.PI + (Math.PI / 2) * (i / steps)
        pts.push([x1 + r + r * Math.cos(a), y1 + r + r * Math.sin(a)])
      }
      return pts
    }

    if (allBgRects.length > 0) {
      result.push(new SolidPolygonLayer({
        id: 'bg-rects-layer',
        data: allBgRects,
        getPolygon: (d: BackgroundRect) => {
          const h = d.height || 15
          const x1 = scalePosition(d.groupStart)
          const x2 = scalePosition(d.groupStop)
          const y1 = d.rowY + 5
          const y2 = y1 + h
          const isDiplotype = d.group && 'is_diplotype' in d.group
          if (isDiplotype) {
            const r = Math.min(8, h / 2)
            return roundedRect(x1, y1, x2, y2, r)
          }
          return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
        },
        getFillColor: (d: BackgroundRect) => d.color,
        pickable: false,
        updateTriggers: { getPolygon: [scalePosition] },
      }))

      // Outlines for diplotype pills
      const diplotypePills = allBgRects.filter(d => d.group && 'is_diplotype' in d.group)
      if (diplotypePills.length > 0) {
        result.push(new PathLayer({
          id: 'diplotype-pill-outlines',
          data: diplotypePills,
          getPath: (d: BackgroundRect) => {
            const h = d.height || 15
            const x1 = scalePosition(d.groupStart)
            const x2 = scalePosition(d.groupStop)
            const y1 = d.rowY + 5
            const y2 = y1 + h
            const r = Math.min(8, h / 2)
            const pts = roundedRect(x1, y1, x2, y2, r)
            pts.push(pts[0]) // close the path
            return pts.map(([x, y]) => [x, y, 0])
          },
          getColor: [190, 200, 215, 180],
          getWidth: 1,
          widthUnits: 'pixels' as const,
          pickable: false,
          updateTriggers: { getPath: [scalePosition] },
        }))
      }
    }

    if (allClusterBoxes.length > 0) {
      // Expand each box into 4 line segments for uniform rendering (no corner artifacts)
      const boxLines: { source: [number, number, number]; target: [number, number, number] }[] = []
      for (const box of allClusterBoxes) {
        const x0 = scalePosition(start) + 1
        const x1 = scalePosition(stop) - 1
        boxLines.push(
          { source: [x0, box.yTop, 0], target: [x1, box.yTop, 0] },       // top
          { source: [x1, box.yTop, 0], target: [x1, box.yBottom, 0] },     // right
          { source: [x1, box.yBottom, 0], target: [x0, box.yBottom, 0] },  // bottom
          { source: [x0, box.yBottom, 0], target: [x0, box.yTop, 0] },     // left
        )
      }
      result.push(new LineLayer({
        id: 'cluster-box-outlines',
        data: boxLines,
        getSourcePosition: (d: any) => d.source,
        getTargetPosition: (d: any) => d.target,
        getColor: [140, 140, 170, 200],
        getWidth: 2,
        widthUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: { getSourcePosition: [scalePosition, start, stop], getTargetPosition: [scalePosition, start, stop] },
      }))
    }

    if (allCenterLines.length > 0) {
      result.push(new LineLayer({
        id: 'center-lines-layer',
        data: allCenterLines,
        getSourcePosition: (d: any) => [scalePosition(d.groupStart), d.y, 0],
        getTargetPosition: (d: any) => [scalePosition(d.groupStop), d.y, 0],
        getColor: [168, 168, 168, 255],
        getWidth: 1,
        widthUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
      }))
    }

    // Phantom connector lines (non-carrier / partial-carrier horizontal lines through gaps)
    if (allPhantomConnectors.length > 0) {
      result.push(new LineLayer({
        id: 'phantom-connector-layer',
        data: allPhantomConnectors,
        getSourcePosition: (d: PhantomConnector) => [
          scalePosition(d.genomicPos) + d.startOffset * pxPerSynthUnit,
          d.centerY,
          0,
        ],
        getTargetPosition: (d: PhantomConnector) => [
          scalePosition(d.genomicPos) + d.endOffset * pxPerSynthUnit,
          d.centerY,
          0,
        ],
        getColor: [168, 168, 168, 180],
        getWidth: 1,
        widthUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: {
          getSourcePosition: [scalePosition, pxPerSynthUnit],
          getTargetPosition: [scalePosition, pxPerSynthUnit],
        },
      }))
    }

    // Phantom carrier bars (insertion/TR extent within accordion gaps)
    if (allPhantomBars.length > 0) {
      // Main body — colored by colorMode
      result.push(new SolidPolygonLayer({
        id: 'phantom-bar-layer',
        data: allPhantomBars,
        getPolygon: (d: PhantomBar) => {
          const x1 = scalePosition(d.genomicPos)
          const x2 = x1 + d.endOffset * pxPerSynthUnit
          const yTop = d.centerY - 4
          const yBot = d.centerY + 4
          return [[x1, yTop], [x2, yTop], [x2, yBot], [x1, yBot]]
        },
        getFillColor: (d: PhantomBar) => d.color,
        pickable: true,
        onHover: onHover,
        updateTriggers: { getPolygon: [scalePosition, pxPerSynthUnit] },
      }))

      // Left accent stripe — 4px wide, colored by allele_type mechanism
      result.push(new SolidPolygonLayer({
        id: 'phantom-accent-layer',
        data: allPhantomBars,
        getPolygon: (d: PhantomBar) => {
          const x1 = scalePosition(d.genomicPos)
          const barWidth = d.endOffset * pxPerSynthUnit
          const x2 = x1 + Math.min(4, barWidth)
          const yTop = d.centerY - 4
          const yBot = d.centerY + 4
          return [[x1, yTop], [x2, yTop], [x2, yBot], [x1, yBot]]
        },
        getFillColor: (d: PhantomBar) => d.accentColor,
        pickable: false,
        updateTriggers: { getPolygon: [scalePosition, pxPerSynthUnit] },
      }))

      // Mechanism labels inside wide phantom bars
      if (allPhantomLabels.length > 0) {
        result.push(new TextLayer({
          id: 'phantom-labels-layer',
          data: allPhantomLabels,
          getText: (d: PhantomLabel) => d.text,
          getPosition: (d: PhantomLabel) => [
            scalePosition(d.genomicPos) + (d.endOffset * pxPerSynthUnit) / 2,
            d.centerY,
            0,
          ],
          getSize: 10,
          getColor: [255, 255, 255, 220],
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          fontWeight: 700,
          pickable: false,
          updateTriggers: {
            getPosition: [scalePosition, pxPerSynthUnit],
          },
        }))
      }
    }

    const handleVariantLayerClick = (info: any) => {
      if (info.object?.variant && onVariantClick) {
        onVariantClick(info.object.variant.pos)
      }
    }

    // Dimming: when table is filtered, fade non-matching variants
    const hasDimming = highlightedVariantIds && highlightedVariantIds.size > 0
    const dimVariantColor = (color: [number, number, number, number], variant: Variant): [number, number, number, number] => {
      if (!hasDimming) return color
      if (highlightedVariantIds!.has(variant.variant_id)) return color
      return [color[0], color[1], color[2], 40]
    }

    if (allSpanningRects.length > 0) {
      result.push(new SolidPolygonLayer({
        id: 'sv-spanning-rects-layer',
        data: allSpanningRects,
        getPolygon: (d: SpanningRect) => {
          const x1 = scalePosition(d.start)
          const x2 = Math.max(scalePosition(d.end), x1 + 2)
          const yTop = d.rowY + ROW_CENTER_Y - 4
          const yBot = d.rowY + ROW_CENTER_Y + 4
          return [[x1, yTop], [x2, yTop], [x2, yBot], [x1, yBot]]
        },
        getFillColor: (d: SpanningRect) => dimVariantColor(d.color, d.variant),
        pickable: true,
        onHover: onHover,
        onClick: handleVariantLayerClick,
        updateTriggers: { getPolygon: [scalePosition] },
      }))
    }

    if (allDeletionLines.length > 0) {
      result.push(new LineLayer({
        id: 'deletion-lines-layer',
        data: allDeletionLines,
        getSourcePosition: (d: StemLine) => [scalePosition(d.position), d.yTop, 0],
        getTargetPosition: (d: StemLine) => [scalePosition(d.position), d.yBottom, 0],
        getColor: (d: StemLine) => dimVariantColor(d.color, d.variant),
        getWidth: (d: StemLine) => d.width,
        widthUnits: 'pixels' as const,
        pickable: true,
        onHover: onHover,
        onClick: handleVariantLayerClick,
        updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
      }))
    }

    if (allBelowThresholdPoints.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'below-threshold-layer',
        data: allBelowThresholdPoints,
        getPosition: (d: VariantPoint) => [d.pxX ?? scalePosition(d.position), d.y, 0],
        getRadius: (d: VariantPoint) => d.radius,
        getFillColor: [0, 0, 0, 0],
        getLineColor: (d: VariantPoint) => d.color,
        getLineWidth: 0.7,
        lineWidthUnits: 'pixels' as const,
        stroked: true,
        filled: false,
        radiusUnits: 'pixels' as const,
        pickable: true,
        onHover: onHover,
        updateTriggers: { getPosition: [scalePosition] },
      }))
    }

    if (allVariantPoints.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'variants-layer',
        data: allVariantPoints,
        getPosition: (d: VariantPoint) => [scalePosition(d.position), d.y, 0],
        getRadius: (d: VariantPoint) => d.radius,
        getFillColor: (d: VariantPoint) => dimVariantColor(d.color, d.variant),
        getLineColor: [0, 0, 0, 128],
        getLineWidth: 0.5,
        lineWidthUnits: 'pixels' as const,
        stroked: true,
        radiusUnits: 'pixels' as const,
        pickable: true,
        onHover: onHover,
        onClick: handleVariantLayerClick,
        updateTriggers: { getPosition: [scalePosition] },
      }))
    }

    // Small bars for insertions (no accordion expansion)
    if (allInsertionTriangles.length > 0) {
      result.push(new SolidPolygonLayer({
        id: 'insertion-bars-layer',
        data: allInsertionTriangles,
        getPolygon: (d: VariantPoint) => {
          const px = scalePosition(d.position)
          return [[px - 1.5, d.y - 5], [px + 1.5, d.y - 5], [px + 1.5, d.y + 5], [px - 1.5, d.y + 5]]
        },
        getFillColor: (d: VariantPoint) => dimVariantColor(d.color, d.variant),
        pickable: true,
        onHover: onHover,
        onClick: handleVariantLayerClick,
        updateTriggers: { getPolygon: [scalePosition] },
      }))
    }

    // Small bars for TRs (no accordion expansion)
    if (allTrRects.length > 0) {
      result.push(new SolidPolygonLayer({
        id: 'tr-rects-layer',
        data: allTrRects,
        getPolygon: (d: VariantPoint) => {
          const px = scalePosition(d.position)
          return [[px - 2, d.y - 5], [px + 2, d.y - 5], [px + 2, d.y + 5], [px - 2, d.y + 5]]
        },
        getFillColor: (d: VariantPoint) => dimVariantColor(d.color, d.variant),
        pickable: true,
        onHover: onHover,
        onClick: handleVariantLayerClick,
        updateTriggers: { getPolygon: [scalePosition] },
      }))
    }

    if (allMethStatusLabels.length > 0) {
      result.push(new TextLayer({
        id: 'methylation-status-labels',
        data: allMethStatusLabels,
        getPosition: (d: MethStatusLabel) => d.position,
        getText: (d: MethStatusLabel) => d.text,
        getSize: 9,
        getColor: (d: MethStatusLabel) => d.color,
        getTextAnchor: 'start',
        getAlignmentBaseline: 'center',
        pickable: false,
      }))
    }

    if (allMqtlArcs.length > 0) {
      result.push(new PathLayer({
        id: 'mqtl-arcs-layer',
        data: allMqtlArcs,
        getPath: (d: MqtlArc) => {
          const vx = scalePosition(d.variantPos)
          const cx = scalePosition(d.cpgPos)
          const midX = (vx + cx) / 2
          const midY = d.baseY - d.arcHeight
          const steps = 20
          const path: [number, number][] = []
          for (let t = 0; t <= steps; t++) {
            const tt = t / steps
            path.push([
              (1 - tt) * (1 - tt) * vx + 2 * (1 - tt) * tt * midX + tt * tt * cx,
              (1 - tt) * (1 - tt) * d.baseY + 2 * (1 - tt) * tt * midY + tt * tt * d.baseY,
            ])
          }
          return path
        },
        getColor: (d: MqtlArc) => d.color,
        getWidth: (d: MqtlArc) => d.width,
        widthUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: { getPath: [scalePosition] },
      }))
    }

    // Dashed separator lines between diplotype strands
    if (allDashedSeparators.length > 0) {
      result.push(new LineLayer({
        id: 'dashed-separators-layer',
        data: allDashedSeparators,
        getSourcePosition: (d: any) => [scalePosition(d.groupStart), d.y, 0],
        getTargetPosition: (d: any) => [scalePosition(d.groupStop), d.y, 0],
        getColor: [168, 168, 168, 150],
        getWidth: 1,
        widthUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
      }))
    }

    // Compound het arcs connecting severe variants across strands
    if (allChArcs.length > 0) {
      result.push(new LineLayer({
        id: 'compound-het-arcs',
        data: allChArcs,
        getSourcePosition: (d: any) => [scalePosition(d.x1), d.y1, 0],
        getTargetPosition: (d: any) => [scalePosition(d.x2), d.y2, 0],
        getColor: [220, 38, 38, 200],
        getWidth: 2,
        widthUnits: 'pixels' as const,
        // Relationship geometry deliberately sits below the pickable CpG layer.
        pickable: false,
        updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
      }))
    }

    if (allRohWaves.length > 0) {
      result.push(new PathLayer({
        id: 'roh-wave-lines',
        data: allRohWaves,
        getPath: (d: { startPos: number; stopPos: number; y: number }) => {
          const x1 = scalePosition(d.startPos)
          const x2 = scalePosition(d.stopPos)
          const span = x2 - x1
          const waveLen = 12
          const amplitude = 2.5
          const pts: [number, number, number][] = []
          for (let px = 0; px <= span; px += 2) {
            const x = x1 + px
            const yOff = Math.sin((px / waveLen) * Math.PI * 2) * amplitude
            pts.push([x, d.y + yOff, 0])
          }
          pts.push([x2, d.y, 0])
          return pts
        },
        getColor: [180, 180, 200, 150],
        getWidth: 1,
        widthUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: { getPath: [scalePosition] },
      }))
    }

    // Population comparators are deliberately subtle and non-pickable. Their boundaries and
    // Sites/Groups/Both mode are shared with every cluster member summary.
    if (allClusterPopulationGroups.length > 0) {
      result.push(new SolidPolygonLayer({
        id: 'cluster-population-methylation-groups',
        data: allClusterPopulationGroups,
        getPolygon: (d: ClusterPopulationGroupMark) => {
          const x1 = scalePosition(d.start)
          const x2 = Math.max(x1 + 2, scalePosition(d.stop))
          return [[x1, d.y - 1], [x2, d.y - 1], [x2, d.y + 1], [x1, d.y + 1]]
        },
        getFillColor: [105, 105, 105, 85],
        pickable: false,
        updateTriggers: { getPolygon: [scalePosition] },
      }))
    }
    if (allClusterPopulationPoints.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'cluster-population-methylation-sites',
        data: allClusterPopulationPoints,
        getPosition: (d: ClusterPopulationPoint) => [scalePosition(d.position), d.y, 0],
        getRadius: 1.5,
        getFillColor: [105, 105, 105, 95],
        radiusUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: { getPosition: [scalePosition] },
      }))
    }
    if (allClusterMethGroups.length > 0) {
      result.push(new SolidPolygonLayer({
        id: 'cluster-copy-methylation-groups',
        data: allClusterMethGroups,
        getPolygon: (d: ClusterMethGroupMark) => {
          const x1 = scalePosition(d.start)
          const x2 = Math.max(x1 + 2, scalePosition(d.stop))
          return [[x1, d.y - 3], [x2, d.y - 3], [x2, d.y + 3], [x1, d.y + 3]]
        },
        getFillColor: (d: ClusterMethGroupMark) => [
          d.color[0],
          d.color[1],
          d.color[2],
          methylationViewMode === 'both' ? 90 : 180,
        ],
        pickable: true,
        onHover,
        updateTriggers: { getPolygon: [scalePosition] },
      }))
    }
    if (allClusterMethPoints.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'cluster-copy-methylation-sites',
        data: allClusterMethPoints,
        getPosition: (d: ClusterMethPoint) => [scalePosition(d.position), d.y, 0],
        getRadius: 2,
        getFillColor: (d: ClusterMethPoint) => d.color,
        radiusUnits: 'pixels' as const,
        pickable: true,
        onHover,
        updateTriggers: { getPosition: [scalePosition] },
      }))
    }

    // Group ribbons are drawn beneath raw sites in Both mode. Group mode emits no raw site
    // marks, so every display layer follows the shared population-summary boundaries.
    if (allMethGroups.length > 0) {
      result.push(
        new SolidPolygonLayer({
          id: 'methylation-group-layer',
          data: allMethGroups,
          getPolygon: (d: MethGroupMark) => {
            const x1 = scalePosition(d.start)
            const x2 = Math.max(x1 + 2, scalePosition(d.stop))
            return [
              [x1, d.y - 3],
              [x2, d.y - 3],
              [x2, d.y + 3],
              [x1, d.y + 3],
            ]
          },
          getFillColor: (d: MethGroupMark) => [
            d.color[0],
            d.color[1],
            d.color[2],
            methylationViewMode === 'both' ? 75 : 150,
          ],
          getLineColor: (d: MethGroupMark) =>
            d.summary.support.state === 'adequate' ? d.color : [138, 75, 8, 255],
          getLineWidth: (d: MethGroupMark) =>
            d.summary.support.state === 'adequate' ? 1 : 2,
          lineWidthUnits: 'pixels' as const,
          stroked: true,
          pickable: true,
          onHover,
          updateTriggers: { getPolygon: [scalePosition] },
        })
      )
    }

    // Render CpGs after all copy-relationship and group marks so dots remain visually on top;
    // compound-het marks are non-pickable, making CpG hover deterministic at crossings.
    if (allMethPoints.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'methylation-layer',
          data: allMethPoints,
          getPosition: (d: MethPoint) => [scalePosition(d.position), d.y, 0],
          getRadius: 2,
          getFillColor: (d: MethPoint) => d.color,
          radiusUnits: 'pixels' as const,
          pickable: true,
          onHover,
          updateTriggers: { getPosition: [scalePosition] },
        })
      )
    }

    console.timeEnd('[perf] DeckGL global layers')
    return result
  }, [
    rowItems,
    rowOffsets,
    start,
    stop,
    colorMode,
    haplotypeGroups,
    locusCounts,
    variantCircleRadius,
    showMethylation,
    methylationData,
    showPerCopyMethylation,
    perCopyMethylationRecords,
    perCopyMethylationSampleStates,
    methylationViewMode,
    methylationVisualGroups,
    clusterMethylationById,
    exactGroupMethylationByHash,
    populationMeanByPos,
    summaryByPos,
    isClusteredView,
    totalHeight,
    showMqtl,
    mqtlData,
    mqtlMinLogP,
    sampleMetadata,
    scalePosition,
    onHover,
    populationStatsByRow,
    expandedClusterIds,
    isDiploidView,
    mapper,
    onVariantClick,
    highlightedVariantIds,
    typeFilters,
    variantMatchesSearch,
  ])

  // Crosshair layer — decoupled so hover doesn't rebuild all variant layers
  const crosshairLayer = useMemo(() => {
    if (hoveredVariantPosition == null) return null
    return new LineLayer({
      id: 'crosshair',
      data: [{ position: hoveredVariantPosition, yTop: 0, yBottom: totalHeight }],
      getSourcePosition: (d: any) => [scalePosition(d.position), d.yTop, 0],
      getTargetPosition: (d: any) => [scalePosition(d.position), d.yBottom, 0],
      getColor: [0, 0, 0, 128],
      getWidth: 1,
      widthUnits: 'pixels' as const,
      pickable: false,
      updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
    })
  }, [hoveredVariantPosition, scalePosition, totalHeight])

  // Persistent crosshair for table-selected variant
  const selectedCrosshairLayer = useMemo(() => {
    if (selectedVariantPos == null) return null
    return new LineLayer({
      id: 'selected-crosshair',
      data: [{ position: selectedVariantPos, yTop: 0, yBottom: totalHeight }],
      getSourcePosition: (d: any) => [scalePosition(d.position), d.yTop, 0],
      getTargetPosition: (d: any) => [scalePosition(d.position), d.yBottom, 0],
      getColor: SEARCHED_POSITION_GUIDE_STYLE.color,
      getWidth: SEARCHED_POSITION_GUIDE_STYLE.width,
      widthUnits: 'pixels' as const,
      pickable: false,
      updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
    })
  }, [selectedVariantPos, scalePosition, totalHeight])

  // Multi-view: the genomic center starts exactly at RegionViewer's panel boundary,
  // matching the stacked SVG summary tracks above it.
  const views = useMemo(
    () => {
      const v = [
        new OrthographicView({ id: 'left-panel', x: 0, y: 0, width: leftPanelWidth, height: viewportHeight, flipY: true }),
        new OrthographicView({ id: 'center-panel', x: leftPanelWidth, y: 0, width: canvasWidth, height: viewportHeight, flipY: true }),
      ]
      if (rightPanelWidth > 0) {
        v.push(new OrthographicView({ id: 'right-panel', x: leftPanelWidth + canvasWidth, y: 0, width: rightPanelWidth, height: viewportHeight, flipY: true }))
      }
      return v
    },
    [leftPanelWidth, canvasWidth, rightPanelWidth, viewportHeight]
  )

  // viewState reads from ref — on re-render (data change) it picks up current scroll position;
  // during scroll, the imperative handler in the parent updates DeckGL directly
  const yTarget = scrollTopRef.current + viewportHeight / 2
  const viewState: Record<string, { target: [number, number, number]; zoom: number }> = {
    'left-panel': { target: [leftPanelWidth / 2, yTarget, 0], zoom: 0 },
    'center-panel': { target: [canvasWidth / 2, yTarget, 0], zoom: 0 },
  }
  if (rightPanelWidth > 0) {
    viewState['right-panel'] = { target: [rightPanelWidth / 2, yTarget, 0], zoom: 0 }
  }

  return (
    <div
      data-testid="lr-haplotype-canvas"
      data-first-row-offset={rowOffsets[0] ?? ''}
      style={{ position: 'sticky', top: 0, left: 0, width: totalWidth, height: viewportHeight }}
    >
      <DeckGL
        ref={deckRef}
        views={views}
        viewState={viewState}
        layers={[...layers, ...(crosshairLayer ? [crosshairLayer] : []), ...(selectedCrosshairLayer ? [selectedCrosshairLayer] : []), ...leftPanelLayers, ...treeLayers]}
        layerFilter={({ layer, viewport }) => {
          const layerId = layer.id
          if (layerId.startsWith('left-panel-')) return viewport.id === 'left-panel'
          if (layerId.startsWith('tree-')) return viewport.id === 'right-panel'
          return viewport.id === 'center-panel'
        }}
        getCursor={({ isHovering }: { isHovering: boolean }) => isHovering ? 'pointer' : 'default'}
        controller={false}
        pickingRadius={5}
        style={{ position: 'absolute', left: '0', top: '0', width: `${totalWidth}px`, height: `${viewportHeight}px` }}
        width={totalWidth}
        height={viewportHeight}
      />
      {hovered && hovered.object && (
        <Tooltip
          x={hovered.x}
          y={hovered.y}
          object={hovered.object}
          viewportId={hovered.viewportId}
          phantomExpanded={Boolean(
            hovered.object.variant && mapper?.getPhantomLoci().some(
              (locus) => locus.maxPhantomLength > 0 &&
                Math.abs(locus.genomicPos - hovered.object.variant.pos) <= 2
            )
          )}
        />
      )}
    </div>
  )
}

// Simple tooltip overlay — routes by viewportId
function Tooltip({
  x,
  y,
  object,
  viewportId,
  phantomExpanded,
}: {
  x: number
  y: number
  object: any
  viewportId: string
  phantomExpanded: boolean
}) {
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: x + 10,
    top: y + 10,
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: 12,
    pointerEvents: 'none',
    zIndex: 100,
    maxWidth: 300,
    whiteSpace: 'pre-line',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  }

  // Right panel: tree node / cluster marker tooltips
  if (viewportId === 'right-panel') {
    if (!object.tooltipText) return null
    return <div style={tooltipStyle}><span>{object.tooltipText}</span></div>
  }

  // Left panel: sample/variant count tooltips
  if (viewportId === 'left-panel') {
    if (!object.tooltipText) return null
    return <div style={tooltipStyle}><span>{object.tooltipText}</span></div>
  }

  // Center panel: methylation group/site or variant tooltips
  const groupSummary = object.summary as MethylationLayerGroupSummary | undefined
  const groupCounterpart = object.counterpart as MethylationLayerGroupSummary | undefined
  const layerSite = object.layerSite as MethylationLayerSiteSummary | undefined
  const copy = object.copy as 'A' | 'B' | undefined
  const siteCounterpart = object.counterpart as MethylationLayerSiteSummary | undefined
  const perCopyMetadata = object.perCopyMetadata as PerCopyMethylationPoint | undefined
  const counterpartMetadata = object.counterpartMetadata as PerCopyMethylationPoint | undefined
  const copySupport = object.copySupport as CopySupportClassification | undefined
  const clusterSite = object.clusterSite as ClusterMethylationSiteSummary | undefined
  const clusterGroup = object.clusterGroup as ClusterMethylationGroupSummary | undefined
  const methylationScope = object.methylationScope as InlineMethylationScope | undefined
  if (clusterGroup) {
    return (
      <div style={tooltipStyle}>
        <div>
          <strong>{methylationScope === 'exact group' ? 'Exact group' : 'Cluster'} CpG group:</strong>{' '}
          {clusterGroup.group.start.toLocaleString()}–{clusterGroup.group.stop.toLocaleString()}
        </div>
        <div>
          <strong>Median equal-copy site mean:</strong> {clusterGroup.medianSiteMean.toFixed(1)}%
          {' '}({clusterGroup.minimumSiteMean.toFixed(1)}–{clusterGroup.maximumSiteMean.toFixed(1)}%)
        </div>
        <div>
          <strong>Evidence:</strong> {clusterGroup.representedSites}/{clusterGroup.group.siteCount} CpGs;
          {' '}≥{clusterGroup.minimumMeasuredCopyCount}/{clusterGroup.availableCopyCount} available copies;
          {' '}{clusterGroup.measuredIndividualCount} individuals; {clusterGroup.medianDepth.toFixed(1)}× median depth
        </div>
        <div><strong>Cohort:</strong> {clusterGroup.populationMean.toFixed(1)}%</div>
      </div>
    )
  }
  if (clusterSite) {
    return (
      <div style={tooltipStyle}>
        <div>
          <strong>{methylationScope === 'exact group' ? 'Exact group' : 'Cluster'} CpG:</strong>{' '}
          {clusterSite.pos1.toLocaleString()}–{clusterSite.pos2.toLocaleString()}
        </div>
        <div>
          <strong>Equal-copy mean:</strong> {clusterSite.meanMethylation.toFixed(1)}%
          {' '}({clusterSite.minimumMethylation.toFixed(1)}–{clusterSite.maximumMethylation.toFixed(1)}%)
        </div>
        <div>
          <strong>Evidence:</strong> {clusterSite.measuredCopyCount}/{clusterSite.availableCopyCount} available copies;
          {' '}{clusterSite.measuredIndividualCount} individuals; {clusterSite.medianDepth.toFixed(1)}× median depth
        </div>
        <div>
          <strong>Cohort:</strong>{' '}
          {clusterSite.populationMean === null ? 'Unavailable' : `${clusterSite.populationMean.toFixed(1)}%`}
        </div>
      </div>
    )
  }
  if (groupSummary) {
    return (
      <div style={tooltipStyle}>
        <div>
          <strong>{copy ? `Copy ${copy}` : 'Sample-total'} visual CpG group:</strong>{' '}
          {groupSummary.group.start.toLocaleString()}–{groupSummary.group.stop.toLocaleString()}
        </div>
        <div>
          <strong>Coverage-weighted methylation:</strong>{' '}
          {groupSummary.weightedMeanMethylation?.toFixed(1) ?? 'Unavailable'}%
        </div>
        <div>
          <strong>Median per-CpG depth:</strong>{' '}
          {groupSummary.medianPerCpgCoverage?.toFixed(1) ?? 'Unavailable'}×
        </div>
        <div>
          <strong>CpGs represented:</strong> {groupSummary.representedSites}/
          {groupSummary.group.siteCount}; {groupSummary.missingSites} missing
        </div>
        <div>
          <strong>Display support:</strong> {groupSummary.support.state.replace(/-/g, ' ')} —{' '}
          {groupSummary.support.reasons.join(' ')}
        </div>
        {groupCounterpart && (
          <div>
            <strong>Other copy:</strong>{' '}
            {groupCounterpart.weightedMeanMethylation?.toFixed(1) ?? 'Unavailable'}% at{' '}
            {groupCounterpart.medianPerCpgCoverage?.toFixed(1) ?? 'Unavailable'}× median depth;{' '}
            {groupCounterpart.representedSites}/{groupCounterpart.group.siteCount} CpGs represented
          </div>
        )}
        {copySupport && (
          <div style={{ marginTop: 4 }}>
            <strong>Copy A/B display support: {copySupport.state.replace(/-/g, ' ')}</strong>{' '}
            {copySupport.reasons.join(' ')}
          </div>
        )}
        <div>Visual groups are browser display aids, not biological events.</div>
      </div>
    )
  }
  if (layerSite) {
    return (
      <div style={tooltipStyle}>
        <div>
          <strong>{copy ? `Canonical Copy ${copy}` : 'Loaded sample-total'} CpG:</strong>{' '}
          {layerSite.pos1}-{layerSite.pos2}
        </div>
        <div>
          <strong>Coverage-weighted methylation:</strong>{' '}
          {layerSite.weightedMeanMethylation.toFixed(1)}%
        </div>
        <div>
          <strong>Mean read depth:</strong> {layerSite.meanCoverage.toFixed(1)}×
        </div>
        <div>
          <strong>Total admitted coverage:</strong> {layerSite.totalCoverage.toFixed(1)}×
        </div>
        <div>
          <strong>Contributing samples:</strong> {layerSite.contributingSampleCount}
        </div>
        {copy && siteCounterpart && (
          <div>
            <strong>Other copy at this CpG:</strong>{' '}
            {siteCounterpart.weightedMeanMethylation.toFixed(1)}% coverage-weighted at{' '}
            {siteCounterpart.meanCoverage.toFixed(1)}× mean depth from{' '}
            {siteCounterpart.contributingSampleCount} contributing sample
            {siteCounterpart.contributingSampleCount === 1 ? '' : 's'}
          </div>
        )}
        {copySupport && (
          <div style={{ marginTop: 4, padding: '4px 6px', border: copySupport.state === 'balanced-enough' ? '1px solid #39754a' : '1px dashed #8a4b08' }}>
            <strong>Copy A/B display support: {copySupport.state.replace(/-/g, ' ')}</strong>
            {copySupport.reasons.map((reason) => <div key={reason}>{reason}</div>)}
          </div>
        )}
        {copy && perCopyMetadata && (
          <>
            <div>
              <strong>VCF GT strand(s):</strong> {perCopyMetadata.vcfStrands.join(', ')}
            </div>
            <div>
              <strong>Source haplotype label(s):</strong>{' '}
              {perCopyMetadata.sourceHaplotypes.join(', ')}
            </div>
            {counterpartMetadata && (
              <div>
                <strong>Other-copy source labels:</strong>{' '}
                {counterpartMetadata.sourceHaplotypes.join(', ')} / GT{' '}
                {counterpartMetadata.vcfStrands.join(', ')}
              </div>
            )}
            <div>
              <strong>Mapping:</strong> admitted chromosome-wide receipt; phase set null
            </div>
            <div style={{ marginTop: 4 }}>
              The receipt maps source HAP1 to VCF GT1 and HAP2 to VCF GT2; each sample&apos;s
              GT-to-canonical mapping then places GT1/GT2 on A/B. None of these labels means maternal or
              paternal.
            </div>
          </>
        )}
      </div>
    )
  }

  const variant = object.variant as Variant | undefined
  if (!variant) return null

  return (
    <div style={tooltipStyle}>
      <HaplotypeVariantTooltipContent
        variant={variant}
        phantomExpanded={phantomExpanded}
      />
    </div>
  )
}

// --- Threshold drag overlay component ---

type ThresholdDragOverlayProps = {
  leftPanelWidth: number
  centerWidth: number
  rightPanelWidth: number
  totalHeight: number
  showGenealogy: boolean
  genealogyResult?: { tree: any; leafOrder: number[] } | null
  leafYPositions: Map<number, number>
  groups: HaplotypeGroup[]
  sampleMetadata?: SampleMetadataMap
  clusterThreshold: number
  onClusterThresholdChange?: (threshold: number) => void
  clusters?: HaplotypeCluster[]
  isClusteredView: boolean
  expandedClusterIds?: Set<string>
  rowYPositions?: Map<string, number>
}

function ThresholdDragOverlay({
  leftPanelWidth,
  centerWidth,
  rightPanelWidth,
  totalHeight,
  showGenealogy,
  genealogyResult,
  leafYPositions,
  groups,
  sampleMetadata,
  clusterThreshold,
  onClusterThresholdChange,
  clusters,
  isClusteredView,
  expandedClusterIds,
  rowYPositions,
}: ThresholdDragOverlayProps) {
  const rightPanelRef = useRef<HTMLDivElement>(null)

  // Compute tree layout for threshold position
  const treeLayout = useMemo((): TreeLayout | null => {
    if (!showGenealogy || !genealogyResult || leafYPositions.size === 0) return null
    return buildGenealogyTreeLayout({
      tree: genealogyResult.tree,
      leafYPositions,
      panelWidth: rightPanelWidth,
      groups,
      sampleMetadata,
      clusterThreshold,
      isClusteredView,
      clusters,
      expandedClusterIds,
      rowYPositions,
    })
  }, [showGenealogy, genealogyResult, leafYPositions, rightPanelWidth, groups, sampleMetadata, clusterThreshold, isClusteredView, clusters, expandedClusterIds, rowYPositions])

  const handleThresholdDragStart = useCallback((e: React.PointerEvent) => {
    if (!onClusterThresholdChange || !rightPanelRef.current || !treeLayout) return
    e.preventDefault()
    e.stopPropagation()

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!rightPanelRef.current || !treeLayout) return
      const rect = rightPanelRef.current.getBoundingClientRect()
      const pointerX = moveEvent.clientX - rect.left
      const newDistance = treeLayout.xScale.invert(pointerX)
      const newThreshold = Math.max(0, Math.min(1, newDistance / treeLayout.maxDistance))
      onClusterThresholdChange(newThreshold)
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [onClusterThresholdChange, treeLayout])

  if (!treeLayout || treeLayout.thresholdX === null) return null

  return (
    <div
      ref={rightPanelRef}
      data-testid="lr-genealogy-panel"
      style={{
        position: 'absolute',
        top: 0,
        left: leftPanelWidth + centerWidth,
        width: rightPanelWidth,
        height: totalHeight,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: treeLayout.thresholdX - 6,
          top: 0,
          bottom: 0,
          width: 12,
          cursor: 'ew-resize',
          pointerEvents: 'all',
        }}
        onPointerDown={handleThresholdDragStart}
      >
        <div
          style={{
            position: 'absolute',
            left: 5,
            top: 0,
            bottom: 0,
            width: 2,
            borderRight: '1.5px dashed rgba(217,83,79,0.7)',
          }}
        />
      </div>
    </div>
  )
}


