import React, { useMemo, useState, useCallback, useRef } from 'react'
import { throttle } from 'lodash-es'
import { DeckGL } from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { SolidPolygonLayer } from '@deck.gl/layers'
import { Track } from '@gnomad/region-viewer'
import GenealogyTreeOverlay from './GenealogyTreeOverlay'
import type {
  HaplotypeGroup,
  HaplotypeCluster,
  LRVariant,
  ClusterConsensusVariant,
} from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

// --- Constants ---
const VARIANT_ROW_HEIGHT = 25
const SCROLL_CONTAINER_HEIGHT = 500
const VISIBLE_BUFFER = 5
const NUM_BINS = 100

// --- Reuse RowItem discriminated union from DeckGLLollipopTrack ---
type RowItem =
  | { type: 'cluster'; cluster: HaplotypeCluster }
  | { type: 'group'; group: HaplotypeGroup; isChild: boolean }

// --- Binary search for visible range (same as DeckGLLollipopTrack) ---
function findVisibleRange(
  rowOffsets: number[],
  _totalHeight: number,
  scrollTop: number,
  viewportHeight: number
): [number, number] {
  const n = rowOffsets.length
  if (n === 0) return [0, 0]
  const top = scrollTop - VISIBLE_BUFFER * VARIANT_ROW_HEIGHT
  const bottom = scrollTop + viewportHeight + VISIBLE_BUFFER * VARIANT_ROW_HEIGHT
  let startIdx = 0
  for (let i = 0; i < n; i++) {
    if (i + 1 < n ? rowOffsets[i + 1] > top : true) {
      startIdx = i
      break
    }
  }
  let endIdx = n - 1
  for (let i = startIdx; i < n; i++) {
    if (rowOffsets[i] > bottom) {
      endIdx = i - 1
      break
    }
    endIdx = i
  }
  return [Math.max(0, startIdx - VISIBLE_BUFFER), Math.min(n - 1, endIdx + VISIBLE_BUFFER)]
}

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
    object: PaintedSegment
  } | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

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

  // Throttled scroll handler
  const handleScroll = useMemo(
    () =>
      throttle((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop((e.target as HTMLDivElement).scrollTop)
      }, 50),
    []
  )

  // Visible range
  const viewportH = Math.min(SCROLL_CONTAINER_HEIGHT, totalHeight || 1)
  const [visStartIdx, visEndIdx] = useMemo(
    () => findVisibleRange(rowOffsets, totalHeight, scrollTop, viewportH),
    [rowOffsets, totalHeight, scrollTop, viewportH]
  )

  // Left panel visible range
  const [lpStart, lpEnd] = useMemo(
    () => findVisibleRange(rowOffsets, totalHeight, scrollTop, viewportH),
    [rowOffsets, totalHeight, scrollTop, viewportH]
  )

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
      setHovered({ x: info.x, y: info.y, object: info.object })
    } else {
      setHovered(null)
    }
  }, [])

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
                        <text x={2} y={17} fontSize="11" fill="#555">
                          {isExpanded ? '\u25BC' : '\u25B6'}
                        </text>
                        <circle cx={20} cy={12.5} r={5} fill={sampleColorScale(cluster.sample_count)} />
                        <text x={30} y={17} fontSize="12">
                          {cluster.sample_count}
                        </text>
                        <text x={60} y={17} fontSize="10" fill="#888">
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
                      <text x={15} y={17} fontSize="12">
                        {group.samples.length}
                      </text>
                      <circle
                        cx={50}
                        cy={12.5}
                        r={5}
                        fill={variantColorScale(group.variants.variants.length)}
                      />
                      <text x={60} y={17} fontSize="12">
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
          <ChromosomePainterCanvas
            rowItems={rowItems}
            rowOffsets={rowOffsets}
            totalHeight={totalHeight}
            start={start}
            stop={stop}
            scalePosition={scalePosition}
            width={width}
            visStartIdx={visStartIdx}
            visEndIdx={visEndIdx}
            scrollTop={scrollTop}
            hovered={hovered}
            onHover={onHover}
          />
        )}
      </Track>
    </div>
  )
}

