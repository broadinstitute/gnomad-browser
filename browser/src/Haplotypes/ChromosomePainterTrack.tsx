import React, { useMemo, useState, useCallback, useRef, useContext } from 'react'
import { DeckGL } from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { SolidPolygonLayer, ScatterplotLayer, LineLayer, TextLayer } from '@deck.gl/layers'
import { RegionViewerContext } from '@gnomad/region-viewer'
import { buildGenealogyTreeLayout } from './genealogyTreeLayout'
import type { TreeBranch, TreeNodePoint, TreeClusterMarker, TreeLayout } from './genealogyTreeLayout'
import type {
  HaplotypeGroup,
  HaplotypeCluster,
  LRVariant,
} from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

// --- Constants ---
const VARIANT_ROW_HEIGHT = 25
const SCROLL_CONTAINER_HEIGHT = 500
const NUM_BINS = 100

// --- Reuse RowItem discriminated union from DeckGLLollipopTrack ---
type RowItem =
  | { type: 'cluster'; cluster: HaplotypeCluster }
  | { type: 'group'; group: HaplotypeGroup; isChild: boolean }

// --- Color helpers (reuse getColorByHash from DeckGLLollipopTrack) ---
function hslToRgba(hsl: string, alpha = 255): [number, number, number, number] {
  const match = hsl.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/)
  if (!match) return [128, 128, 128, alpha]
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
    return [parseInt(clean[0] + clean[0], 16), parseInt(clean[1] + clean[1], 16), parseInt(clean[2] + clean[2], 16), alpha]
  }
  if (clean.length === 6) {
    return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16), alpha]
  }
  return [128, 128, 128, alpha]
}

function cssColorToRgba(color: string, alpha = 255): [number, number, number, number] {
  if (!color) return [128, 128, 128, alpha]
  if (color.startsWith('hsl')) return hslToRgba(color, alpha)
  if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (match) return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), alpha]
  }
  if (color.startsWith('#')) return hexToRgba(color, alpha)
  return [128, 128, 128, alpha]
}

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

/** Compute alpha for cluster consensus AF */
function clusterAfAlpha(clusterAf: number): number {
  if (clusterAf >= 0.9) return 255
  return Math.round(50 + ((clusterAf - 0.5) / 0.4) * 205)
}

/** Check if a variant is an SV (>=50bp or tandem repeat) */
function isSV(v: LRVariant): boolean {
  return Math.abs(v.allele_length || 0) >= 50 || (v.allele_type || '').toLowerCase() === 'trv'
}

// --- Segment type for DeckGL ---
type PaintedSegment = {
  binStart: number // genomic coordinate
  binStop: number // genomic coordinate
  rowY: number
  color: [number, number, number, number]
  variant: LRVariant | null
}

// --- Props ---
type ChromosomePainterTrackProps = {
  displayGroups: HaplotypeGroup[]
  haplotypeGroups: HaplotypeGroup[]
  clusters?: HaplotypeCluster[]
  start: number
  stop: number
  sampleColorScale: (n: number) => string
  variantColorScale: (n: number) => string
  sampleMetadata?: SampleMetadataMap
  isClusteredView?: boolean
  expandedClusterIds?: Set<string>
  toggleClusterExpansion?: (clusterId: string) => void
  showGenealogy?: boolean
  genealogyResult?: { tree: any; leafOrder: number[] } | null
  clusterThreshold?: number
  onClusterThresholdChange?: (threshold: number) => void
}

const NEUTRAL_COLOR: [number, number, number, number] = [240, 240, 240, 255]

