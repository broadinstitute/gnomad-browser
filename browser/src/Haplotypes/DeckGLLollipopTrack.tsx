import React, { useMemo, useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { DeckGL } from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { ScatterplotLayer, LineLayer, SolidPolygonLayer, PathLayer } from '@deck.gl/layers'
import { Track } from '@gnomad/region-viewer'
import { scaleLinear, scaleLog } from 'd3-scale'
import { SUPERPOPULATION_COLORS } from './colors'
import { getVariantCategory, VARIANT_CATEGORY_COLORS, getLodVisibility } from '../LongReadVariantPage/variantUtils'
import GenealogyTreeOverlay from './GenealogyTreeOverlay'
import type { HaplotypeGroup, HaplotypeCluster, LRVariant, Methylation, MethylationSummaryPoint } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

type Variant = LRVariant

// Row height constants
const VARIANT_ROW_HEIGHT = 25
const METH_TRACK_HEIGHT = 40
const MQTL_TRACK_HEIGHT = 80
const MQTL_PAD = 8
const ROW_CENTER_Y = 12.5
const SCROLL_CONTAINER_HEIGHT = 500
const VISIBLE_BUFFER = 5 // extra groups above/below viewport to render

/** Binary-search for the first group whose bottom edge is >= scrollTop */
function findVisibleRange(
  rowOffsets: number[],
  totalHeight: number,
  scrollTop: number,
  viewportHeight: number,
): [number, number] {
  const n = rowOffsets.length
  if (n === 0) return [0, 0]
  const top = scrollTop - VISIBLE_BUFFER * VARIANT_ROW_HEIGHT
  const bottom = scrollTop + viewportHeight + VISIBLE_BUFFER * VARIANT_ROW_HEIGHT
  let startIdx = 0
  for (let i = 0; i < n; i++) {
    if (i + 1 < n ? rowOffsets[i + 1] > top : true) { startIdx = i; break }
  }
  let endIdx = n - 1
  for (let i = startIdx; i < n; i++) {
    if (rowOffsets[i] > bottom) { endIdx = i - 1; break }
    endIdx = i
  }
  return [Math.max(0, startIdx - VISIBLE_BUFFER), Math.min(n - 1, endIdx + VISIBLE_BUFFER)]
}

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

type DeckGLLollipopTrackProps = {
  displayGroups: HaplotypeGroup[]
  haplotypeGroups: HaplotypeGroup[]
  clusters?: HaplotypeCluster[]
  start: number
  stop: number
  colorMode: string
  showMethylation: boolean
  methylationData: Methylation[]
  methylationSummary?: MethylationSummaryPoint[]
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
    type: 'variant' | 'group'
  } | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // scrollTop as ref — avoids React re-renders on every scroll event.
  // Only lpScrollTop (debounced) triggers re-renders for SVG label virtualization.
  const scrollTopRef = useRef(0)
  const [lpScrollTop, setLpScrollTop] = useState(0)

  // Build a hash->group lookup for cluster expansion
  const groupByHash = useMemo(() => {
    const map = new Map<string, HaplotypeGroup>()
    for (const g of displayGroups) {
      map.set(String(g.hash), g)
    }
    return map
  }, [displayGroups])

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

  // Ref to the DeckGL canvas wrapper for imperative positioning
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  // Ref to the DeckGL instance for imperative viewState updates
  const deckRef = useRef<any>(null)

  // Deferred callbacks — only fire when scroll STOPS (300ms idle).
  // During active scrolling, only imperative DOM/DeckGL updates run (zero React).
  const deferredScrollCallbacks = useMemo(
    () => {
      let timer: ReturnType<typeof setTimeout> | null = null
      return (newScrollTop: number) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          // Update SVG left panel virtualization (triggers React re-render)
          setLpScrollTop(newScrollTop)
          // Notify parent of visible group change
          if (!onVisibleGroupChange || rowOffsetsRef.current.length === 0) return
          let visibleIdx = 0
          for (let i = 0; i < rowOffsetsRef.current.length; i++) {
            if (rowOffsetsRef.current[i] <= newScrollTop) visibleIdx = i
            else break
          }
          const item = rowItemsRef.current[visibleIdx]
          if (item?.type === 'group') {
            onVisibleGroupChange(item.group)
          }
        }, 300)
      }
    },
    [onVisibleGroupChange]
  )

  // Scroll handler: imperative DOM + DeckGL updates (no React re-render),
  // with debounced callback for SVG labels and group sync.
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = (e.target as HTMLDivElement).scrollTop
    scrollTopRef.current = newScrollTop

    // Imperative canvas positioning — bypasses React entirely
    if (canvasWrapperRef.current) {
      canvasWrapperRef.current.style.top = `${newScrollTop}px`
    }

    // Imperative DeckGL viewState update — bypasses React layer diffing
    if (deckRef.current) {
      const vw = canvasWrapperRef.current?.clientWidth || 0
      const vh = canvasWrapperRef.current?.clientHeight || 0
      deckRef.current.deck.setProps({
        viewState: { target: [vw / 2, newScrollTop + vh / 2, 0], zoom: 0 },
      })
    }

    deferredScrollCallbacks(newScrollTop)
  }, [deferredScrollCallbacks])

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
          type: info.object.variant ? 'variant' : 'group',
        })
      } else {
        setHovered(null)
      }
    },
    []
  )

  // Compute visible group range for left panel virtualization
  const viewportH = Math.min(SCROLL_CONTAINER_HEIGHT, totalHeight || 1)
  const [lpStart, lpEnd] = useMemo(
    () => findVisibleRange(rowOffsets, totalHeight, lpScrollTop, viewportH),
    [rowOffsets, totalHeight, lpScrollTop, viewportH]
  )

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{ maxHeight: SCROLL_CONTAINER_HEIGHT, overflowY: 'auto' }}
    >
    <Track
      renderLeftPanel={() => {
        const labelsWidth = 200
        return (
          <div style={{ width: labelsWidth }}>
            <svg width={labelsWidth} height={totalHeight}>
              {rowItems.map((item, i) => {
                if (i < lpStart || i > lpEnd) return null
                const y = rowOffsets[i]
                if (item.type === 'cluster') {
                  const cluster = item.cluster
                  const isExpanded = expandedClusterIds?.has(cluster.cluster_id)
                  return (
                    <g
                      key={`cluster-${cluster.cluster_id}`}
                      transform={`translate(0, ${y})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleClusterExpansion?.(cluster.cluster_id)}
                    >
                      <text x={2} y={17} fontSize='11' fill='#555'>
                        {isExpanded ? '\u25BC' : '\u25B6'}
                      </text>
                      <circle cx={20} cy={12.5} r={5} fill={sampleColorScale(cluster.sample_count)} />
                      <text x={30} y={17} fontSize='12'>
                        {cluster.sample_count}
                      </text>
                      <text x={60} y={17} fontSize='10' fill='#888'>
                        ({cluster.member_group_hashes.length}g)
                      </text>
                    </g>
                  )
                }
                const group = item.group
                const indent = item.isChild ? 12 : 0
                return (
                  <g key={`group-${group.hash}`} transform={`translate(${indent}, ${y})`}>
                    <circle cx={5} cy={12.5} r={5} fill={sampleColorScale(group.samples.length)} />
                    <text x={15} y={17} fontSize='12'>
                      {group.samples.length}
                    </text>
                    <circle
                      cx={50}
                      cy={12.5}
                      r={5}
                      fill={variantColorScale(group.variants.variants.length)}
                    />
                    <text x={60} y={17} fontSize='12'>
                      {group.variants.variants.length}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        )
      }}
      renderRightPanel={showGenealogy && genealogyResult && leafYPositions.size > 0
        ? () => (
          <div style={{ width: 180, height: totalHeight, overflow: 'hidden' }}>
            <GenealogyTreeOverlay
              tree={genealogyResult!.tree}
              leafYPositions={leafYPositions}
              panelWidth={180}
              totalHeight={totalHeight}
              groups={displayGroups}
              sampleMetadata={sampleMetadata}
              clusterThreshold={clusterThreshold}
              onClusterThresholdChange={onClusterThresholdChange}
              expandedClusterIds={expandedClusterIds}
              toggleClusterExpansion={toggleClusterExpansion}
              clusters={clusters}
              rowYPositions={rowYPositions}
              isClusteredView={isClusteredView}
            />
          </div>
        )
        : undefined
      }
    >
      {({
        scalePosition,
        width,
      }: {
        scalePosition: (input: number) => number
        width: number
      }) => (
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
          width={width}
          totalHeight={totalHeight}
          rowOffsets={rowOffsets}
          hovered={hovered}
          onHover={onHover}
          canvasWrapperRef={canvasWrapperRef}
          deckRef={deckRef}
        />
      )}
    </Track>
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
  rowOffsets: number[]
  hovered: any
  onHover: (info: any) => void
  canvasWrapperRef: React.RefObject<HTMLDivElement | null>
  deckRef: React.RefObject<any>
}

/** Compute alpha for cluster consensus AF: filter < 0.5, scale 50-255 for 0.5-0.9, 255 for >= 0.9 */
function clusterAfAlpha(clusterAf: number): number {
  if (clusterAf >= 0.9) return 255
  // 0.5 <= af < 0.9 => scale 50..255
  return Math.round(50 + ((clusterAf - 0.5) / 0.4) * 205)
}

// Inner component that receives scalePosition from Track render prop.
// React.memo prevents re-render during scroll — all scroll-driven updates
// happen imperatively via refs (canvasWrapperRef + deckRef).
const DeckGLLollipopCanvas = React.memo(function DeckGLLollipopCanvas({
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
  rowOffsets,
  hovered,
  onHover,
  canvasWrapperRef,
  deckRef,
}: DeckGLCanvasProps) {
  // Canvas uses full width — RegionViewer's rightPanelWidth handles space for genealogy tree
  const canvasWidth = width

  // Stabilize scalePosition — Track's render prop creates a new function each render,
  // but the underlying scale doesn't change unless the region changes. Use a ref so
  // downstream useMemos that depend on it don't invalidate on every parent re-render.
  const scalePositionRef = useRef(scalePosition)
  scalePositionRef.current = scalePosition
  const stableScalePosition = useCallback((pos: number) => scalePositionRef.current(pos), [])

  const viewportHeight = Math.min(SCROLL_CONTAINER_HEIGHT, totalHeight || 1)

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

  // Per-row DeckGL layers for stable animations across expand/collapse
  const layers = useMemo(() => {
    console.time('[perf] DeckGL per-row layers')
    const lod = getLodVisibility(stop - start)
    const result: any[] = []

    for (let gi = 0; gi < rowItems.length; gi++) {
      const item = rowItems[gi]
      const rowY = rowOffsets[gi]
      const rowId = item.type === 'cluster'
        ? `cluster-${item.cluster.cluster_id}`
        : `group-${item.group.hash}`

      // Per-row data arrays
      const rowBgRects: BackgroundRect[] = []
      const rowVariantPoints: VariantPoint[] = []
      const rowBelowThresholdPoints: VariantPoint[] = []
      const rowDeletionLines: StemLine[] = []
      const rowSpanningRects: SpanningRect[] = []
      const rowMethPoints: MethPoint[] = []
      const rowMqtlArcs: MqtlArc[] = []

      // Center line data for this row
      const centerLineStart = item.type === 'cluster' ? start : item.group.start
      const centerLineStop = item.type === 'cluster' ? stop : item.group.stop

      if (item.type === 'cluster') {
        const cluster = item.cluster

        rowBgRects.push({
          groupStart: start,
          groupStop: stop,
          rowY: rowY,
          color: [230, 240, 255, 255],
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

          const baseColor = getVariantColor(
            variant, colorMode, start, stop, sampleMetadata, undefined,
            locusCounts.get(variant.variant_id) || 0, haplotypeGroups.length || 1
          )
          const color: [number, number, number, number] = [baseColor[0], baseColor[1], baseColor[2], alpha]

          if ((cat === 'deletion' || cat === 'sv') && isLarge) {
            const endPos = variant.end ?? (variant.pos + Math.abs(variant.allele_length || 0))
            rowSpanningRects.push({ start: variant.pos, end: endPos, rowY, color, variant, groupHash: 0 })
          } else if (cat === 'deletion') {
            const thickness = Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)
            rowDeletionLines.push({ position: variant.pos, yTop: rowY + 5, yBottom: rowY + 20, color, width: thickness, variant })
          } else {
            rowVariantPoints.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: 0 })
          }
        }
      } else {
        const group = item.group

        rowBgRects.push({
          groupStart: group.start,
          groupStop: group.stop,
          rowY: rowY,
          color: item.isChild ? [245, 245, 255, 255] : [240, 240, 240, 255],
          group,
        })

        for (const variant of group.below_threshold.variants) {
          const shape = getVariantShape(variant)
          if (shape === 'deletion') {
            rowDeletionLines.push({ position: variant.pos, yTop: rowY + 8, yBottom: rowY + 17, color: [128, 128, 128, 100], width: 1, variant })
          } else {
            rowBelowThresholdPoints.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: 1.5, color: [128, 128, 128, 100], variant, groupHash: group.hash })
          }
        }

        for (const variant of group.variants.variants) {
          const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
          const isLarge = Math.abs(variant.allele_length || 0) >= 50
          if (cat === 'snv' && !lod.showSnvs) continue
          if ((cat === 'insertion' || cat === 'deletion') && !isLarge && !lod.showSmallIndels) continue

          const color = getVariantColor(
            variant, colorMode, start, stop, sampleMetadata, group,
            locusCounts.get(variant.variant_id) || 0, haplotypeGroups.length || 1
          )

          if ((cat === 'deletion' || cat === 'sv') && isLarge) {
            const endPos = variant.end ?? (variant.pos + Math.abs(variant.allele_length || 0))
            rowSpanningRects.push({ start: variant.pos, end: endPos, rowY, color, variant, groupHash: group.hash })
          } else if (cat === 'deletion') {
            const thickness = Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)
            rowDeletionLines.push({ position: variant.pos, yTop: rowY + 5, yBottom: rowY + 20, color, width: thickness, variant })
          } else {
            rowVariantPoints.push({ position: variant.pos, y: rowY + ROW_CENTER_Y, radius: variantCircleRadius, color, variant, groupHash: group.hash })
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
              rowMethPoints.push({ position: pos, y: methBaseY + methYScale(mean), color: [74, 85, 104, 255] })
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
              rowMqtlArcs.push({
                variantPos: d.variant_pos, cpgPos: d.cpg_pos, arcHeight: arcH, baseY: mqtlBaseY,
                color: isPositive ? [220, 38, 38, opacity] : [37, 99, 235, opacity], width: 1.5,
              })
            }
          }
        }
      }

      // Emit per-row layers with stable IDs

      if (rowBgRects.length > 0) {
        result.push(new SolidPolygonLayer({
          id: `bg-rects-${rowId}`,
          data: rowBgRects,
          getPolygon: (d: BackgroundRect) => [
            [stableScalePosition(d.groupStart), d.rowY + 5],
            [stableScalePosition(d.groupStop), d.rowY + 5],
            [stableScalePosition(d.groupStop), d.rowY + 20],
            [stableScalePosition(d.groupStart), d.rowY + 20],
          ],
          getFillColor: (d: BackgroundRect) => d.color,
          pickable: false,
          updateTriggers: { getPolygon: [stableScalePosition, rowY] },
          transitions: { getPolygon: { duration: 300 } },
        }))
      }

      // Center line
      result.push(new LineLayer({
        id: `center-line-${rowId}`,
        data: [{ groupStart: centerLineStart, groupStop: centerLineStop, y: rowY + ROW_CENTER_Y }],
        getSourcePosition: (d: any) => [stableScalePosition(d.groupStart), d.y, 0],
        getTargetPosition: (d: any) => [stableScalePosition(d.groupStop), d.y, 0],
        getColor: [168, 168, 168, 255],
        getWidth: 1,
        widthUnits: 'pixels' as const,
        pickable: false,
        updateTriggers: { getSourcePosition: [stableScalePosition, rowY], getTargetPosition: [stableScalePosition, rowY] },
        transitions: { getSourcePosition: { duration: 300 }, getTargetPosition: { duration: 300 } },
      }))

      if (rowSpanningRects.length > 0) {
        result.push(new SolidPolygonLayer({
          id: `sv-spanning-rects-${rowId}`,
          data: rowSpanningRects,
          getPolygon: (d: SpanningRect) => {
            const x1 = stableScalePosition(d.start)
            const x2 = Math.max(stableScalePosition(d.end), x1 + 2)
            const yTop = d.rowY + ROW_CENTER_Y - 4
            const yBot = d.rowY + ROW_CENTER_Y + 4
            return [[x1, yTop], [x2, yTop], [x2, yBot], [x1, yBot]]
          },
          getFillColor: (d: SpanningRect) => d.color,
          pickable: true,
          onHover: onHover,
          updateTriggers: { getPolygon: [stableScalePosition, rowY] },
          transitions: { getPolygon: { duration: 300 } },
        }))
      }

      if (rowDeletionLines.length > 0) {
        result.push(new LineLayer({
          id: `deletion-lines-${rowId}`,
          data: rowDeletionLines,
          getSourcePosition: (d: StemLine) => [stableScalePosition(d.position), d.yTop, 0],
          getTargetPosition: (d: StemLine) => [stableScalePosition(d.position), d.yBottom, 0],
          getColor: (d: StemLine) => d.color,
          getWidth: (d: StemLine) => d.width,
          widthUnits: 'pixels' as const,
          pickable: true,
          onHover: onHover,
          updateTriggers: { getSourcePosition: [stableScalePosition, rowY], getTargetPosition: [stableScalePosition, rowY] },
          transitions: { getSourcePosition: { duration: 300 }, getTargetPosition: { duration: 300 } },
        }))
      }

      if (rowBelowThresholdPoints.length > 0) {
        result.push(new ScatterplotLayer({
          id: `below-threshold-${rowId}`,
          data: rowBelowThresholdPoints,
          getPosition: (d: VariantPoint) => [stableScalePosition(d.position), d.y, 0],
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
          updateTriggers: { getPosition: [stableScalePosition, rowY] },
          transitions: { getPosition: { duration: 300 } },
        }))
      }

      if (rowVariantPoints.length > 0) {
        result.push(new ScatterplotLayer({
          id: `variants-${rowId}`,
          data: rowVariantPoints,
          getPosition: (d: VariantPoint) => [stableScalePosition(d.position), d.y, 0],
          getRadius: (d: VariantPoint) => d.radius,
          getFillColor: (d: VariantPoint) => d.color,
          getLineColor: [0, 0, 0, 128],
          getLineWidth: 0.5,
          lineWidthUnits: 'pixels' as const,
          stroked: true,
          radiusUnits: 'pixels' as const,
          pickable: true,
          onHover: onHover,
          updateTriggers: { getPosition: [stableScalePosition, rowY] },
          transitions: { getPosition: { duration: 300 } },
        }))
      }

      if (rowMethPoints.length > 0) {
        result.push(new ScatterplotLayer({
          id: `methylation-${rowId}`,
          data: rowMethPoints,
          getPosition: (d: MethPoint) => [stableScalePosition(d.position), d.y, 0],
          getRadius: 2,
          getFillColor: (d: MethPoint) => d.color,
          radiusUnits: 'pixels' as const,
          pickable: false,
          updateTriggers: { getPosition: [stableScalePosition, rowY] },
        }))
      }

      if (rowMqtlArcs.length > 0) {
        result.push(new PathLayer({
          id: `mqtl-arcs-${rowId}`,
          data: rowMqtlArcs,
          getPath: (d: MqtlArc) => {
            const vx = stableScalePosition(d.variantPos)
            const cx = stableScalePosition(d.cpgPos)
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
          updateTriggers: { getPath: [stableScalePosition, rowY] },
        }))
      }
    }

    console.timeEnd('[perf] DeckGL per-row layers')
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
    stableScalePosition,
    onHover,
    totalHeight,
  ])

  // Crosshair layer — decoupled so hover doesn't rebuild all variant layers
  const crosshairLayer = useMemo(() => {
    if (hoveredVariantPosition == null) return null
    return new LineLayer({
      id: 'crosshair',
      data: [{ position: hoveredVariantPosition, yTop: 0, yBottom: totalHeight }],
      getSourcePosition: (d: any) => [stableScalePosition(d.position), d.yTop, 0],
      getTargetPosition: (d: any) => [stableScalePosition(d.position), d.yBottom, 0],
      getColor: [0, 0, 0, 128],
      getWidth: 1,
      widthUnits: 'pixels' as const,
      pickable: false,
      updateTriggers: { getSourcePosition: [stableScalePosition], getTargetPosition: [stableScalePosition] },
    })
  }, [hoveredVariantPosition, stableScalePosition, totalHeight])

  const view = useMemo(
    () => new OrthographicView({ id: 'main', flipY: true }),
    []
  )

  // Initial viewState — subsequent updates happen imperatively via deckRef in scroll handler
  const viewState = useMemo(
    () => ({
      target: [canvasWidth / 2, 0 + viewportHeight / 2, 0] as [number, number, number],
      zoom: 0,
    }),
    [canvasWidth, viewportHeight]
  )

  // Combine layers once — avoid creating a new array on every render
  const allLayers = useMemo(
    () => crosshairLayer ? [...layers, crosshairLayer] : layers,
    [layers, crosshairLayer]
  )

  return (
    <div style={{ position: 'relative', width: canvasWidth, height: totalHeight }}>
      <div ref={canvasWrapperRef} style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth, height: viewportHeight }}>
        <DeckGL
          ref={deckRef}
          views={view}
          viewState={viewState}
          layers={allLayers}
          controller={false}
          pickingRadius={5}
          style={{ position: 'absolute', left: '0', top: '0', width: `${canvasWidth}px`, height: `${viewportHeight}px` }}
          width={canvasWidth}
          height={viewportHeight}
        />
        {hovered && hovered.object && (
          <Tooltip x={hovered.x} y={hovered.y} object={hovered.object} type={hovered.type} />
        )}
      </div>
    </div>
  )
})

// Simple tooltip overlay
function Tooltip({
  x,
  y,
  object,
  type,
}: {
  x: number
  y: number
  object: any
  type: 'variant' | 'group'
}) {
  const variant = object.variant as Variant | undefined
  if (!variant) return null

  return (
    <div
      style={{
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
      }}
    >
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
