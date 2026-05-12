import React, { useMemo, useState, useCallback } from 'react'
import { DeckGL } from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { ScatterplotLayer, LineLayer, SolidPolygonLayer, PathLayer } from '@deck.gl/layers'
import { Track } from '@gnomad/region-viewer'
import { scaleLinear, scaleLog } from 'd3-scale'
import { SUPERPOPULATION_COLORS } from './colors'
import type { HaplotypeGroup, Methylation, MethylationSummaryPoint } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

type Variant = HaplotypeGroup['variants']['variants'][number]

// Row height constants
const VARIANT_ROW_HEIGHT = 25
const METH_TRACK_HEIGHT = 40
const MQTL_TRACK_HEIGHT = 80
const MQTL_PAD = 8
const ROW_CENTER_Y = 12.5

// Flattened data types for deck.gl layers
type VariantPoint = {
  x: number // genomic position (will be scaled)
  y: number // pixel y
  radius: number
  color: [number, number, number, number]
  variant: Variant
  groupHash: number
}

type StemLine = {
  x: number
  yTop: number
  yBottom: number
  color: [number, number, number, number]
  width: number
  variant: Variant
}

type BackgroundRect = {
  polygon: [number, number][]
  color: [number, number, number, number]
  group: HaplotypeGroup
}

type MethPoint = {
  x: number
  y: number
  color: [number, number, number, number]
}