export default ChromosomePainterTrack

// --- Inner DeckGL canvas component ---

type CanvasProps = {
  rowItems: RowItem[]
  rowOffsets: number[]
  totalHeight: number
  start: number
  stop: number
  scalePosition: (input: number) => number
  width: number
  visStartIdx: number
  visEndIdx: number
  scrollTop: number
  hovered: { x: number; y: number; object: PaintedSegment } | null
  onHover: (info: any) => void
}

function ChromosomePainterCanvas({
  rowItems,
  rowOffsets,
  totalHeight,
  start,
  stop,
  scalePosition,
  width,
  visStartIdx,
  visEndIdx,
  scrollTop,
  hovered,
  onHover,
}: CanvasProps) {
  const viewportHeight = Math.min(SCROLL_CONTAINER_HEIGHT, totalHeight || 1)
  const binSize = (stop - start) / NUM_BINS

  // Per-row DeckGL layers for stable animations across expand/collapse
  const layers = useMemo(() => {
    const result: any[] = []

    for (let gi = visStartIdx; gi <= visEndIdx && gi < rowItems.length; gi++) {
      const item = rowItems[gi]
      const rowY = rowOffsets[gi]
      const rowId = item.type === 'cluster'
        ? `cluster-${item.cluster.cluster_id}`
        : `group-${item.group.hash}`

      // Initialize bins
      const binVariants: (LRVariant | null)[] = new Array(NUM_BINS).fill(null)
      const binScores: number[] = new Array(NUM_BINS).fill(0)
      const rowSegments: PaintedSegment[] = []

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
            rowSegments.push({ binStart, binStop, rowY, color: NEUTRAL_COLOR, variant: null })
          } else {
            const baseColor = getColorByHash(v.variant_id)
            const af = afByVariantId.get(v.variant_id) ?? 0.5
            const alpha = clusterAfAlpha(af)
            rowSegments.push({ binStart, binStop, rowY, color: [baseColor[0], baseColor[1], baseColor[2], alpha], variant: v })
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
            rowSegments.push({ binStart, binStop, rowY, color: NEUTRAL_COLOR, variant: null })
          } else {
            const baseColor = getColorByHash(v.variant_id)
            rowSegments.push({ binStart, binStop, rowY, color: [baseColor[0], baseColor[1], baseColor[2], 255], variant: v })
          }
        }
      }

      if (rowSegments.length > 0) {
        result.push(new SolidPolygonLayer({
          id: `painted-blocks-${rowId}`,
          data: rowSegments,
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
          updateTriggers: { getPolygon: [scalePosition, rowY] },
          transitions: { getPolygon: { duration: 300 } },
        }))
      }
    }

    return result
  }, [rowItems, rowOffsets, start, stop, binSize, visStartIdx, visEndIdx, scalePosition, onHover])

  const view = useMemo(() => new OrthographicView({ id: 'main', flipY: true }), [])

  const viewState = useMemo(
    () => ({
      target: [width / 2, scrollTop + viewportHeight / 2, 0] as [number, number, number],
      zoom: 0,
    }),
    [width, scrollTop, viewportHeight]
  )

  return (
    <div style={{ position: 'relative', width, height: totalHeight }}>
      <div
        style={{
          position: 'absolute',
          top: scrollTop,
          left: 0,
          width,
          height: viewportHeight,
        }}
      >
        <DeckGL
          views={view}
          viewState={viewState}
          layers={layers}
          controller={false}
          pickingRadius={5}
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: `${width}px`,
            height: `${viewportHeight}px`,
          }}
          width={width}
          height={viewportHeight}
        />
        {hovered && hovered.object && hovered.object.variant && (
          <PaintingTooltip x={hovered.x} y={hovered.y} segment={hovered.object} />
        )}
      </div>
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
