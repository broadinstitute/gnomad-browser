import React, { useContext, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import styled from 'styled-components'

import { Track, RegionViewerContext } from '@gnomad/region-viewer'

import Link from '../Link'
import { getVariantCategory, VARIANT_CATEGORY_COLORS, ALLELE_TYPE_COLORS, assignBand as sharedAssignBand, type LodVisibility } from './variantUtils'
import { getVariantCssColor } from './variantColorUtils'
import AccordionContext from '../Haplotypes/AccordionContext'

// --- Types ---

type LRVariant = {
  variant_id: string
  pos: number
  end: number | null
  allele_length: number | null
  allele_type: string
  major_consequence: string | null
  motifs: string[] | null
  main_reference_region: {
    chrom: string
    start: number
    stop: number
  } | null
  filters: string[] | null
  sv_consequences: string[] | null
}

type Band = 'snv' | 'ins' | 'del' | 'sv' | 'tr'

type PackedVariant<T> = T & { row: number }

// --- Constants ---

const ROW_HEIGHT = 14
const MIN_SV_BAR_WIDTH = 3
const SNV_DENSITY_HEIGHT = 40
const TR_BLOCK_COLOR = VARIANT_CATEGORY_COLORS.tr

/** Map variant AF to opacity: rare variants are fainter, common are bolder.
 *  Uses log scale: AF 0.1% → 0.25, AF 1% → 0.5, AF 10% → 0.75, AF 50%+ → 1.0 */
const afToOpacity = (v: any): number => {
  const af = v.freq?.all?.af ?? v.freq?.af ?? 0
  if (af <= 0) return 0.2
  // log10 scale: -3 (0.1%) → 0.25, -2 (1%) → 0.5, -1 (10%) → 0.75, 0 (100%) → 1.0
  const logAf = Math.log10(Math.max(af, 0.0001))
  return Math.min(1, Math.max(0.2, 1 + logAf / 4))
}

// --- Band assignment (delegates to shared variantUtils) ---

function assignVariantBand(variant: LRVariant): Band {
  return sharedAssignBand(variant.allele_type, variant.allele_length)
}

// --- Interval packing ---

function packIntervals<T extends { start: number; stop: number }>(
  items: T[]
): { packed: PackedVariant<T>[]; maxRows: number } {
  const sorted = [...items].sort((a, b) => a.start - b.start)
  const rowEnds: number[] = []
  const packed: PackedVariant<T>[] = sorted.map((item) => {
    for (let r = 0; r < rowEnds.length; r++) {
      if (item.start > rowEnds[r] + 2) {
        rowEnds[r] = item.stop
        return { ...item, row: r }
      }
    }
    rowEnds.push(item.stop)
    return { ...item, row: rowEnds.length - 1 }
  })
  return { packed, maxRows: Math.max(rowEnds.length, 1) }
}

// --- Side panel label ---

const SidePanel = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  font-size: 11px;
  color: #555;
  padding-left: 4px;
`

// --- Variant tooltip (matches haplotype track layout) ---

type HoveredVariant = {
  variant: LRVariant
  x: number
  y: number
}

const VariantTooltip = ({ hovered }: { hovered: HoveredVariant }) => {
  const v = hovered.variant
  const truncate = (s: string | null | undefined, len: number) =>
    s && s.length > len ? s.substring(0, len) + '...' : s || ''

  return (
    <div
      style={{
        position: 'fixed',
        left: hovered.x + 12,
        top: hovered.y + 12,
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: '6px 8px',
        fontSize: 12,
        pointerEvents: 'none',
        zIndex: 10000,
        maxWidth: 300,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div><strong>Position:</strong> {v.pos}</div>
      <div><strong>Ref:</strong> {truncate((v as any).ref, 10)}</div>
      <div><strong>Alt:</strong> {truncate((v as any).alt, 10)}</div>
      {(v as any).freq && (
        <div><strong>AF:</strong> {((v as any).freq?.all?.af ?? (v as any).freq?.af)?.toFixed(4)}</div>
      )}
      {v.variant_id && <div><strong>RSID:</strong> {v.variant_id}</div>}
      {v.allele_type && <div><strong>Type:</strong> {v.allele_type}</div>}
    </div>
  )
}

// --- Band 1: SNV circles (matches haplotype DeckGL track style) ---

const SnvBand = ({ variants, scalePosition, width, onHoverVariant, hoveredPosition, colorMode = 'sv_type', regionStart = 0, regionStop = 1, regionSize = 10000 }: {
  variants: LRVariant[]
  scalePosition: (pos: number) => number
  width: number
  onHoverVariant?: (variant: LRVariant | null, e?: React.MouseEvent) => void
  hoveredPosition?: number | null
  colorMode?: string
  regionStart?: number
  regionStop?: number
  regionSize?: number
}) => {
  // Match haplotype track: 4px radius when < 100kb, 2px when >= 100kb
  const radius = regionSize > 100_000 ? 2 : 4
  const bandHeight = radius * 2 + 4

  // Compute pixel X positions and filter to viewport
  const visible = variants
    .map(v => ({ ...v, x: scalePosition(v.pos) }))
    .filter(v => v.x >= -radius && v.x <= width + radius)

  const hoverHandlers = (v: LRVariant) => onHoverVariant ? {
    onMouseEnter: (e: React.MouseEvent) => onHoverVariant(v, e),
    onMouseMove: (e: React.MouseEvent) => onHoverVariant(v, e),
    onMouseLeave: () => onHoverVariant(null),
  } : {}

  return (
    <svg height={bandHeight} width={width} style={{ overflow: 'hidden' }}>
      {visible.map((v) => {
        const color = colorMode === 'sv_type'
          ? (VARIANT_CATEGORY_COLORS[getVariantCategory(v.allele_type, v.allele_length)])
          : getVariantCssColor(v, colorMode, { start: regionStart, stop: regionStop })
        const opacity = afToOpacity(v)
        const cy = bandHeight / 2

        return (
          <Link key={v.variant_id} to={`/variant/${v.variant_id}`}>
            <circle
              cx={v.x}
              cy={cy}
              r={radius}
              fill={color}
              fillOpacity={opacity}
              stroke="#000"
              strokeOpacity={0.5}
              strokeWidth={0.5}
              {...hoverHandlers(v)}
            />
          </Link>
        )
      })}
      {hoveredPosition != null && (() => {
        const hx = scalePosition(hoveredPosition)
        return hx >= 0 && hx <= width ? (
          <line x1={hx} y1={0} x2={hx} y2={bandHeight} stroke="#333" strokeWidth={1} opacity={0.5} pointerEvents="none" />
        ) : null
      })()}
    </svg>
  )
}

// --- SNV density histogram (shown when zoomed out past LOD threshold) ---

const SnvDensityBand = ({ variants, scalePosition, width }: {
  variants: LRVariant[]
  scalePosition: (pos: number) => number
  width: number
}) => {
  const numBins = Math.max(Math.floor(width / 4), 50)
  const binWidth = width / numBins
  const bins = new Uint32Array(numBins)

  for (const v of variants) {
    const px = scalePosition(v.pos)
    const idx = Math.min(Math.max(Math.floor(px / binWidth), 0), numBins - 1)
    bins[idx]++
  }

  let maxCount = 0
  for (let i = 0; i < numBins; i++) {
    if (bins[i] > maxCount) maxCount = bins[i]
  }

  if (maxCount === 0) return <svg height={SNV_DENSITY_HEIGHT} width={width} />

  const color = VARIANT_CATEGORY_COLORS.snv

  return (
    <svg height={SNV_DENSITY_HEIGHT} width={width} style={{ overflow: 'hidden' }}>
      {Array.from(bins).map((count, i) => {
        if (count === 0) return null
        const barHeight = (count / maxCount) * SNV_DENSITY_HEIGHT
        return (
          <rect
            key={i}
            x={i * binWidth}
            y={SNV_DENSITY_HEIGHT - barHeight}
            width={Math.max(binWidth - 0.5, 1)}
            height={barHeight}
            fill={color}
            opacity={0.7}
          />
        )
      })}
    </svg>
  )
}

// --- Band 2: SV packed ribbons ---

type SvItem = LRVariant & { start: number; stop: number }

const SvBand = ({ variants, scalePosition, width, onHoverVariant, hoveredPosition, colorMode = 'sv_type', regionStart = 0, regionStop = 1 }: {
  variants: SvItem[]
  scalePosition: (pos: number) => number
  width: number
  onHoverVariant?: (variant: LRVariant | null, e?: React.MouseEvent) => void
  hoveredPosition?: number | null
  colorMode?: string
  regionStart?: number
  regionStop?: number
}) => {
  const { mapper } = useContext(AccordionContext)
  const pxPerUnit = mapper ? width / mapper.totalVisualLength : 0

  // Filter to variants visible in the current viewport
  const visible = variants.filter(v => scalePosition(v.stop) >= 0 && scalePosition(v.start) <= width)
  const { packed, maxRows } = packIntervals(visible)
  const bandHeight = maxRows * ROW_HEIGHT
  const barHeight = ROW_HEIGHT - 4

  const hoverHandlers = (v: LRVariant) => onHoverVariant ? {
    onMouseEnter: (e: React.MouseEvent) => onHoverVariant(v, e),
    onMouseMove: (e: React.MouseEvent) => onHoverVariant(v, e),
    onMouseLeave: () => onHoverVariant(null),
  } : {}

  return (
    <svg height={bandHeight} width={width} style={{ overflow: 'hidden' }}>
      {packed.map((v) => {
        const color = colorMode === 'sv_type'
          ? (ALLELE_TYPE_COLORS[v.allele_type.toLowerCase()] || VARIANT_CATEGORY_COLORS[getVariantCategory(v.allele_type, v.allele_length)])
          : getVariantCssColor(v, colorMode, { start: regionStart, stop: regionStop })
        const cat = getVariantCategory(v.allele_type, v.allele_length)
        const opacity = afToOpacity(v)
        const rowY = v.row * ROW_HEIGHT + 2

        if (cat === 'insertion') {
          const startX = scalePosition(v.pos)
          let barWidth = MIN_SV_BAR_WIDTH
          if (mapper && mapper.hasPhantomRegions) {
            const phantomWidth =
              (mapper.getSyntheticCoordinate(v.pos, Math.abs(v.allele_length || 0)) -
                mapper.getSyntheticCoordinate(v.pos, 0)) *
              pxPerUnit
            if (phantomWidth > MIN_SV_BAR_WIDTH) {
              barWidth = phantomWidth
            }
          }

          return (
            <Link key={v.variant_id} to={`/variant/${v.variant_id}`}>
              <rect
                x={startX} y={rowY} width={barWidth} height={barHeight}
                fill={color} opacity={opacity} rx={1}
                {...hoverHandlers(v)}
              />
            </Link>
          )
        }

        let startX = scalePosition(v.start)
        let stopX = scalePosition(v.stop)
        if (stopX - startX < MIN_SV_BAR_WIDTH) {
          const mid = (startX + stopX) / 2
          startX = mid - MIN_SV_BAR_WIDTH / 2
          stopX = mid + MIN_SV_BAR_WIDTH / 2
        }

        return (
          <Link key={v.variant_id} to={`/variant/${v.variant_id}`}>
            <rect
              x={startX} y={rowY} width={stopX - startX} height={barHeight}
              fill={color} opacity={opacity} rx={1}
              {...hoverHandlers(v)}
            />
          </Link>
        )
      })}
      {hoveredPosition != null && (() => {
        const hx = scalePosition(hoveredPosition)
        return hx >= 0 && hx <= width ? (
          <line x1={hx} y1={0} x2={hx} y2={bandHeight} stroke="#333" strokeWidth={1} opacity={0.5} pointerEvents="none" />
        ) : null
      })()}
    </svg>
  )
}

// --- Band 3: TR packed blocks ---

type TrItem = LRVariant & { start: number; stop: number }

const TrBand = ({ variants, scalePosition, width, onHoverVariant, hoveredPosition, colorMode = 'sv_type', regionStart = 0, regionStop = 1 }: {
  variants: TrItem[]
  scalePosition: (pos: number) => number
  width: number
  onHoverVariant?: (variant: LRVariant | null, e?: React.MouseEvent) => void
  hoveredPosition?: number | null
  colorMode?: string
  regionStart?: number
  regionStop?: number
}) => {
  const { mapper } = useContext(AccordionContext)
  const pxPerUnit = mapper ? width / mapper.totalVisualLength : 0

  const visible = variants.filter(v => scalePosition(v.stop) >= 0 && scalePosition(v.start) <= width)
  const { packed, maxRows } = packIntervals(visible)
  const bandHeight = maxRows * ROW_HEIGHT
  const barHeight = ROW_HEIGHT - 4

  return (
    <svg height={bandHeight} width={width} style={{ overflow: 'hidden' }}>
      {packed.map((v) => {
        const rowY = v.row * ROW_HEIGHT + 2

        // TRs use accordion when a phantom locus exists at their position.
        // TRVs always qualify (their allele_length may be small but the phantom
        // gap was created from their reference region span); others need >= 50bp.
        const isTrv = (v.allele_type || '').toLowerCase() === 'trv'
        const isTrAccordion = mapper && mapper.hasPhantomRegions && (isTrv || Math.abs(v.allele_length || 0) >= 50)
        let startX: number
        let blockWidth: number

        if (isTrAccordion) {
          // Use reference region span for TRV phantom width when allele_length is
          // small — matches how AccordionCoordinateMapper sizes the gap
          const phantomLen = isTrv && Math.abs(v.allele_length || 0) < 50
            ? (v.stop - v.start) || Math.abs(v.allele_length || 0)
            : Math.abs(v.allele_length || 0)
          startX = scalePosition(v.pos)
          const phantomWidth =
            (mapper.getSyntheticCoordinate(v.pos, phantomLen) -
              mapper.getSyntheticCoordinate(v.pos, 0)) *
            pxPerUnit
          blockWidth = Math.max(phantomWidth, MIN_SV_BAR_WIDTH)
        } else {
          // Without accordion, render TRs as thin bars at their position
          // (reference region span is only meaningful with phantom expansion)
          startX = scalePosition(v.pos)
          blockWidth = MIN_SV_BAR_WIDTH
        }

        const trHover = onHoverVariant ? {
          onMouseEnter: (e: React.MouseEvent) => onHoverVariant(v, e),
          onMouseMove: (e: React.MouseEvent) => onHoverVariant(v, e),
          onMouseLeave: () => onHoverVariant(null),
        } : {}

        return (
          <Link key={v.variant_id} to={`/variant/${v.variant_id}`}>
            <rect
              x={startX}
              y={rowY}
              width={blockWidth}
              height={barHeight}
              fill={colorMode === 'sv_type' ? TR_BLOCK_COLOR : getVariantCssColor(v, colorMode, { start: regionStart, stop: regionStop })}
              rx={2}
              opacity={afToOpacity(v)}
              {...trHover}
            />
          </Link>
        )
      })}
      {hoveredPosition != null && (() => {
        const hx = scalePosition(hoveredPosition)
        return hx >= 0 && hx <= width ? (
          <line x1={hx} y1={0} x2={hx} y2={bandHeight} stroke="#333" strokeWidth={1} opacity={0.5} pointerEvents="none" />
        ) : null
      })()}
    </svg>
  )
}

// --- Divider ---

const BandDivider = styled.div`
  height: 1px;
  background: #e0e0e0;
  margin: 2px 0;
`

// --- Main component ---

const GENEALOGY_PANEL_WIDTH = 180

type VariantTypeFilters = Record<string, boolean>

type LongReadVariantTrackProps = {
  variants: LRVariant[]
  lod?: LodVisibility
  showGenealogy?: boolean
  isDiploidView?: boolean
  hoveredVariantPosition?: number | null
  onHoverVariantPosition?: (pos: number | null) => void
  typeFilters?: VariantTypeFilters
  colorMode?: string
  regionStart?: number
  regionStop?: number
}

const LongReadVariantTrack = ({ variants, lod, showGenealogy = false, isDiploidView = false, hoveredVariantPosition, onHoverVariantPosition, typeFilters, colorMode = 'sv_type', regionStart = 0, regionStop = 1 }: LongReadVariantTrackProps) => {
  const genealogyActive = showGenealogy && !isDiploidView

  // Compute width adjustment from RegionViewerContext — must match
  // DeckGLLollipopTrack's view layout exactly for vertical alignment.
  // The DeckGL track has a 15px left pad between left panel labels and
  // the center panel, shifting its center view right by ~7.5px. We replicate
  // that offset here and also account for genealogy panel width.
  const DECKGL_LEFT_PAD = 15
  const { scalePosition: ctxScalePosition, centerPanelWidth: ctxCenterWidth, rightPanelWidth: ctxRightPanelWidth } = useContext(RegionViewerContext)
  const genealogyRightWidth = genealogyActive ? GENEALOGY_PANEL_WIDTH : 0
  const extraRightNeeded = Math.max(0, genealogyRightWidth - ctxRightPanelWidth)
  const adjCenterWidth = ctxCenterWidth - extraRightNeeded
  const ctxScaleFactor = ctxCenterWidth > 0 ? adjCenterWidth / ctxCenterWidth : 1
  // DeckGL view offset: center-panel view is (canvasWidth - leftPad) wide,
  // centered on canvasWidth/2, so data x=0 renders at pixel offset +leftPad/2
  const deckglOffset = DECKGL_LEFT_PAD / 2
  const adjScalePosition = ctxScaleFactor === 1
    ? (pos: number) => ctxScalePosition(pos) + deckglOffset
    : (pos: number) => ctxScalePosition(pos) * ctxScaleFactor + deckglOffset

  const [hovered, setHovered] = useState<HoveredVariant | null>(null)

  const onHoverVariant = useCallback((variant: LRVariant | null, e?: React.MouseEvent) => {
    if (variant && e) {
      setHovered({ variant, x: e.clientX, y: e.clientY })
      onHoverVariantPosition?.(variant.pos)
    } else {
      setHovered(null)
      onHoverVariantPosition?.(null)
    }
  }, [onHoverVariantPosition])

  const snvVariants: LRVariant[] = []
  const insVariants: SvItem[] = []
  const delVariants: SvItem[] = []
  const svVariants: SvItem[] = []
  const trVariants: TrItem[] = []

  for (const v of variants) {
    const band = assignVariantBand(v)

    // LOD filtering: skip sub-pixel non-SNV variants when zoomed out
    // (SNVs are always collected — the render tree switches to density histogram)
    if (lod && band !== 'snv') {
      const cat = getVariantCategory(v.allele_type, v.allele_length)
      const isLarge = Math.abs(v.allele_length || 0) >= 50
      if ((cat === 'insertion' || cat === 'deletion') && !isLarge && !lod.showSmallIndels) continue
    }

    if (band === 'snv') {
      snvVariants.push(v)
    } else if (band === 'ins') {
      const start = v.pos
      const stop = v.end != null ? v.end : v.pos + Math.abs(v.allele_length || 1)
      insVariants.push({ ...v, start, stop })
    } else if (band === 'del') {
      const start = v.pos
      const stop = v.end != null ? v.end : v.pos + Math.abs(v.allele_length || 1)
      delVariants.push({ ...v, start, stop })
    } else if (band === 'sv') {
      const start = v.pos
      const stop = v.end != null ? v.end : v.pos + Math.abs(v.allele_length || 1)
      svVariants.push({ ...v, start, stop })
    } else {
      // TR: use main_reference_region for span
      const ref = v.main_reference_region
      const start = ref ? ref.start : v.pos
      const stop = ref ? ref.stop : (v.end != null ? v.end : v.pos + Math.abs(v.allele_length || 1))
      trVariants.push({ ...v, start, stop })
    }
  }

  // typeFilters: when set, hide bands whose category is unchecked
  const showSnvBand = !typeFilters || typeFilters.snv !== false
  const showInsBand = !typeFilters || typeFilters.insertion !== false
  const showDelBand = !typeFilters || typeFilters.deletion !== false
  const showSvBand = !typeFilters || typeFilters.sv !== false
  const showTrBand = !typeFilters || typeFilters.tr !== false

  return (
    <div style={{ overflow: 'hidden', clipPath: 'inset(0)', position: 'relative' }}>
      {showSnvBand && snvVariants.length > 0 && (
        <Track renderLeftPanel={() => <SidePanel>SNVs ({snvVariants.length})</SidePanel>}>
          {() => lod && !lod.showSnvs ? (
            <SnvDensityBand
              variants={snvVariants}
              scalePosition={adjScalePosition}
              width={adjCenterWidth}
            />
          ) : (
            <SnvBand
              variants={snvVariants}
              scalePosition={adjScalePosition}
              width={adjCenterWidth}
              onHoverVariant={onHoverVariant}
              hoveredPosition={hoveredVariantPosition}
              colorMode={colorMode}
              regionStart={regionStart}
              regionStop={regionStop}
              regionSize={regionStop - regionStart}
            />
          )}
        </Track>
      )}

      {showInsBand && insVariants.length > 0 && (
        <>
          <BandDivider />
          <Track renderLeftPanel={() => <SidePanel>INS</SidePanel>}>
            {() => <SvBand variants={insVariants} scalePosition={adjScalePosition} width={adjCenterWidth} onHoverVariant={onHoverVariant} hoveredPosition={hoveredVariantPosition} colorMode={colorMode} regionStart={regionStart} regionStop={regionStop} />}
          </Track>
        </>
      )}

      {showDelBand && delVariants.length > 0 && (
        <>
          <BandDivider />
          <Track renderLeftPanel={() => <SidePanel>DEL</SidePanel>}>
            {() => <SvBand variants={delVariants} scalePosition={adjScalePosition} width={adjCenterWidth} onHoverVariant={onHoverVariant} hoveredPosition={hoveredVariantPosition} colorMode={colorMode} regionStart={regionStart} regionStop={regionStop} />}
          </Track>
        </>
      )}

      {showSvBand && svVariants.length > 0 && (
        <>
          <BandDivider />
          <Track renderLeftPanel={() => <SidePanel>DUP/SV</SidePanel>}>
            {() => <SvBand variants={svVariants} scalePosition={adjScalePosition} width={adjCenterWidth} onHoverVariant={onHoverVariant} hoveredPosition={hoveredVariantPosition} colorMode={colorMode} regionStart={regionStart} regionStop={regionStop} />}
          </Track>
        </>
      )}

      {showTrBand && trVariants.length > 0 && (
        <>
          <BandDivider />
          <Track renderLeftPanel={() => <SidePanel>TRs</SidePanel>}>
            {() => <TrBand variants={trVariants} scalePosition={adjScalePosition} width={adjCenterWidth} onHoverVariant={onHoverVariant} hoveredPosition={hoveredVariantPosition} colorMode={colorMode} regionStart={regionStart} regionStop={regionStop} />}
          </Track>
        </>
      )}

      {hovered && ReactDOM.createPortal(<VariantTooltip hovered={hovered} />, document.body)}
    </div>
  )
}

export default LongReadVariantTrack

