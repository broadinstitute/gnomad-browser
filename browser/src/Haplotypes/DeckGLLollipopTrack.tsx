import React, { useMemo, useState, useCallback, useRef, useContext, forwardRef, useImperativeHandle } from 'react'
import { DeckGL } from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { ScatterplotLayer, LineLayer, SolidPolygonLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import { RegionViewerContext } from '@gnomad/region-viewer'
import { scaleLinear, scaleLog } from 'd3-scale'
import { SUPERPOPULATION_COLORS } from './colors'
import { getVariantCategory, getLodVisibility } from '../LongReadVariantPage/variantUtils'
import { buildGenealogyTreeLayout } from './genealogyTreeLayout'
import type { TreeBranch, TreeNodePoint, TreeClusterMarker, TreeLayout } from './genealogyTreeLayout'
import type { HaplotypeGroup, HaplotypeCluster, LRVariant, Methylation } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

type Variant = LRVariant

// Row height constants
const VARIANT_ROW_HEIGHT = 25
const METH_TRACK_HEIGHT = 40
const MQTL_TRACK_HEIGHT = 80
const MQTL_PAD = 8
const ROW_CENTER_Y = 12.5
const SCROLL_CONTAINER_HEIGHT = 500

// Flattened data types for deck.gl layers
type VariantPoint = {
  position: number // raw genomic position — scaled in layer accessor
  y: number // pixel y
  radius: number
  color: [number, number, number, number]
  variant: Variant
  groupHash: number
}

type StemLine = {
  position: number // raw genomic position — scaled in layer accessor
  yTop: number
  yBottom: number
  color: [number, number, number, number]
  width: number
  variant: Variant
}

type BackgroundRect = {
  groupStart: number // raw genomic position
  groupStop: number // raw genomic position
  rowY: number
  color: [number, number, number, number]
  group: HaplotypeGroup
}

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
}

type MqtlArc = {
  variantPos: number // raw genomic position
  cpgPos: number // raw genomic position
  arcHeight: number // pre-computed arc height in pixels
  baseY: number // baseline Y
  color: [number, number, number, number]
  width: number
}

// HSL string to RGBA array conversion
function hslToRgba(hsl: string, alpha = 255): [number, number, number, number] {
  const match = hsl.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/)
  if (!match) return hexToRgba(hsl, alpha)
  const h = parseFloat(match[1]) / 360
  const s = parseFloat(match[2]) / 100
  const l = parseFloat(match[3]) / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255), alpha]
}

function hexToRgba(hex: string, alpha = 255): [number, number, number, number] {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return [r, g, b, alpha]
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
      alpha,
    ]
  }
  return [128, 128, 128, alpha]
}

function cssColorToRgba(color: string, alpha = 255): [number, number, number, number] {
  if (!color) return [128, 128, 128, alpha]
  if (color.startsWith('hsl')) return hslToRgba(color, alpha)
  if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (match) {
      return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), alpha]
    }
  }
  if (color.startsWith('#')) return hexToRgba(color, alpha)
  return [128, 128, 128, alpha]
}

// Color computation helpers (mirrors index.tsx logic)
const variantColorCache: Record<string, [number, number, number, number]> = {}

function getColorByHash(locus: string): [number, number, number, number] {
  if (!variantColorCache[locus]) {
    const variantHash = locus
      .split('')
      .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0)
    const randomFactor = Math.sin(variantHash - 3.14) * 10000
    const hash = (variantHash * 9301 + 49297 + randomFactor) % 233280
    const hue = Math.floor(Math.abs(hash)) % 360
    const saturation = 60 + (Math.floor(Math.abs(hash)) % 40)
    const lightness = 30 + (Math.floor(Math.abs(hash)) % 40)
    variantColorCache[locus] = hslToRgba(`hsl(${hue}, ${saturation}%, ${lightness}%)`)
  }
  return variantColorCache[locus]
}

