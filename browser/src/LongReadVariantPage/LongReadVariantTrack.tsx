import { transparentize } from 'polished'
import React from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'

import Link from '../Link'
import VariantTrack from '../VariantList/VariantTrack'
import { getCategoryFromConsequence } from '../vepConsequences'
import { svTypeColors } from '../StructuralVariantList/structuralVariantTypes'

// --- Types ---

type LRVariant = {
  variant_id: string
  pos: number
  end: number | null
  length: number | null
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

type Band = 'snv' | 'sv' | 'tr'

type PackedVariant<T> = T & { row: number }

// --- Constants ---

const SNV_BAND_HEIGHT = 40
const ROW_HEIGHT = 14
const LOLLIPOP_RADIUS = 3
const LOLLIPOP_TOP = 10
const MIN_SV_BAR_WIDTH = 3
const TR_BLOCK_COLOR = '#7459B2'
const MOTIF_LABEL_MIN_WIDTH = 40

// --- Consequence colors for Band 1 ---

const consequenceCategoryColors: Record<string, string> = {
  lof: transparentize(0.3, '#FF583F'),
  missense: transparentize(0.3, '#F0C94D'),
  synonymous: transparentize(0.3, 'green'),
  other: transparentize(0.6, '#9e9e9e'),
}

// --- SV type mapping for Band 2 ---

const svDisplayConfig: Record<string, { shape: string; color: string }> = {
  alu_ins: { shape: 'INS', color: '#9d84e1' },
  line_ins: { shape: 'INS', color: '#6c5b9c' },
  sva_ins: { shape: 'INS', color: '#d474e0' },
  numt: { shape: 'INS', color: '#fa931e' },
  alu_del: { shape: 'DEL', color: svTypeColors.DEL },
  line_del: { shape: 'DEL', color: svTypeColors.DEL },
  sva_del: { shape: 'DEL', color: svTypeColors.DEL },
  del: { shape: 'DEL', color: svTypeColors.DEL },
  ins: { shape: 'INS', color: svTypeColors.INS },
  dup: { shape: 'DUP', color: svTypeColors.DUP },
  dup_interspersed: { shape: 'DUP', color: '#1a5a8a' },
  complex_dup: { shape: 'DUP', color: '#3a9ad9' },
  inv_dup: { shape: 'DUP', color: '#2376B2' },
}

function getSvDisplay(alleleType: string): { shape: string; color: string } {
  return svDisplayConfig[alleleType] || { shape: 'OTH', color: svTypeColors.OTH }
}

// --- Band assignment ---

function assignBand(variant: LRVariant): Band {
  const t = variant.allele_type
  if (t === 'trv') return 'tr'
  if (t === 'snv') return 'snv'
  if (t === 'ins' || t === 'del') {
    const len = variant.length
    if (len === null || Math.abs(len) < 50) return 'snv'
    return 'sv'
  }
  // All other types are SVs
  return 'sv'
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

// --- Band 2: SV packed ribbons ---

type SvItem = LRVariant & { start: number; stop: number }

const SvBand = ({ variants, scalePosition, width }: {
  variants: SvItem[]
  scalePosition: (pos: number) => number
  width: number
}) => {
  const { packed, maxRows } = packIntervals(variants)
  const bandHeight = maxRows * ROW_HEIGHT
  const barHeight = ROW_HEIGHT - 4

  return (
    <svg height={bandHeight} width={width} style={{ overflow: 'hidden' }}>
      {packed.map((v) => {
        const { shape, color } = getSvDisplay(v.allele_type)
        const rowY = v.row * ROW_HEIGHT + 2

        if (shape === 'INS') {
          const x = scalePosition(v.pos)
          return (
            <Link key={v.variant_id} to={`/variant/${v.variant_id}`}>
              <path
                d={`M ${x} ${rowY} l -4 0 l 4 ${barHeight} l 4 -${barHeight} z`}
                fill={color}
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
              x={startX}
              y={rowY}
              width={stopX - startX}
              height={barHeight}
              fill={color}
              rx={1}
            />
          </Link>
        )
      })}
    </svg>
  )
}

// --- Band 3: TR packed blocks ---

type TrItem = LRVariant & { start: number; stop: number }

const TrBand = ({ variants, scalePosition, width }: {
  variants: TrItem[]
  scalePosition: (pos: number) => number
  width: number
}) => {
  const { packed, maxRows } = packIntervals(variants)
  const bandHeight = maxRows * ROW_HEIGHT
  const barHeight = ROW_HEIGHT - 4

  return (
    <svg height={bandHeight} width={width} style={{ overflow: 'hidden' }}>
      {packed.map((v) => {
        const startX = scalePosition(v.start)
        const stopX = scalePosition(v.stop)
        const blockWidth = Math.max(stopX - startX, MIN_SV_BAR_WIDTH)
        const rowY = v.row * ROW_HEIGHT + 2
        const showMotif = blockWidth > MOTIF_LABEL_MIN_WIDTH && v.motifs && v.motifs.length > 0

        return (
          <Link key={v.variant_id} to={`/variant/${v.variant_id}`}>
            <g>
              <rect
                x={startX}
                y={rowY}
                width={blockWidth}
                height={barHeight}
                fill={TR_BLOCK_COLOR}
                rx={2}
                opacity={0.8}
              />
              {showMotif && (
                <text
                  x={startX + blockWidth / 2}
                  y={rowY + barHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={9}
                  style={{ pointerEvents: 'none' }}
                >
                  {v.motifs!.join(',')}
                </text>
              )}
            </g>
          </Link>
        )
      })}
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

type LongReadVariantTrackProps = {
  variants: LRVariant[]
}

const LongReadVariantTrack = ({ variants }: LongReadVariantTrackProps) => {
  const snvVariants: LRVariant[] = []
  const svVariants: SvItem[] = []
  const trVariants: TrItem[] = []

  for (const v of variants) {
    const band = assignBand(v)
    if (band === 'snv') {
      snvVariants.push(v)
    } else if (band === 'sv') {
      const start = v.pos
      const stop = v.end != null ? v.end : v.pos + Math.abs(v.length || 1)
      svVariants.push({ ...v, start, stop })
    } else {
      // TR: use main_reference_region for span
      const ref = v.main_reference_region
      const start = ref ? ref.start : v.pos
      const stop = ref ? ref.stop : (v.end != null ? v.end : v.pos + Math.abs(v.length || 1))
      trVariants.push({ ...v, start, stop })
    }
  }

  // Map SNVs for the standard VariantTrack (needs `consequence` prop)
  const trackSnvVariants = snvVariants.map((v) => ({
    ...v,
    consequence: v.major_consequence,
  }))

  return (
    <div style={{ overflow: 'hidden' }}>
      <VariantTrack
        // @ts-expect-error TS(2769) - VariantTrack prop types are loose
        title={`Long Read SNVs (${trackSnvVariants.length})`}
        variants={trackSnvVariants}
      />

      {svVariants.length > 0 && (
        <>
          <BandDivider />
          <Track renderLeftPanel={() => <SidePanel>SVs</SidePanel>}>
            {({ scalePosition, width }: { scalePosition: (pos: number) => number; width: number }) => (
              <SvBand variants={svVariants} scalePosition={scalePosition} width={width} />
            )}
          </Track>
        </>
      )}

      {trVariants.length > 0 && (
        <>
          <BandDivider />
          <Track renderLeftPanel={() => <SidePanel>TRs</SidePanel>}>
            {({ scalePosition, width }: { scalePosition: (pos: number) => number; width: number }) => (
              <TrBand variants={trVariants} scalePosition={scalePosition} width={width} />
            )}
          </Track>
        </>
      )}
    </div>
  )
}

export default LongReadVariantTrack
