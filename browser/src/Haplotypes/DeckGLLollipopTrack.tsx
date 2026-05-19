import React, { useMemo, useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { throttle } from 'lodash-es'
import { DeckGL } from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { ScatterplotLayer, LineLayer, SolidPolygonLayer, PathLayer } from '@deck.gl/layers'
import { Track } from '@gnomad/region-viewer'
import { scaleLinear, scaleLog } from 'd3-scale'
import { SUPERPOPULATION_COLORS } from './colors'
import { getVariantCategory, VARIANT_CATEGORY_COLORS, getLodVisibility } from '../LongReadVariantPage/variantUtils'
import GenealogyTreeOverlay from './GenealogyTreeOverlay'
import type { HaplotypeGroup, LRVariant, Methylation, MethylationSummaryPoint } from './index'
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

type DeckGLLollipopTrackProps = {
  displayGroups: HaplotypeGroup[]
  haplotypeGroups: HaplotypeGroup[]
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
}

export type DeckGLLollipopTrackHandle = {
  scrollToPosition: (pos: number) => void
}

const DeckGLLollipopTrack = forwardRef<DeckGLLollipopTrackHandle, DeckGLLollipopTrackProps>(function DeckGLLollipopTrack({
  displayGroups,
  haplotypeGroups,
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
}, ref) {
  const [hovered, setHovered] = useState<{
    x: number
    y: number
    object: any
    type: 'variant' | 'group'
  } | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Compute row Y offsets and total height
  const { rowOffsets, totalHeight } = useMemo(() => {
    const offsets: number[] = []
    let cumY = 0
    for (const group of displayGroups) {
      offsets.push(cumY)
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
    return { rowOffsets: offsets, totalHeight: cumY }
  }, [displayGroups, showMethylation, showMqtl, mqtlData, mqtlMinLogP])

  // Throttled scroll handler
  const handleScroll = useMemo(
    () =>
      throttle((e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = (e.target as HTMLDivElement).scrollTop
        setScrollTop(newScrollTop)

        // Find topmost visible group and notify parent
        if (onVisibleGroupChange && rowOffsets.length > 0) {
          let visibleIdx = 0
          for (let i = 0; i < rowOffsets.length; i++) {
            if (rowOffsets[i] <= newScrollTop) visibleIdx = i
            else break
          }
          onVisibleGroupChange(displayGroups[visibleIdx])
        }
      }, 50),
    [rowOffsets, displayGroups, onVisibleGroupChange]
  )

  // Expose scrollToPosition for external sync
  useImperativeHandle(ref, () => ({
    scrollToPosition(pos: number) {
      if (!scrollContainerRef.current) return
      // Find the first group containing a variant at or after pos
      for (let i = 0; i < displayGroups.length; i++) {
        const group = displayGroups[i]
        if (group.variants.variants.some((v) => v.pos >= pos) ||
            group.below_threshold.variants.some((v) => v.pos >= pos)) {
          scrollContainerRef.current.scrollTop = rowOffsets[i]
          return
        }
      }
    },
  }), [displayGroups, rowOffsets])

  // Compute leaf Y positions for genealogy tree overlay
  const leafYPositions = useMemo(() => {
    const positions = new Map<number, number>()
    if (showGenealogy && genealogyResult) {
      displayGroups.forEach((group, i) => {
        positions.set(group.hash, rowOffsets[i] + ROW_CENTER_Y)
      })
    }
    return positions
  }, [showGenealogy, genealogyResult, displayGroups, rowOffsets])

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
    () => findVisibleRange(rowOffsets, totalHeight, scrollTop, viewportH),
    [rowOffsets, totalHeight, scrollTop, viewportH]
  )

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{ maxHeight: SCROLL_CONTAINER_HEIGHT, overflowY: 'auto' }}
    >
    <Track
      renderLeftPanel={() => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <svg width={200} height={totalHeight}>
            {displayGroups.map((group, i) => {
              if (i < lpStart || i > lpEnd) return null
              const y = rowOffsets[i]
              return (
                <g key={group.hash} transform={`translate(0, ${y})`}>
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
      )}
      renderRightPanel={
        showGenealogy && genealogyResult && leafYPositions.size > 0
          ? () => (
              <div style={{ position: 'relative', width: 250, height: totalHeight }}>
                <GenealogyTreeOverlay
                  tree={genealogyResult.tree}
                  leafYPositions={leafYPositions}
                  panelWidth={250}
                  totalHeight={totalHeight}
                  groups={displayGroups}
                  sampleMetadata={sampleMetadata}
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
          scrollTop={scrollTop}
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
  scrollTop: number
}

// Inner component that receives scalePosition from Track render prop
function DeckGLLollipopCanvas({
  displayGroups,
  haplotypeGroups,
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
  scrollTop,
}: DeckGLCanvasProps) {
  // Canvas uses full width — RegionViewer's rightPanelWidth handles space for genealogy tree
  const canvasWidth = width

  // Compute visible group range for windowed rendering
  const viewportHeight = Math.min(SCROLL_CONTAINER_HEIGHT, totalHeight || 1)
  const [visStartIdx, visEndIdx] = useMemo(
    () => findVisibleRange(rowOffsets, totalHeight, scrollTop, viewportHeight),
    [rowOffsets, totalHeight, scrollTop, viewportHeight]
  )

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

  // Flatten ONLY visible groups for deck.gl layers (windowed rendering)
  const { bgRects, variantPoints, belowThresholdPoints, deletionLines, spanningRects, methPoints, mqtlArcs } =
    useMemo(() => {
      console.time('[perf] DeckGL data flatten')
      const lod = getLodVisibility(stop - start)
      const bgRects: BackgroundRect[] = []
      const variantPoints: VariantPoint[] = []
      const belowThresholdPoints: VariantPoint[] = []
      const deletionLines: StemLine[] = []
      const spanningRects: SpanningRect[] = []
      const methPoints: MethPoint[] = []
      const mqtlArcs: MqtlArc[] = []

      for (let gi = visStartIdx; gi <= visEndIdx && gi < displayGroups.length; gi++) {
        const group = displayGroups[gi]
        const rowY = rowOffsets[gi]

        // Background rect (store raw genomic positions)
        bgRects.push({
          groupStart: group.start,
          groupStop: group.stop,
          rowY: rowY,
          color: [240, 240, 240, 255],
          group,
        })

        // Below-threshold variants (small open circles / faint shapes)
        for (const variant of group.below_threshold.variants) {
          const shape = getVariantShape(variant)
          if (shape === 'deletion') {
            deletionLines.push({
              position: variant.pos,
              yTop: rowY + 8,
              yBottom: rowY + 17,
              color: [128, 128, 128, 100],
              width: 1,
              variant,
            })
          } else {
            belowThresholdPoints.push({
              position: variant.pos,
              y: rowY + ROW_CENTER_Y,
              radius: 1.5,
              color: [128, 128, 128, 100],
              variant,
              groupHash: group.hash,
            })
          }
        }

        // Above-threshold variants
        for (const variant of group.variants.variants) {
          const cat = getVariantCategory(variant.allele_type || '', variant.allele_length)
          const isLarge = Math.abs(variant.allele_length || 0) >= 50

          // LOD filtering: skip sub-pixel variants when zoomed out
          if (cat === 'snv' && !lod.showSnvs) continue
          if ((cat === 'insertion' || cat === 'deletion') && !isLarge && !lod.showSmallIndels) continue

          const color = getVariantColor(
            variant,
            colorMode,
            start,
            stop,
            sampleMetadata,
            group,
            locusCounts.get(variant.variant_id) || 0,
            haplotypeGroups.length || 1
          )

          if ((cat === 'deletion' || cat === 'sv') && isLarge) {
            // Large SVs/deletions render as spanning rectangles
            const endPos = variant.end ?? (variant.pos + Math.abs(variant.allele_length || 0))
            spanningRects.push({
              start: variant.pos,
              end: endPos,
              rowY,
              color,
              variant,
              groupHash: group.hash,
            })
          } else if (cat === 'deletion') {
            // Small deletions render as vertical lines
            const thickness = Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)
            deletionLines.push({
              position: variant.pos,
              yTop: rowY + 5,
              yBottom: rowY + 20,
              color,
              width: thickness,
              variant,
            })
          } else {
            variantPoints.push({
              position: variant.pos,
              y: rowY + ROW_CENTER_Y,
              radius: variantCircleRadius,
              color,
              variant,
              groupHash: group.hash,
            })
          }
        }

        // Methylation data
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
            const methYScale = scaleLinear()
              .domain([0, 100])
              .range([METH_TRACK_HEIGHT - 4, 4])
            const methBaseY = rowY + VARIANT_ROW_HEIGHT
            for (const [pos, values] of byPos) {
              const mean = values.reduce((a, b) => a + b, 0) / values.length
              methPoints.push({
                position: pos,
                y: methBaseY + methYScale(mean),
                color: [74, 85, 104, 255],
              })
            }
          }
        }

        // mQTL arcs
        if (showMqtl && mqtlData.length > 0) {
          const groupVarPositions = new Set(group.variants.variants.map((v) => v.pos))
          const groupMqtl = mqtlData.filter(
            (d: any) =>
              groupVarPositions.has(d.variant_pos) &&
              -Math.log10(d.p_value) >= (mqtlMinLogP || 0)
          )
          if (groupMqtl.length > 0) {
            const mqtlBaseY =
              rowY +
              VARIANT_ROW_HEIGHT +
              (showMethylation ? METH_TRACK_HEIGHT : 0) +
              MQTL_PAD +
              MQTL_TRACK_HEIGHT
            const maxLogP = Math.max(
              2,
              ...groupMqtl.map((d: any) => -Math.log10(d.p_value))
            )
            const hScale = scaleLinear()
              .domain([0, maxLogP])
              .range([0, MQTL_TRACK_HEIGHT - 4])

            for (const d of groupMqtl) {
              const logP = -Math.log10(d.p_value)
              const arcH = hScale(logP)
              const isPositive = d.effect_size > 0
              const opacity = Math.min(204, Math.round(51 + (logP / maxLogP) * 153))
              mqtlArcs.push({
                variantPos: d.variant_pos,
                cpgPos: d.cpg_pos,
                arcHeight: arcH,
                baseY: mqtlBaseY,
                color: isPositive
                  ? [220, 38, 38, opacity]
                  : [37, 99, 235, opacity],
                width: 1.5,
              })
            }
          }
        }
      }

      console.log(`[perf] DeckGL: ${variantPoints.length} variants, ${spanningRects.length} spans, ${bgRects.length} bg, ${methPoints.length} meth, ${mqtlArcs.length} mqtl, ${deletionLines.length} dels (groups ${visStartIdx}-${visEndIdx} of ${displayGroups.length})`)
      console.timeEnd('[perf] DeckGL data flatten')
      return { bgRects, variantPoints, belowThresholdPoints, deletionLines, spanningRects, methPoints, mqtlArcs }
    }, [
      displayGroups,
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
      visStartIdx,
      visEndIdx,
    ])

  // Center lines for visible group rows only (raw positions, scaled in accessor)
  const centerLines = useMemo(() => {
    const lines = []
    for (let gi = visStartIdx; gi <= visEndIdx && gi < displayGroups.length; gi++) {
      const group = displayGroups[gi]
      lines.push({
        groupStart: group.start,
        groupStop: group.stop,
        y: rowOffsets[gi] + ROW_CENTER_Y,
      })
    }
    return lines
  }, [displayGroups, rowOffsets, visStartIdx, visEndIdx])

  // Hovered variant position crosshair (raw position, scaled in accessor)
  const crosshairLine = useMemo(() => {
    if (hoveredVariantPosition == null) return []
    return [{ position: hoveredVariantPosition, yTop: 0, yBottom: totalHeight }]
  }, [hoveredVariantPosition, totalHeight])

  const layers = useMemo(() => {
    console.time('[perf] DeckGL layer creation')
    const result: any[] = []

    // Background rects — polygon computed from raw positions via scalePosition
    if (bgRects.length > 0) {
      result.push(
        new SolidPolygonLayer({
          id: 'bg-rects',
          data: bgRects,
          getPolygon: (d: BackgroundRect) => [
            [scalePosition(d.groupStart), d.rowY + 5],
            [scalePosition(d.groupStop), d.rowY + 5],
            [scalePosition(d.groupStop), d.rowY + 20],
            [scalePosition(d.groupStart), d.rowY + 20],
          ],
          getFillColor: (d: BackgroundRect) => d.color,
          pickable: false,
          updateTriggers: { getPolygon: [scalePosition] },
        })
      )
    }

    // SV/deletion spanning rectangles (large variants ≥50bp)
    if (spanningRects.length > 0) {
      result.push(
        new SolidPolygonLayer({
          id: 'sv-spanning-rects',
          data: spanningRects,
          getPolygon: (d: SpanningRect) => {
            const x1 = scalePosition(d.start)
            const x2 = Math.max(scalePosition(d.end), x1 + 2) // minimum 2px width
            const yTop = d.rowY + ROW_CENTER_Y - 4
            const yBot = d.rowY + ROW_CENTER_Y + 4
            return [[x1, yTop], [x2, yTop], [x2, yBot], [x1, yBot]]
          },
          getFillColor: (d: SpanningRect) => d.color,
          pickable: true,
          onHover: onHover,
          updateTriggers: { getPolygon: [scalePosition] },
        })
      )
    }

    // Center lines
    if (centerLines.length > 0) {
      result.push(
        new LineLayer({
          id: 'center-lines',
          data: centerLines,
          getSourcePosition: (d: any) => [scalePosition(d.groupStart), d.y, 0],
          getTargetPosition: (d: any) => [scalePosition(d.groupStop), d.y, 0],
          getColor: [168, 168, 168, 255],
          getWidth: 1,
          widthUnits: 'pixels' as const,
          pickable: false,
          updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
        })
      )
    }

    // Deletion lines
    if (deletionLines.length > 0) {
      result.push(
        new LineLayer({
          id: 'deletion-lines',
          data: deletionLines,
          getSourcePosition: (d: StemLine) => [scalePosition(d.position), d.yTop, 0],
          getTargetPosition: (d: StemLine) => [scalePosition(d.position), d.yBottom, 0],
          getColor: (d: StemLine) => d.color,
          getWidth: (d: StemLine) => d.width,
          widthUnits: 'pixels' as const,
          pickable: true,
          onHover: onHover,
          updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
        })
      )
    }

    // Below-threshold variant circles (small, faint)
    if (belowThresholdPoints.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'below-threshold',
          data: belowThresholdPoints,
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
        })
      )
    }

    // Main variant circles
    if (variantPoints.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'variants',
          data: variantPoints,
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
        })
      )
    }

    // Methylation dots
    if (methPoints.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'methylation',
          data: methPoints,
          getPosition: (d: MethPoint) => [scalePosition(d.position), d.y, 0],
          getRadius: 2,
          getFillColor: (d: MethPoint) => d.color,
          radiusUnits: 'pixels' as const,
          pickable: false,
          updateTriggers: { getPosition: [scalePosition] },
        })
      )
    }

    // mQTL arcs — compute bezier path from raw positions in accessor
    if (mqtlArcs.length > 0) {
      result.push(
        new PathLayer({
          id: 'mqtl-arcs',
          data: mqtlArcs,
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
        })
      )
    }

    // Crosshair for hovered variant position
    if (crosshairLine.length > 0) {
      result.push(
        new LineLayer({
          id: 'crosshair',
          data: crosshairLine,
          getSourcePosition: (d: any) => [scalePosition(d.position), d.yTop, 0],
          getTargetPosition: (d: any) => [scalePosition(d.position), d.yBottom, 0],
          getColor: [0, 0, 0, 128],
          getWidth: 1,
          widthUnits: 'pixels' as const,
          pickable: false,
          updateTriggers: { getSourcePosition: [scalePosition], getTargetPosition: [scalePosition] },
        })
      )
    }

    console.timeEnd('[perf] DeckGL layer creation')
    return result
  }, [
    bgRects,
    spanningRects,
    centerLines,
    deletionLines,
    belowThresholdPoints,
    variantPoints,
    methPoints,
    mqtlArcs,
    crosshairLine,
    onHover,
    scalePosition,
  ])

  const view = useMemo(
    () => new OrthographicView({ id: 'main', flipY: true }),
    []
  )

  const viewState = useMemo(
    () => ({
      target: [canvasWidth / 2, scrollTop + viewportHeight / 2, 0] as [number, number, number],
      zoom: 0,
    }),
    [canvasWidth, scrollTop, viewportHeight]
  )

  return (
    <div style={{ position: 'relative', width: canvasWidth, height: totalHeight }}>
      <div style={{ position: 'absolute', top: scrollTop, left: 0, width: canvasWidth, height: viewportHeight }}>
        <DeckGL
          views={view}
          viewState={viewState}
          layers={layers}
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
}

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