function getColorByPosition(
  position: number,
  minPos: number,
  maxPos: number
): [number, number, number, number] {
  const fraction = (position - minPos) / (maxPos - minPos || 1)
  const hue = Math.round(240 * (1 - fraction))
  return hslToRgba(`hsl(${hue}, 100%, 50%)`)
}

function getColorByAf(af: number): [number, number, number, number] {
  const afScale = scaleLog<string>().domain([0.1, 1]).range(['#d3d3d3', '#424242']).clamp(true)
  return cssColorToRgba(afScale(af))
}

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
  switch (colorMode) {
    case 'allele':
      return getColorByHash(variant.variant_id)
    case 'position':
      return getColorByPosition(variant.pos, start, stop)
    case 'af':
      return getColorByAf(variant.freq.af)
    case 'haplotype_count': {
      const scale = scaleLinear<string>()
        .domain([0, totalGroups])
        .range(['#d3d3d3', '#ff0000'])
        .clamp(true)
      return cssColorToRgba(scale(locusCount))
    }
    case 'population': {
      if (!sampleMetadata || !group) return [51, 51, 51, 255]
      let maxPop = 'N/A'
      let maxCount = 0
      const counts: Record<string, number> = {}
      for (const s of group.samples) {
        const meta = sampleMetadata.get(s.sample_id)
        const pop = meta?.superpopulation || 'N/A'
        counts[pop] = (counts[pop] || 0) + 1
        if (counts[pop] > maxCount) {
          maxCount = counts[pop]
          maxPop = pop
        }
      }
      return cssColorToRgba(SUPERPOPULATION_COLORS[maxPop] || SUPERPOPULATION_COLORS['N/A'])
    }
    default:
      return [51, 51, 51, 255]
  }
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
  haplotypeGroups: HaplotypeGroup[]
  clusters?: HaplotypeCluster[]
  start: number
  stop: number
  colorMode: string
  showMethylation: boolean
  methylationData: Methylation[]
  summaryByPos: Map<number, { mean: number; std: number }>
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
  isClusteredView?: boolean
  expandedClusterIds?: Set<string>
  toggleClusterExpansion?: (clusterId: string) => void
  clusterThreshold?: number
  onClusterThresholdChange?: (threshold: number) => void
}

export type DeckGLLollipopTrackHandle = {
  scrollToPosition: (pos: number) => void
}