const ChromosomePainterTrack: React.FC<ChromosomePainterTrackProps> = ({
  displayGroups,
  clusters,
  start,
  stop,
  sampleColorScale,
  variantColorScale,
  sampleMetadata,
  isClusteredView = false,
  expandedClusterIds,
  toggleClusterExpansion,
  showGenealogy = false,
  genealogyResult,
  clusterThreshold = 0,
  onClusterThresholdChange,
}) => {
  const [hovered, setHovered] = useState<{
    x: number
    y: number
    object: any
    viewportId: string
  } | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollTopRef = useRef(0)
  const deckRef = useRef<any>(null)

  // Build hash->group lookup
  const groupByHash = useMemo(() => {
    const map = new Map<string, HaplotypeGroup>()
    for (const g of displayGroups) {
      map.set(String(g.hash), g)
    }
    return map
  }, [displayGroups])

  // Build mixed RowItem array
  const rowItems: RowItem[] = useMemo(() => {
    if (!isClusteredView || !clusters || clusters.length === 0) {
      return displayGroups.map((group) => ({ type: 'group' as const, group, isChild: false }))
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

  // Compute row offsets (simplified: every row is VARIANT_ROW_HEIGHT)
  const { rowOffsets, totalHeight } = useMemo(() => {
    const offsets: number[] = []
    let cumY = 0
    for (let i = 0; i < rowItems.length; i++) {
      offsets.push(cumY)
      cumY += VARIANT_ROW_HEIGHT
    }
    return { rowOffsets: offsets, totalHeight: cumY }
  }, [rowItems])

  // Refs for canvas dimensions — avoids stale closures in scroll handler
  const centerWidthRef = useRef(0)
  const viewportHeightRef = useRef(0)

  const LEFT_PANEL_WIDTH = 200
  const RIGHT_PANEL_WIDTH = 180

  // Imperative scroll handler — updates DeckGL camera directly, no React re-render
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = (e.target as HTMLDivElement).scrollTop
    scrollTopRef.current = newScrollTop

    if (deckRef.current?.deck) {
      const vh = viewportHeightRef.current
      const cw = centerWidthRef.current
      const yTarget = newScrollTop + vh / 2
      deckRef.current.deck.setProps({
        viewState: {
          'left-panel': { target: [LEFT_PANEL_WIDTH / 2, yTarget, 0], zoom: 0 },
          'center-panel': { target: [cw / 2, yTarget, 0], zoom: 0 },
          'right-panel': { target: [RIGHT_PANEL_WIDTH / 2, yTarget, 0], zoom: 0 },
        },
      })
    }
  }, [])

  // Compute leaf Y positions for genealogy tree overlay
  const leafYPositions = useMemo(() => {
    const positions = new Map<number, number>()
    if (showGenealogy && genealogyResult) {
      rowItems.forEach((item, i) => {
        if (item.type === 'group') {
          positions.set(item.group.hash, rowOffsets[i] + VARIANT_ROW_HEIGHT / 2)
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
        positions.set(String(item.group.hash), rowOffsets[i] + VARIANT_ROW_HEIGHT / 2)
      } else if (item.type === 'cluster') {
        positions.set(item.cluster.cluster_id, rowOffsets[i] + VARIANT_ROW_HEIGHT / 2)
      }
    })
    return positions
  }, [rowItems, rowOffsets])

  const onHover = useCallback((info: any) => {
    if (info.picked && info.object) {
      setHovered({ x: info.x, y: info.y, object: info.object, viewportId: info.viewport?.id || 'center-panel' })
    } else {
      setHovered(null)
    }
  }, [])

  // Consume RegionViewerContext directly — bypass Track component
  const { scalePosition, centerPanelWidth: centerWidth } = useContext(RegionViewerContext)

  const totalWidth = LEFT_PANEL_WIDTH + centerWidth + RIGHT_PANEL_WIDTH
  const showRightPanel = showGenealogy && genealogyResult && leafYPositions.size > 0

  // Keep dimension refs in sync
  centerWidthRef.current = centerWidth

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{ maxHeight: SCROLL_CONTAINER_HEIGHT, overflowY: 'auto', position: 'relative' }}
    >
      {/* Spacer div — establishes native scrollable height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* DeckGL canvas — multi-view, sticky to viewport */}
        <ChromosomePainterCanvas
          rowItems={rowItems}
          rowOffsets={rowOffsets}
          totalHeight={totalHeight}
          totalWidth={totalWidth}
          leftPanelWidth={LEFT_PANEL_WIDTH}
          rightPanelWidth={RIGHT_PANEL_WIDTH}
          start={start}
          stop={stop}
          scalePosition={scalePosition}
          width={centerWidth}
          hovered={hovered}
          onHover={onHover}
          deckRef={deckRef}
          scrollTopRef={scrollTopRef}
          viewportHeightRef={viewportHeightRef}
          sampleColorScale={sampleColorScale}
          variantColorScale={variantColorScale}
          expandedClusterIds={expandedClusterIds}
          toggleClusterExpansion={toggleClusterExpansion}
          showGenealogy={showGenealogy}
          genealogyResult={genealogyResult}
          leafYPositions={leafYPositions}
          rowYPositions={rowYPositions}
          displayGroups={displayGroups}
          sampleMetadata={sampleMetadata}
          clusterThreshold={clusterThreshold}
          onClusterThresholdChange={onClusterThresholdChange}
          clusters={clusters}
          isClusteredView={isClusteredView}
        />

        {/* Threshold drag overlay — positioned over right panel, scrolls natively */}
        {showRightPanel && (
          <CPThresholdDragOverlay
            leftPanelWidth={LEFT_PANEL_WIDTH}
            centerWidth={centerWidth}
            rightPanelWidth={RIGHT_PANEL_WIDTH}
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
}

export default ChromosomePainterTrack

// --- Inner DeckGL canvas component ---

type CanvasProps = {
  rowItems: RowItem[]
  rowOffsets: number[]
  totalHeight: number
  totalWidth: number
  leftPanelWidth: number
  rightPanelWidth: number
  start: number
  stop: number
  scalePosition: (input: number) => number
  width: number
  hovered: { x: number; y: number; object: any; viewportId: string } | null
  onHover: (info: any) => void
  deckRef: React.MutableRefObject<any>
  scrollTopRef: React.MutableRefObject<number>
  viewportHeightRef: React.MutableRefObject<number>
  sampleColorScale: (n: number) => string
  variantColorScale: (n: number) => string
  expandedClusterIds?: Set<string>
  toggleClusterExpansion?: (clusterId: string) => void
  showGenealogy: boolean
  genealogyResult?: { tree: any; leafOrder: number[] } | null
  leafYPositions: Map<number, number>
  rowYPositions: Map<string, number>
  displayGroups: HaplotypeGroup[]
  sampleMetadata?: SampleMetadataMap
  clusterThreshold: number
  onClusterThresholdChange?: (threshold: number) => void
  clusters?: HaplotypeCluster[]
  isClusteredView: boolean
}

function ChromosomePainterCanvas({
  rowItems,
  rowOffsets,
  totalHeight,
  totalWidth,
  leftPanelWidth,
  rightPanelWidth,
  start,
  stop,
  scalePosition,
  width,
  hovered,
  onHover,
  deckRef,
  scrollTopRef,
  viewportHeightRef,
  sampleColorScale,
  variantColorScale,
  expandedClusterIds,
  toggleClusterExpansion,
  showGenealogy,
  genealogyResult,
  leafYPositions,
  rowYPositions,
  displayGroups,
  sampleMetadata,
  clusterThreshold,
  onClusterThresholdChange,
  clusters,
  isClusteredView,
}: CanvasProps) {
  const viewportHeight = Math.min(SCROLL_CONTAINER_HEIGHT, totalHeight || 1)
  const binSize = (stop - start) / NUM_BINS

  // Keep dimension ref in sync
  viewportHeightRef.current = viewportHeight

  // Consolidated global DeckGL layers — single SolidPolygonLayer for all painted segments
  const layers = useMemo(() => {
    const allPaintedSegments: PaintedSegment[] = []

    for (let gi = 0; gi < rowItems.length; gi++) {
      const item = rowItems[gi]
      const rowY = rowOffsets[gi]

      // Initialize bins (per-row computation, pushed to global array)
      const binVariants: (LRVariant | null)[] = new Array(NUM_BINS).fill(null)
      const binScores: number[] = new Array(NUM_BINS).fill(0)

      if (item.type === 'cluster') {
        const cluster = item.cluster
        for (const cv of cluster.consensus_variants) {
          if (cv.cluster_af < 0.5) continue
          const v = cv.variant
          if (!isSV(v)) continue
          const binIdx = Math.max(0, Math.min(NUM_BINS - 1, Math.floor((v.pos - start) / binSize)))
          if (!binVariants[binIdx] || cv.cluster_af > binScores[binIdx]) {
            binVariants[binIdx] = v
            binScores[binIdx] = cv.cluster_af
          }
        }

        let lastVar = binVariants.find((v) => v !== null) ?? null
        for (let i = 0; i < NUM_BINS; i++) {
          if (binVariants[i]) { lastVar = binVariants[i] } else { binVariants[i] = lastVar }
        }

        const afByVariantId = new Map<string, number>()
        for (const cv of cluster.consensus_variants) {
          if (cv.cluster_af >= 0.5) {
            afByVariantId.set(cv.variant.variant_id, cv.cluster_af)
          }
        }

        for (let i = 0; i < NUM_BINS; i++) {
          const binStart = start + i * binSize
          const binStop = start + (i + 1) * binSize
          const v = binVariants[i]
          if (!v) {
            allPaintedSegments.push({ binStart, binStop, rowY, color: NEUTRAL_COLOR, variant: null })
          } else {
            const baseColor = getColorByHash(v.variant_id)
            const af = afByVariantId.get(v.variant_id) ?? 0.5
            const alpha = clusterAfAlpha(af)
            allPaintedSegments.push({ binStart, binStop, rowY, color: [baseColor[0], baseColor[1], baseColor[2], alpha], variant: v })
          }
        }
      } else {
        const group = item.group
        const svVariants = group.variants.variants.filter(isSV)

        for (const v of svVariants) {
          const binIdx = Math.max(0, Math.min(NUM_BINS - 1, Math.floor((v.pos - start) / binSize)))
          const score = v.freq.af
          if (!binVariants[binIdx] || score > binScores[binIdx]) {
            binVariants[binIdx] = v
            binScores[binIdx] = score
          }
        }

        let lastVar = binVariants.find((v) => v !== null) ?? null
        for (let i = 0; i < NUM_BINS; i++) {
          if (binVariants[i]) { lastVar = binVariants[i] } else { binVariants[i] = lastVar }
        }

        for (let i = 0; i < NUM_BINS; i++) {
          const binStart = start + i * binSize
          const binStop = start + (i + 1) * binSize
          const v = binVariants[i]
          if (!v) {
            allPaintedSegments.push({ binStart, binStop, rowY, color: NEUTRAL_COLOR, variant: null })
          } else {
            const baseColor = getColorByHash(v.variant_id)
            allPaintedSegments.push({ binStart, binStop, rowY, color: [baseColor[0], baseColor[1], baseColor[2], 255], variant: v })
          }
        }
      }
    }

    if (allPaintedSegments.length === 0) return []

    return [new SolidPolygonLayer({
      id: 'painted-blocks-layer',
      data: allPaintedSegments,
      getPolygon: (d: PaintedSegment) => {
        const x1 = scalePosition(d.binStart)
        const x2 = scalePosition(d.binStop)
        const yTop = d.rowY + 2
        const yBot = d.rowY + VARIANT_ROW_HEIGHT - 2
        return [[x1, yTop], [x2, yTop], [x2, yBot], [x1, yBot]]
      },
      getFillColor: (d: PaintedSegment) => d.color,
      pickable: true,
      onHover,
      updateTriggers: { getPolygon: [scalePosition] },
    })]
  }, [rowItems, rowOffsets, start, stop, binSize, scalePosition, onHover])

  // Left panel data arrays for DeckGL layers
  type LPCircle = { position: [number, number, number]; color: [number, number, number, number]; radius: number }
  type LPText = { position: [number, number, number]; text: string; color: [number, number, number, number]; size: number }
  type LPHitbox = { position: [number, number, number]; action: string; clusterId: string }

  const { lpCircles, lpTexts, lpHitboxes } = useMemo(() => {
    const circles: LPCircle[] = []
    const texts: LPText[] = []
    const hitboxes: LPHitbox[] = []
    const ROW_CENTER = VARIANT_ROW_HEIGHT / 2

    for (let i = 0; i < rowItems.length; i++) {
      const item = rowItems[i]
      const y = rowOffsets[i] + ROW_CENTER

      if (item.type === 'cluster') {
        const cluster = item.cluster
        const isExpanded = expandedClusterIds?.has(cluster.cluster_id)
        texts.push({ position: [8, y, 0], text: isExpanded ? '\u25BC' : '\u25B6', color: [85, 85, 85, 255], size: 11 })
        hitboxes.push({ position: [8, y, 0], action: 'toggle_cluster', clusterId: cluster.cluster_id })

        const sampleColor = cssColorToRgba(sampleColorScale(cluster.sample_count))
        circles.push({ position: [20, y, 0], color: sampleColor, radius: 5 })
        texts.push({ position: [30, y, 0], text: String(cluster.sample_count), color: [0, 0, 0, 255], size: 12 })
        texts.push({ position: [60, y, 0], text: `(${cluster.member_group_hashes.length}g)`, color: [136, 136, 136, 255], size: 10 })
      } else {
        const group = item.group
        const indent = item.isChild ? 12 : 0
        const sampleColor = cssColorToRgba(sampleColorScale(group.samples.length))
        circles.push({ position: [5 + indent, y, 0], color: sampleColor, radius: 5 })
        texts.push({ position: [15 + indent, y, 0], text: String(group.samples.length), color: [0, 0, 0, 255], size: 12 })
        const variantColor = cssColorToRgba(variantColorScale(group.variants.variants.length))
        circles.push({ position: [50 + indent, y, 0], color: variantColor, radius: 5 })
        texts.push({ position: [60 + indent, y, 0], text: String(group.variants.variants.length), color: [0, 0, 0, 255], size: 12 })
      }
    }
    return { lpCircles: circles, lpTexts: texts, lpHitboxes: hitboxes }
  }, [rowItems, rowOffsets, expandedClusterIds, sampleColorScale, variantColorScale])

  const leftPanelLayers = useMemo(() => {
    const result: any[] = []
    if (lpCircles.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'left-panel-circles',
        data: lpCircles,
        getPosition: (d: LPCircle) => d.position,
        getRadius: (d: LPCircle) => d.radius,
        getFillColor: (d: LPCircle) => d.color,
        radiusUnits: 'pixels' as const,
        pickable: false,
      }))
    }
    if (lpTexts.length > 0) {
      result.push(new TextLayer({
        id: 'left-panel-text',
        data: lpTexts,
        getPosition: (d: LPText) => d.position,
        getText: (d: LPText) => d.text,
        getSize: (d: LPText) => d.size,
        getColor: (d: LPText) => d.color,
        getTextAnchor: 'start',
        getAlignmentBaseline: 'center',
        fontSettings: { sdf: true, smoothing: 0.15 },
        pickable: false,
      }))
    }
    if (lpHitboxes.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'left-panel-hitboxes',
        data: lpHitboxes,
        getPosition: (d: LPHitbox) => d.position,
        getRadius: 10,
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
    return result
  }, [lpCircles, lpTexts, lpHitboxes, toggleClusterExpansion])

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
        onHover,
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
        onHover,
      }))
    }

    if (treeLayout.thresholdX !== null) {
      result.push(new LineLayer({
        id: 'tree-threshold-line',
        data: [{ x: treeLayout.thresholdX, yTop: 0, yBottom: totalHeight }],
        getSourcePosition: (d: any) => [d.x, d.yTop, 0],
        getTargetPosition: (d: any) => [d.x, d.yBottom, 0],
        getColor: [217, 83, 79, 179],
        getWidth: 1.5,
        widthUnits: 'pixels' as const,
        pickable: false,
      }))
    }

    return result
  }, [treeLayout, totalHeight, onClusterThresholdChange, toggleClusterExpansion, onHover])

  // Multi-view: left panel, center (painted blocks), right panel
  const views = useMemo(
    () => [
      new OrthographicView({ id: 'left-panel', x: 0, y: 0, width: leftPanelWidth, height: viewportHeight, flipY: true }),
      new OrthographicView({ id: 'center-panel', x: leftPanelWidth, y: 0, width, height: viewportHeight, flipY: true }),
      new OrthographicView({ id: 'right-panel', x: leftPanelWidth + width, y: 0, width: rightPanelWidth, height: viewportHeight, flipY: true }),
    ],
    [leftPanelWidth, width, rightPanelWidth, viewportHeight]
  )

  const yTarget = scrollTopRef.current + viewportHeight / 2
  const viewState = {
    'left-panel': { target: [leftPanelWidth / 2, yTarget, 0] as [number, number, number], zoom: 0 },
    'center-panel': { target: [width / 2, yTarget, 0] as [number, number, number], zoom: 0 },
    'right-panel': { target: [rightPanelWidth / 2, yTarget, 0] as [number, number, number], zoom: 0 },
  }

  return (
    <div style={{ position: 'sticky', top: 0, left: 0, width: totalWidth, height: viewportHeight }}>
      <DeckGL
        ref={deckRef}
        views={views}
        viewState={viewState}
        layers={[...layers, ...leftPanelLayers, ...treeLayers]}
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
        hovered.viewportId === 'right-panel'
          ? <TreeTooltip x={hovered.x} y={hovered.y} object={hovered.object} />
          : hovered.viewportId === 'center-panel' && hovered.object.variant
            ? <PaintingTooltip x={hovered.x} y={hovered.y} segment={hovered.object} />
            : null
      )}
    </div>
  )
}

// --- Tooltip ---
function PaintingTooltip({ x, y, segment }: { x: number; y: number; segment: PaintedSegment }) {
  const v = segment.variant
  if (!v) return null

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
        <strong>SV Block:</strong> {v.variant_id}
      </div>
      <div>
        <strong>Position:</strong> {v.pos.toLocaleString()}
      </div>
      <div>
        <strong>Type:</strong> {v.allele_type}
      </div>
      {v.allele_length != null && (
        <div>
          <strong>Length:</strong> {Math.abs(v.allele_length).toLocaleString()}bp
        </div>
      )}
      <div>
        <strong>AF:</strong> {v.freq.af.toFixed(4)}
      </div>
      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
        Bin: {Math.floor(segment.binStart).toLocaleString()} - {Math.floor(segment.binStop).toLocaleString()}
      </div>
    </div>
  )
}

function TreeTooltip({ x, y, object }: { x: number; y: number; object: any }) {
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
      <span>{object.tooltipText}</span>
    </div>
  )
}

// --- Threshold drag overlay component ---

type CPThresholdDragOverlayProps = {
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

function CPThresholdDragOverlay({
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
}: CPThresholdDragOverlayProps) {
  const rightPanelRef = useRef<HTMLDivElement>(null)

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