type MqtlArc = {
  path: [number, number][]
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
      return getColorByHash(variant.locus)
    case 'position':
      return getColorByPosition(variant.position, start, stop)
    case 'af':
      return getColorByAf(variant.info_AF[0])
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

// Variant shape classification
type VariantShape = 'circle' | 'deletion' | 'insertion' | 'duplication' | 'inversion' | 'tandem_repeat'

function getVariantShape(variant: Variant): VariantShape {
  const vType = (variant.allele_type || '').toLowerCase()
  if (vType === 'del') return 'deletion'
  if (vType === 'ins' || vType === 'alu_ins' || vType === 'sva_ins') return 'insertion'
  if (vType === 'dup' || vType === 'dup_interspersed' || vType === 'complex_dup' || vType === 'inv_dup') return 'duplication'
  if (vType === 'inv') return 'inversion'
  if (vType === 'trv') return 'tandem_repeat'
  return 'circle'
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
}

export default function DeckGLLollipopTrack({
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
}: DeckGLLollipopTrackProps) {
  const [hovered, setHovered] = useState<{
    x: number
    y: number
    object: any
    type: 'variant' | 'group'
  } | null>(null)

  // Compute row Y offsets and total height
  const { rowOffsets, totalHeight } = useMemo(() => {
    const offsets: number[] = []
    let cumY = 0
    for (const group of displayGroups) {
      offsets.push(cumY)
      const showGroupMqtl = showMqtl && mqtlData.length > 0 && (() => {
        const groupVarPositions = new Set(group.variants.variants.map((v) => v.position))
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

  return (
    <Track
      renderLeftPanel={() => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <svg width={200} height={totalHeight}>
            {displayGroups.map((group, i) => {
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
        />
      )}
    </Track>
  )
}

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
}: DeckGLCanvasProps) {
  // Pre-aggregate locus counts for haplotype_count color mode
  const locusCounts = useMemo(() => {
    const counts = new Map<string, number>()
    if (colorMode !== 'haplotype_count') return counts
    for (const group of haplotypeGroups) {
      for (const v of group.variants.variants) {
        counts.set(v.locus, (counts.get(v.locus) || 0) + 1)
      }
    }
    return counts
  }, [colorMode, haplotypeGroups])

  // Flatten all data for deck.gl layers
  const { bgRects, variantPoints, belowThresholdPoints, deletionLines, methPoints, mqtlArcs } =
    useMemo(() => {
      const bgRects: BackgroundRect[] = []
      const variantPoints: VariantPoint[] = []
      const belowThresholdPoints: VariantPoint[] = []
      const deletionLines: StemLine[] = []
      const methPoints: MethPoint[] = []
      const mqtlArcs: MqtlArc[] = []

      for (let gi = 0; gi < displayGroups.length; gi++) {
        const group = displayGroups[gi]
        const rowY = rowOffsets[gi]
        const startX = scalePosition(start)
        const stopX = scalePosition(stop)

        // Background rect
        bgRects.push({
          polygon: [
            [scalePosition(group.start), rowY + 5],
            [scalePosition(group.stop), rowY + 5],
            [scalePosition(group.stop), rowY + 20],
            [scalePosition(group.start), rowY + 20],
          ],
          color: [240, 240, 240, 255],
          group,
        })

        // Below-threshold variants (small open circles / faint shapes)
        for (const variant of group.below_threshold.variants) {
          const shape = getVariantShape(variant)
          const x = scalePosition(variant.position)
          if (shape === 'deletion') {
            deletionLines.push({
              x,
              yTop: rowY + 8,
              yBottom: rowY + 17,
              color: [128, 128, 128, 100],
              width: 1,
              variant,
            })
          } else {
            belowThresholdPoints.push({
              x,
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
          const shape = getVariantShape(variant)
          const color = getVariantColor(
            variant,
            colorMode,
            start,
            stop,
            sampleMetadata,
            group,
            locusCounts.get(variant.locus) || 0,
            haplotypeGroups.length || 1
          )
          const x = scalePosition(variant.position)

          if (shape === 'deletion') {
            const thickness = Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)
            deletionLines.push({
              x,
              yTop: rowY + 5,
              yBottom: rowY + 20,
              color,
              width: thickness,
              variant,
            })
          } else {
            variantPoints.push({
              x,
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
                x: scalePosition(pos),
                y: methBaseY + methYScale(mean),
                color: [74, 85, 104, 255],
              })
            }
          }
        }

        // mQTL arcs
        if (showMqtl && mqtlData.length > 0) {
          const groupVarPositions = new Set(group.variants.variants.map((v) => v.position))
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
              const vx = scalePosition(d.variant_pos)
              const cx = scalePosition(d.cpg_pos)
              const logP = -Math.log10(d.p_value)
              const arcH = hScale(logP)
              const midX = (vx + cx) / 2
              const midY = mqtlBaseY - arcH

              // Approximate quadratic bezier with line segments
              const steps = 20
              const path: [number, number][] = []
              for (let t = 0; t <= steps; t++) {
                const tt = t / steps
                const x =
                  (1 - tt) * (1 - tt) * vx + 2 * (1 - tt) * tt * midX + tt * tt * cx
                const y =
                  (1 - tt) * (1 - tt) * mqtlBaseY +
                  2 * (1 - tt) * tt * midY +
                  tt * tt * mqtlBaseY
                path.push([x, y])
              }

              const isPositive = d.effect_size > 0
              const opacity = Math.min(204, Math.round(51 + (logP / maxLogP) * 153))
              mqtlArcs.push({
                path,
                color: isPositive
                  ? [220, 38, 38, opacity]
                  : [37, 99, 235, opacity],
                width: 1.5,
              })
            }
          }
        }
      }

      return { bgRects, variantPoints, belowThresholdPoints, deletionLines, methPoints, mqtlArcs }
    }, [
      displayGroups,
      rowOffsets,
      scalePosition,
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
    ])

  // Center lines for each group row
  const centerLines = useMemo(() => {
    return displayGroups.map((group, gi) => ({
      startX: scalePosition(group.start),
      stopX: scalePosition(group.stop),
      y: rowOffsets[gi] + ROW_CENTER_Y,
    }))
  }, [displayGroups, rowOffsets, scalePosition])

  // Hovered variant position crosshair
  const crosshairLine = useMemo(() => {
    if (hoveredVariantPosition == null) return []
    const x = scalePosition(hoveredVariantPosition)
    return [{ x, yTop: 0, yBottom: totalHeight }]
  }, [hoveredVariantPosition, scalePosition, totalHeight])

  const layers = useMemo(() => {
    const result: any[] = []

    // Background rects
    if (bgRects.length > 0) {
      result.push(
        new SolidPolygonLayer({
          id: 'bg-rects',
          data: bgRects,
          getPolygon: (d: BackgroundRect) => d.polygon,
          getFillColor: (d: BackgroundRect) => d.color,
          pickable: false,
        })
      )
    }

    // Center lines
    if (centerLines.length > 0) {
      result.push(
        new LineLayer({
          id: 'center-lines',
          data: centerLines,
          getSourcePosition: (d: any) => [d.startX, d.y, 0],
          getTargetPosition: (d: any) => [d.stopX, d.y, 0],
          getColor: [168, 168, 168, 255],
          getWidth: 1,
          widthUnits: 'pixels' as const,
          pickable: false,
        })
      )
    }

    // Deletion lines
    if (deletionLines.length > 0) {
      result.push(
        new LineLayer({
          id: 'deletion-lines',
          data: deletionLines,
          getSourcePosition: (d: StemLine) => [d.x, d.yTop, 0],
          getTargetPosition: (d: StemLine) => [d.x, d.yBottom, 0],
          getColor: (d: StemLine) => d.color,
          getWidth: (d: StemLine) => d.width,
          widthUnits: 'pixels' as const,
          pickable: true,
          onHover: onHover,
        })
      )
    }

    // Below-threshold variant circles (small, faint)
    if (belowThresholdPoints.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'below-threshold',
          data: belowThresholdPoints,
          getPosition: (d: VariantPoint) => [d.x, d.y, 0],
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
        })
      )
    }

    // Main variant circles
    if (variantPoints.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'variants',
          data: variantPoints,
          getPosition: (d: VariantPoint) => [d.x, d.y, 0],
          getRadius: (d: VariantPoint) => d.radius,
          getFillColor: (d: VariantPoint) => d.color,
          getLineColor: [0, 0, 0, 128],
          getLineWidth: 0.5,
          lineWidthUnits: 'pixels' as const,
          stroked: true,
          radiusUnits: 'pixels' as const,
          pickable: true,
          onHover: onHover,
        })
      )
    }

    // Methylation dots
    if (methPoints.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'methylation',
          data: methPoints,
          getPosition: (d: MethPoint) => [d.x, d.y, 0],
          getRadius: 2,
          getFillColor: (d: MethPoint) => d.color,
          radiusUnits: 'pixels' as const,
          pickable: false,
        })
      )
    }

    // mQTL arcs
    if (mqtlArcs.length > 0) {
      result.push(
        new PathLayer({
          id: 'mqtl-arcs',
          data: mqtlArcs,
          getPath: (d: MqtlArc) => d.path,
          getColor: (d: MqtlArc) => d.color,
          getWidth: (d: MqtlArc) => d.width,
          widthUnits: 'pixels' as const,
          pickable: false,
        })
      )
    }

    // Crosshair for hovered variant position
    if (crosshairLine.length > 0) {
      result.push(
        new LineLayer({
          id: 'crosshair',
          data: crosshairLine,
          getSourcePosition: (d: any) => [d.x, d.yTop, 0],
          getTargetPosition: (d: any) => [d.x, d.yBottom, 0],
          getColor: [0, 0, 0, 128],
          getWidth: 1,
          widthUnits: 'pixels' as const,
          pickable: false,
        })
      )
    }

    return result
  }, [
    bgRects,
    centerLines,
    deletionLines,
    belowThresholdPoints,
    variantPoints,
    methPoints,
    mqtlArcs,
    crosshairLine,
    onHover,
  ])

  const view = useMemo(
    () => new OrthographicView({ id: 'main', flipY: true }),
    []
  )

  const viewState = useMemo(
    () => ({
      target: [width / 2, totalHeight / 2, 0] as [number, number, number],
      zoom: 0,
    }),
    [width, totalHeight]
  )

  return (
    <div style={{ position: 'relative', width, height: totalHeight, overflow: 'hidden' }}>
      <DeckGL
        views={view}
        viewState={viewState}
        layers={layers}
        controller={false}
        pickingRadius={5}
        style={{ position: 'absolute', left: 0, top: 0, width, height: totalHeight }}
        width={width}
        height={totalHeight}
      />
      {hovered && hovered.object && (
        <Tooltip x={hovered.x} y={hovered.y} object={hovered.object} type={hovered.type} />
      )}
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
        <strong>Position:</strong> {variant.position}
      </div>
      <div>
        <strong>Ref:</strong>{' '}
        {variant.alleles[0].length > 10
          ? variant.alleles[0].substring(0, 10) + '...'
          : variant.alleles[0]}
      </div>
      <div>
        <strong>Alt:</strong>{' '}
        {variant.alleles[1].length > 10
          ? variant.alleles[1].substring(0, 10) + '...'
          : variant.alleles[1]}
      </div>
      <div>
        <strong>AF:</strong> {variant.info_AF.join(', ')}
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