const DeckGLLollipopTrack = forwardRef<DeckGLLollipopTrackHandle, DeckGLLollipopTrackProps>(function DeckGLLollipopTrack({
  displayGroups,
  haplotypeGroups,
  clusters,
  start,
  stop,
  colorMode,
  showMethylation,
  methylationData,
  summaryByPos,
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
  isClusteredView = false,
  expandedClusterIds,
  toggleClusterExpansion,
  clusterThreshold = 0,
  onClusterThresholdChange,
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

  // Build mixed RowItem array: clusters + expanded groups
  const rowItems: RowItem[] = useMemo(() => {
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
  }, [isClusteredView, clusters, displayGroups, expandedClusterIds, groupByHash])

  // Pre-compute population stats for each row (used for background tint + left panel bars)
  const populationStatsByRow: (PopulationStats | null)[] = useMemo(() => {
    if (!sampleMetadata || sampleMetadata.size === 0) {
      return rowItems.map(() => null)
    }
    return rowItems.map((item) => {
      if (item.type === 'group') {
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

  // Compute row Y offsets and total height
  const { rowOffsets, totalHeight } = useMemo(() => {
    const offsets: number[] = []
    let cumY = 0
    for (const item of rowItems) {
      offsets.push(cumY)
      if (item.type === 'cluster') {
        // Clusters are a single row
        cumY += VARIANT_ROW_HEIGHT
      } else {
        const group = item.group
        const showGroupMqtl = showMqtl && mqtlData.length > 0 && (() => {
          const groupVarPositions = new Set(group.variants.variants.map((v) => v.pos))
          return mqtlData.some(
            (d: any) => groupVarPositions.has(d.variant_pos) && -Math.log10(d.p_value) >= mqtlMinLogP
          )
        })()
        let h = VARIANT_ROW_HEIGHT
        if (showMethylation) h += METH_TRACK_HEIGHT
        if (showGroupMqtl) h += MQTL_PAD + MQTL_TRACK_HEIGHT
        cumY += h
      }
    }
    return { rowOffsets: offsets, totalHeight: cumY }
  }, [rowItems, showMethylation, showMqtl, mqtlData, mqtlMinLogP])

  // Refs for scroll-sync (avoids stale closure in debounced callback)
  const rowOffsetsRef = useRef(rowOffsets)
  rowOffsetsRef.current = rowOffsets
  const rowItemsRef = useRef(rowItems)
  rowItemsRef.current = rowItems

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
  const leftPanelWidthRef = useRef(200)
  const centerWidthRef = useRef(0)
  const rightPanelWidthRef = useRef(180)

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
      deckRef.current.deck.setProps({
        viewState: {
          'left-panel': { target: [lw / 2, yTarget, 0], zoom: 0 },
          'center-panel': { target: [cw / 2, yTarget, 0], zoom: 0 },
          'right-panel': { target: [rw / 2, yTarget, 0], zoom: 0 },
        },
      })
    }

    debouncedGroupChange(newScrollTop)
  }, [debouncedGroupChange])

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
            scrollContainerRef.current.scrollTop = rowOffsets[i]
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
          const y = rowOffsets[i] + ROW_CENTER_Y
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
        positions.set(item.cluster.cluster_id, rowOffsets[i] + ROW_CENTER_Y)
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
  const { scalePosition, centerPanelWidth: centerWidth } = useContext(RegionViewerContext)

  const leftPanelWidth = 200
  const rightPanelWidth = 180
  const totalWidth = leftPanelWidth + centerWidth + rightPanelWidth
  const showRightPanel = showGenealogy && genealogyResult && leafYPositions.size > 0

  // Keep panel width refs in sync for the imperative scroll handler
  leftPanelWidthRef.current = leftPanelWidth
  centerWidthRef.current = centerWidth
  rightPanelWidthRef.current = rightPanelWidth

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{ maxHeight: SCROLL_CONTAINER_HEIGHT, overflowY: 'auto', position: 'relative' }}
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
          summaryByPos={summaryByPos}
          variantCircleRadius={variantCircleRadius}
          mqtlData={mqtlData}
          showMqtl={showMqtl}
          mqtlMinLogP={mqtlMinLogP}
          sampleMetadata={sampleMetadata}
          hoveredVariantPosition={hoveredVariantPosition}
          scalePosition={scalePosition}
          width={centerWidth}
          totalHeight={totalHeight}
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
          isClusteredView={isClusteredView}
          populationStatsByRow={populationStatsByRow}
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
  haplotypeGroups: HaplotypeGroup[]
  rowItems: RowItem[]
  start: number
  stop: number
  colorMode: string
  showMethylation: boolean
  methylationData: Methylation[]
  summaryByPos: Map<number, { mean: number; std: number }>
  variantCircleRadius: number
  mqtlData: any[]
  showMqtl: boolean
  mqtlMinLogP: number
  sampleMetadata?: SampleMetadataMap
  hoveredVariantPosition?: number | null
  scalePosition: (input: number) => number
  width: number
  totalHeight: number
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
  isClusteredView: boolean
  populationStatsByRow: (PopulationStats | null)[]
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
  haplotypeGroups,
  rowItems,
  start,
  stop,
  colorMode,
  showMethylation,
  methylationData,
  summaryByPos,
  variantCircleRadius,
  mqtlData,
  showMqtl,
  mqtlMinLogP,
  sampleMetadata,
  hoveredVariantPosition,
  scalePosition,
  width,
  totalHeight,
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
  isClusteredView,
  populationStatsByRow,
}: DeckGLCanvasProps) {
  const canvasWidth = width

  const viewportHeight = Math.min(SCROLL_CONTAINER_HEIGHT, totalHeight || 1)

  // Keep dimension refs in sync so the imperative scroll handler can read them
  canvasWidthRef.current = canvasWidth
  viewportHeightRef.current = viewportHeight

  // Left panel data arrays for DeckGL layers
  type LeftPanelCircle = { position: [number, number, number]; color: [number, number, number, number]; radius: number; tooltipText?: string }
  type LeftPanelText = { position: [number, number, number]; text: string; color: [number, number, number, number]; size: number; tooltipText?: string }
  type LeftPanelHitbox = { position: [number, number, number]; action: string; clusterId: string }
  type LeftPanelPopBar = { polygon: [number, number][]; color: [number, number, number, number] }
  type LeftPanelTreeLine = { sourcePosition: [number, number, number]; targetPosition: [number, number, number] }

  const { leftPanelCircles, leftPanelTexts, leftPanelHitboxes, leftPanelPopBars, leftPanelTreeLines } = useMemo(() => {
    const circles: LeftPanelCircle[] = []
    const texts: LeftPanelText[] = []
    const hitboxes: LeftPanelHitbox[] = []
    const popBars: LeftPanelPopBar[] = []
    const treeLines: LeftPanelTreeLine[] = []
    const isPopMode = colorMode === 'population'

    for (let i = 0; i < rowItems.length; i++) {
      const item = rowItems[i]
      const y = rowOffsets[i] + ROW_CENTER_Y

      if (item.type === 'cluster') {
        const cluster = item.cluster
        const isExpanded = expandedClusterIds?.has(cluster.cluster_id)

        // Expand/collapse triangle — prominent so users know to click
        texts.push({
          position: [8, y, 0],
          text: isExpanded ? '\u25BC' : '\u25B6',
          color: [30, 30, 30, 255],
          size: 14,
        })

        // Hitbox for click target
        hitboxes.push({
          position: [8, y, 0],
          action: 'toggle_cluster',
          clusterId: cluster.cluster_id,
        })

        if (isPopMode) {
          // Stacked population bar for cluster
          const popStats = populationStatsByRow[i]
          if (popStats && popStats.totalSamples > 0) {
            const barX = 20
            const barWidth = 80
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
              position: [barX + barWidth + 4, y, 0],
              text: String(popStats.totalSamples),
              color: [0, 0, 0, 255],
              size: 10,
              tooltipText: `${popStats.totalSamples} samples, ${cluster.member_group_hashes.length} groups`,
            })
          }
        } else {
          // Sample count circle + text
          const sampleColor = cssColorToRgba(sampleColorScale(cluster.sample_count))
          circles.push({ position: [20, y, 0], color: sampleColor, radius: 5, tooltipText: `${cluster.sample_count} samples, ${cluster.member_group_hashes.length} groups` })
          texts.push({
            position: [30, y, 0],
            text: String(cluster.sample_count),
            color: [0, 0, 0, 255],
            size: 12,
            tooltipText: `${cluster.sample_count} samples, ${cluster.member_group_hashes.length} groups`,
          })
        }
      } else {
        const group = item.group
        const indent = item.isChild ? 24 : 0

        if (isPopMode) {
          // Stacked population bar for group
          const popStats = populationStatsByRow[i]
          if (popStats && popStats.totalSamples > 0) {
            const barX = 5 + indent
            const barWidth = 80
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
              position: [barX + barWidth + 4, y, 0],
              text: String(popStats.totalSamples),
              color: [0, 0, 0, 255],
              size: 10,
              tooltipText: `Samples: ${popStats.totalSamples}`,
            })
            // Variant count after sample count
            const variantCount = group.variants.variants.length
            const variantColor = cssColorToRgba(variantColorScale(variantCount))
            circles.push({ position: [barX + barWidth + 28, y, 0], color: variantColor, radius: 4, tooltipText: `Variants: ${variantCount}` })
            texts.push({
              position: [barX + barWidth + 36, y, 0],
              text: String(variantCount),
              color: [0, 0, 0, 255],
              size: 10,
              tooltipText: `Variants: ${variantCount} variant sites above AF threshold`,
            })
          }
        } else {
          // Sample count circle + text
          const sampleColor = cssColorToRgba(sampleColorScale(group.samples.length))
          circles.push({ position: [5 + indent, y, 0], color: sampleColor, radius: 5, tooltipText: `Samples: ${group.samples.length}` })
          texts.push({
            position: [15 + indent, y, 0],
            text: String(group.samples.length),
            color: [0, 0, 0, 255],
            size: 12,
            tooltipText: `Samples: ${group.samples.length} haplotypes share this variant combination`,
          })

          // Variant count circle + text
          const variantColor = cssColorToRgba(variantColorScale(group.variants.variants.length))
          circles.push({ position: [50 + indent, y, 0], color: variantColor, radius: 5, tooltipText: `Variants: ${group.variants.variants.length}` })
          texts.push({
            position: [60 + indent, y, 0],
            text: String(group.variants.variants.length),
            color: [0, 0, 0, 255],
            size: 12,
            tooltipText: `Variants: ${group.variants.variants.length} variant sites above AF threshold`,
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

    return { leftPanelCircles: circles, leftPanelTexts: texts, leftPanelHitboxes: hitboxes, leftPanelPopBars: popBars, leftPanelTreeLines: treeLines }
  }, [rowItems, rowOffsets, expandedClusterIds, sampleColorScale, variantColorScale, colorMode, populationStatsByRow])

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
        getTextAnchor: 'start',
        getAlignmentBaseline: 'center',
        fontSettings: { sdf: true, smoothing: 0.15 },
        pickable: true,
        onHover: onHover,
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
          }
        },
      }))
    }

    return lpLayers
  }, [leftPanelCircles, leftPanelTexts, leftPanelHitboxes, leftPanelPopBars, leftPanelTreeLines, toggleClusterExpansion, onHover])

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

    if (treeLayout.nodes.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'tree-nodes',
        data: treeLayout.nodes,
        getPosition: (d: TreeNodePoint) => d.position,
        getRadius: (d: TreeNodePoint) => d.radius,
        getFillColor: (d: TreeNodePoint) => d.color,
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
    const counts = new Map<string, number>()
    if (colorMode !== 'haplotype_count') return counts
    for (const group of haplotypeGroups) {
      for (const v of group.variants.variants) {
        counts.set(v.variant_id, (counts.get(v.variant_id) || 0) + 1)
      }
    }
    return counts
  }, [colorMode, haplotypeGroups])

  // Consolidated global DeckGL layers — one layer per data type for performance at 500+ rows
  const layers = useMemo(() => {
    console.time('[perf] DeckGL global layers')
    const lod = getLodVisibility(stop - start)

    // Global data arrays — populated across all rows, rendered as single layers
    const allBgRects: BackgroundRect[] = []
    const allVariantPoints: VariantPoint[] = []
    const allBelowThresholdPoints: VariantPoint[] = []
    const allDeletionLines: StemLine[] = []
    const allSpanningRects: SpanningRect[] = []
    const allMethPoints: MethPoint[] = []
    const allMqtlArcs: MqtlArc[] = []
    const allCenterLines: { groupStart: number; groupStop: number; y: number }[] = []

    for (let gi = 0; gi < rowItems.length; gi++) {
      const item = rowItems[gi]
      const rowY = rowOffsets[gi]

      // Center line data for this row
      const centerLineStart = item.type === 'cluster' ? start : item.group.start
      const centerLineStop = item.type === 'cluster' ? stop : item.group.stop
      allCenterLines.push({ groupStart: centerLineStart, groupStop: centerLineStop, y: rowY + ROW_CENTER_Y })

      // Population-mode background tint: plurality color with proportional opacity
      const popStats = populationStatsByRow[gi]
      const isPopMode = colorMode === 'population'

      if (item.type === 'cluster') {
        const cluster = item.cluster

        let bgColor: [number, number, number, number] = [215, 225, 240, 255]
        if (isPopMode && popStats && popStats.dominantPop !== 'N/A') {
          const popRgb = cssColorToRgba(SUPERPOPULATION_COLORS[popStats.dominantPop] || SUPERPOPULATION_COLORS['N/A'])
          const alpha = Math.round(40 * popStats.dominantFraction)
          bgColor = [popRgb[0], popRgb[1], popRgb[2], Math.max(10, alpha)]
        }

        allBgRects.push({
          groupStart: start,
          groupStop: stop,
          rowY: rowY,
          color: bgColor,
          group: null as any,
        })

        for (const cv of cluster.consensus_variants) {
          if (cv.cluster_af < 0.5) continue
          const variant = cv.variant
          const alpha = clusterAfAlpha(cv.cluster_af)
          const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
          const isLarge = Math.abs(variant.allele_length || 0) >= 50
          if (cat === 'snv' && !lod.showSnvs) continue
          if ((cat === 'insertion' || cat === 'deletion') && !isLarge && !lod.showSmallIndels) continue

          // In population mode, use allele coloring for dots (background carries pop signal)
          const effectiveColorMode = isPopMode ? 'allele' : colorMode
          const baseColor = getVariantColor(
            variant, effectiveColorMode, start, stop, sampleMetadata, undefined,
            locusCounts.get(variant.variant_id) || 0, haplotypeGroups.length || 1
          )
          const color: [number, number, number, number] = [baseColor[0], baseColor[1], baseColor[2], alpha]

          if ((cat === 'deletion' || cat === 'sv') && isLarge) {
            const endPos = variant.end ?? (variant.pos + Math.abs(variant.allele_length || 0))
            allSpanningRects.push({ start: variant.pos, end: endPos, rowY, color, variant, groupHash: 0 })
          } else if (cat === 'deletion') {
            const thickness = Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)
            allDeletionLines.push({ position: variant.pos, yTop: rowY + 5, yBottom: rowY + 20, color, width: thickness, variant })
          } else {
            allVariantPoints.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: 0 })
          }
        }
      } else {
        const group = item.group

        let bgColor: [number, number, number, number] = item.isChild ? [230, 235, 250, 255] : [240, 240, 240, 255]
        if (isPopMode && popStats && popStats.dominantPop !== 'N/A') {
          const popRgb = cssColorToRgba(SUPERPOPULATION_COLORS[popStats.dominantPop] || SUPERPOPULATION_COLORS['N/A'])
          const alpha = Math.round(40 * popStats.dominantFraction)
          bgColor = [popRgb[0], popRgb[1], popRgb[2], Math.max(10, alpha)]
        }

        allBgRects.push({
          groupStart: group.start,
          groupStop: group.stop,
          rowY: rowY,
          color: bgColor,
          group,
        })

        for (const variant of group.below_threshold.variants) {
          const shape = getVariantShape(variant)
          if (shape === 'deletion') {
            allDeletionLines.push({ position: variant.pos, yTop: rowY + 8, yBottom: rowY + 17, color: [128, 128, 128, 100], width: 1, variant })
          } else {
            allBelowThresholdPoints.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: 1.5, color: [128, 128, 128, 100], variant, groupHash: group.hash })
          }
        }

        // In population mode, use allele coloring for dots (background carries pop signal)
        const effectiveColorMode = isPopMode ? 'allele' : colorMode

        for (const variant of group.variants.variants) {
          const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
          const isLarge = Math.abs(variant.allele_length || 0) >= 50
          if (cat === 'snv' && !lod.showSnvs) continue
          if ((cat === 'insertion' || cat === 'deletion') && !isLarge && !lod.showSmallIndels) continue

          const color = getVariantColor(
            variant, effectiveColorMode, start, stop, sampleMetadata, group,
            locusCounts.get(variant.variant_id) || 0, haplotypeGroups.length || 1
          )

          if ((cat === 'deletion' || cat === 'sv') && isLarge) {
            const endPos = variant.end ?? (variant.pos + Math.abs(variant.allele_length || 0))
            allSpanningRects.push({ start: variant.pos, end: endPos, rowY, color, variant, groupHash: group.hash })
          } else if (cat === 'deletion') {
            const thickness = Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)
            allDeletionLines.push({ position: variant.pos, yTop: rowY + 5, yBottom: rowY + 20, color, width: thickness, variant })
          } else {
            allVariantPoints.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: group.hash })
          }
        }

        if (showMethylation) {
          const groupSampleIds = new Set(group.samples.map((s) => s.sample_id))
          const methSampleData = methylationData.filter((d) => groupSampleIds.has(d.sample))
          if (methSampleData.length > 0) {
            const byPos = new Map<number, number[]>()
            for (const d of methSampleData) {
              const arr = byPos.get(d.pos1)
              if (arr) arr.push(d.methylation)
              else byPos.set(d.pos1, [d.methylation])
            }
            const methYScale = scaleLinear().domain([0, 100]).range([METH_TRACK_HEIGHT - 4, 4])
            const methBaseY = rowY + VARIANT_ROW_HEIGHT
            for (const [pos, values] of byPos) {
              const mean = values.reduce((a, b) => a + b, 0) / values.length
              allMethPoints.push({ position: pos, y: methBaseY + methYScale(mean), color: [74, 85, 104, 255] })
            }
          }
        }

        if (showMqtl && mqtlData.length > 0) {
          const groupVarPositions = new Set(group.variants.variants.map((v) => v.pos))
          const groupMqtl = mqtlData.filter(
            (d: any) => groupVarPositions.has(d.variant_pos) && -Math.log10(d.p_value) >= (mqtlMinLogP || 0)
          )
          if (groupMqtl.length > 0) {
            const mqtlBaseY = rowY + VARIANT_ROW_HEIGHT + (showMethylation ? METH_TRACK_HEIGHT : 0) + MQTL_PAD + MQTL_TRACK_HEIGHT
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

    // Emit consolidated global layers — one per data type

    const result: any[] = []

    if (allBgRects.length > 0) {
      result.push(new SolidPolygonLayer({
        id: 'bg-rects-layer',
        data: allBgRects,
        getPolygon: (d: BackgroundRect) => [
          [scalePosition(d.groupStart), d.rowY + 5],
          [scalePosition(d.groupStop), d.rowY + 5],
          [scalePosition(d.groupStop), d.rowY + 20],
          [scalePosition(d.groupStart), d.rowY + 20],
        ],
        getFillColor: (d: BackgroundRect) => d.color,
        pickable: false,
        updateTriggers: { getPolygon: [scalePosition] },
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
        getFillColor: (d: SpanningRect) => d.color,
        pickable: true,
        onHover: onHover,
        updateTriggers: { getPolygon: [scalePosition] },
      }))
    }

    if (allDeletionLines.length > 0) {
      result.push(new LineLayer({
        id: 'deletion-lines-layer',
        data: allDeletionLines,
        getSourcePosition: (d: StemLine) => [scalePosition(d.position), d.yTop, 0],
        getTargetPosition: (d: StemLine) => [scalePosition(d.position), d.yBottom, 0],
        getColor: (d: StemLine) => d.color,
        getWidth: (d: StemLine) => d.width,
        widthUnits: 'pixels' as const,
        pickable: true,
        onHover: onHover,
        updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
      }))
    }

    if (allBelowThresholdPoints.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'below-threshold-layer',
        data: allBelowThresholdPoints,
        getPosition: (d: VariantPoint) => [scalePosition(d.position), d.y, 0],
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
        getFillColor: (d: VariantPoint) => d.color,
        getLineColor: [0, 0, 0, 128],
        getLineWidth: 0.5,
        lineWidthUnits: 'pixels' as const,
        stroked: true,
        radiusUnits: 'pixels' as const,
        pickable: true,
        onHover: onHover,
        updateTriggers: { getPosition: [scalePosition] },
      }))
    }

    if (allMethPoints.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'methylation-layer',
        data: allMethPoints,
        getPosition: (d: MethPoint) => [scalePosition(d.position), d.y, 0],
        getRadius: 2,
        getFillColor: (d: MethPoint) => d.color,
        radiusUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: { getPosition: [scalePosition] },
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
    showMqtl,
    mqtlData,
    mqtlMinLogP,
    sampleMetadata,
    scalePosition,
    onHover,
    populationStatsByRow,
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

  // Multi-view: left panel, center (variants), right panel
  const views = useMemo(
    () => [
      new OrthographicView({ id: 'left-panel', x: 0, y: 0, width: leftPanelWidth, height: viewportHeight, flipY: true }),
      new OrthographicView({ id: 'center-panel', x: leftPanelWidth, y: 0, width: canvasWidth, height: viewportHeight, flipY: true }),
      new OrthographicView({ id: 'right-panel', x: leftPanelWidth + canvasWidth, y: 0, width: rightPanelWidth, height: viewportHeight, flipY: true }),
    ],
    [leftPanelWidth, canvasWidth, rightPanelWidth, viewportHeight]
  )

  // viewState reads from ref — on re-render (data change) it picks up current scroll position;
  // during scroll, the imperative handler in the parent updates DeckGL directly
  const yTarget = scrollTopRef.current + viewportHeight / 2
  const viewState = {
    'left-panel': { target: [leftPanelWidth / 2, yTarget, 0] as [number, number, number], zoom: 0 },
    'center-panel': { target: [canvasWidth / 2, yTarget, 0] as [number, number, number], zoom: 0 },
    'right-panel': { target: [rightPanelWidth / 2, yTarget, 0] as [number, number, number], zoom: 0 },
  }

  return (
    <div style={{ position: 'sticky', top: 0, left: 0, width: totalWidth, height: viewportHeight }}>
      <DeckGL
        ref={deckRef}
        views={views}
        viewState={viewState}
        layers={[...layers, ...(crosshairLayer ? [crosshairLayer] : []), ...leftPanelLayers, ...treeLayers]}
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
        <Tooltip x={hovered.x} y={hovered.y} object={hovered.object} viewportId={hovered.viewportId} />
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
}: {
  x: number
  y: number
  object: any
  viewportId: string
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

  // Center panel: variant tooltips
  const variant = object.variant as Variant | undefined
  if (!variant) return null

  return (
    <div style={tooltipStyle}>
      <div>
        <strong>Position:</strong> {variant.pos}
      </div>
      <div>
        <strong>Ref:</strong>{' '}
        {variant.ref.length > 10
          ? variant.ref.substring(0, 10) + '...'
          : variant.ref}
      </div>
      <div>
        <strong>Alt:</strong>{' '}
        {variant.alt.length > 10
          ? variant.alt.substring(0, 10) + '...'
          : variant.alt}
      </div>
      <div>
        <strong>AF:</strong> {variant.freq.af.toFixed(4)}
      </div>
      {variant.rsid && (
        <div>
          <strong>RSID:</strong> {variant.rsid}
        </div>
      )}
      {variant.allele_type && (
        <div>
          <strong>Type:</strong> {variant.allele_type}
        </div>
      )}
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
